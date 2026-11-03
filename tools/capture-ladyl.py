# capture-ladyl.py - turn Lady L's untouched live pages (audit/raw/ladyl/*.html, WordPress + Breakdance, no <main>)
# into content JSON for the redesign. Every visible word of each page's CONTENT AREA is carried (the body's top-level
# sections minus the global header template 42 and the global footer template 52, which hold the nav, the 21+
# disclaimer and the footer: FOUNDATION renders those from site.json/ia.json). Markup, classes and plugin machinery
# are not carried. Head metadata (title, description, canonical, og:image, JSON-LD) is carried verbatim.
#   python -I tools/capture-ladyl.py [<project-dir>] [--fetch]
#   --fetch  download every content image (largest srcset candidate, wp-content/uploads only) politely into the
#            scratch cache tmp/capture/dl/ (1 connection, 0.4 s apart, stop on 401/403/429), then copy them to
#            assets/photos/ll/ (lowercase names, de-duplicated by sha1, magic-byte census) and rewrite img.src.
# Never edits audit/raw/. Writes src/content/{pages,posts,events,places,delivery}/*.json, facts/asset-map.json,
# assets/brand/ladyl-*, assets/brand/favicon*, tmp/capture/stats.json.
import sys, os, re, json, html, hashlib, time, shutil, urllib.request, urllib.parse
from html.parser import HTMLParser
sys.stdout.reconfigure(encoding='utf-8')

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = os.path.abspath(ARGS[0]) if ARGS else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FETCH = '--fetch' in sys.argv
RAW = os.path.join(ROOT, 'audit', 'raw', 'ladyl')
CONTENT = os.path.join(ROOT, 'src', 'content')
PHOTOS = os.path.join(ROOT, 'assets', 'photos', 'll')
BRAND = os.path.join(ROOT, 'assets', 'brand')
SCRATCH = os.path.join(ROOT, 'tmp', 'capture')
DL = os.path.join(SCRATCH, 'dl')
ORIGIN = 'https://ladyljerseycity.com'
UA = 'site-reforge/1.0 (redesign pitch research)'
CHROME_TEMPLATES = {'42': 'global header (template post 42: top bar, logo, Shop/Events/Delivery/Pickup nav, Order Now, mobile drawer)',
                    '52': 'global footer (template post 52: 21+ disclaimer, Order/Quick Links/Shop columns, Get in touch, loyalty sign-up, copyright, legal row)'}

VOID = {'img', 'br', 'hr', 'source', 'input', 'meta', 'link', 'wbr', 'area', 'col', 'embed', 'track', 'param'}
SKIP_TAGS = {'script', 'style', 'noscript', 'svg', 'template', 'link', 'meta', 'input', 'select', 'textarea', 'option', 'source'}
INLINE_KEEP = {'a', 'strong', 'em', 'b', 'i', 'br'}
INLINE_TAGS = {'a', 'strong', 'em', 'b', 'i', 'br', 'span', 'small', 'sup', 'sub', 'u', 's', 'mark', 'code', 'abbr', 'time', 'cite', 'q', 'kbd', 'label', 'font', 'del', 'ins'}
BLOCK_TAGS = {'p', 'div', 'section', 'article', 'ul', 'ol', 'dl', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'figure', 'blockquote',
              'details', 'table', 'iframe', 'video', 'picture', 'header', 'footer', 'nav', 'aside', 'form', 'pre', 'fieldset', 'button', 'hr', 'li'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent')

    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs), [], parent

    def cls(self):
        return (self.attrs.get('class') or '').split()


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('root', [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs, self.stack[-1]))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse(h):
    p = P()
    p.feed(h)
    return p.root


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def esc(s):
    return html.escape(s, quote=False)


def text_of(n):
    if isinstance(n, str):
        return n
    if n.tag in SKIP_TAGS:
        return ''
    if n.tag == 'br':
        return ' '
    if n.tag == 'span' and '__cf_email__' in n.cls():
        return cf_decode(n.attrs.get('data-cfemail', ''))
    return ''.join(text_of(c) for c in n.children)


def find_all(n, pred, acc=None):
    acc = [] if acc is None else acc
    if isinstance(n, str):
        return acc
    if pred(n):
        acc.append(n)
    for c in n.children:
        find_all(c, pred, acc)
    return acc


def find1(n, pred):
    r = find_all(n, pred)
    return r[0] if r else None


def has_cls(c):
    return lambda n: c in n.cls()


def cf_decode(hexs):
    try:
        b = bytes.fromhex(hexs)
        k = b[0]
        return ''.join(chr(x ^ k) for x in b[1:])
    except Exception:
        return ''


def fix_href(h):
    h = (h or '').strip()
    m = re.match(r'^(?:https?://ladyljerseycity\.com)?/cdn-cgi/l/email-protection#([0-9a-fA-F]+)$', h)
    if m:
        return 'mailto:' + cf_decode(m.group(1))
    if h.startswith('/') and not h.startswith('//'):
        return ORIGIN + h
    return h


KIND_RE = re.compile(r'^bde-([a-z0-9-]+?)-(\d+)-(\d+)')


def kind_of(n):
    for c in n.cls():
        m = KIND_RE.match(c)
        if m:
            return m.group(1), m.group(2)
    return None, None


# ---------------------------------------------------------------- inline HTML
def inline_html(n, spaced_spans=False):
    out = []
    for c in n.children:
        if isinstance(c, str):
            out.append(esc(c))
            continue
        if c.tag in SKIP_TAGS:
            continue
        if c.attrs.get('aria-hidden') == 'true' and c.tag != 'a':
            continue
        if c.tag == 'br':
            out.append('<br>')
            continue
        if c.tag == 'span' and '__cf_email__' in c.cls():
            out.append(esc(cf_decode(c.attrs.get('data-cfemail', ''))))
            continue
        if c.tag == 'img':
            if is_emoji(c):
                out.append(esc(c.attrs.get('alt', '')))
            continue
        if c.tag == 'a' and c.attrs.get('data-cfemail'):
            addr = cf_decode(c.attrs['data-cfemail'])
            out.append('<a href="mailto:%s">%s</a>' % (html.escape(addr), esc(addr)))
            continue
        inner = inline_html(c, spaced_spans)
        if c.tag == 'a':
            href = fix_href(c.attrs.get('href'))
            attrs = ' href="%s"' % html.escape(href) if href else ''
            if c.attrs.get('target'):
                attrs += ' target="%s"' % html.escape(c.attrs['target'])
            out.append('<a%s>%s</a>' % (attrs, inner))
        elif c.tag in ('strong', 'b'):
            out.append('<strong>%s</strong>' % inner if inner.strip() else inner)
        elif c.tag in ('em', 'i'):
            out.append('<em>%s</em>' % inner if inner.strip() else inner)
        elif spaced_spans and c.tag == 'span':
            out.append(' ' + inner + ' ')
        elif c.tag in BLOCK_TAGS:
            out.append(' ' + inner + ' ')
        else:
            out.append(inner)
    return ''.join(out)


def tidy_inline(h):
    h = re.sub(r'\s+', ' ', h).strip()
    h = re.sub(r'\s*<br>\s*', '<br>', h)
    h = re.sub(r'^(<br>)+|(<br>)+$', '', h)
    h = re.sub(r'<(strong|em)>\s*</\1>', ' ', h)
    return re.sub(r'\s+', ' ', h).strip()


def plain(h):
    return clean(html.unescape(re.sub(r'<br>', ' ', re.sub(r'<(?!br)[^>]+>', '', h))))


# ---------------------------------------------------------------- block HTML (FAQ answers, post bodies)
BODY_TAGS = {'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'blockquote', 'img', 'figure', 'figcaption',
             'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br'}
RENAME = {'b': 'strong', 'i': 'em', 'h1': 'h2', 'h5': 'h4', 'h6': 'h4'}


def body_html(n, ctx, depth=0):
    out = []
    for c in n.children:
        if isinstance(c, str):
            out.append(esc(c))
            continue
        if c.tag in SKIP_TAGS or c.tag in ('iframe', 'button') and False:
            continue
        if c.attrs.get('aria-hidden') == 'true':
            continue
        if c.tag == 'span' and '__cf_email__' in c.cls():
            out.append(esc(cf_decode(c.attrs.get('data-cfemail', ''))))
            continue
        t = RENAME.get(c.tag, c.tag)
        if t == 'a' and c.attrs.get('data-cfemail'):
            addr = cf_decode(c.attrs['data-cfemail'])
            out.append('<a href="mailto:%s">%s</a>' % (html.escape(addr), esc(addr)))
            continue
        if t == 'img' and is_emoji(c):
            out.append(esc(c.attrs.get('alt', '')))
            continue
        if t == 'img':
            ib = img_block(c, ctx)
            if ib:
                out.append('<img src="%s" alt="%s"%s>' % (html.escape(ib['src']), html.escape(ib.get('alt', '')),
                           ''.join(' %s="%s"' % (k2, ib[k]) for k, k2 in (('w', 'width'), ('h', 'height')) if ib.get(k))))
            continue
        if t == 'iframe':
            src = c.attrs.get('src') or c.attrs.get('data-src') or ''
            if src:
                out.append('<p><a href="%s">%s</a></p>' % (html.escape(src), esc(c.attrs.get('title') or src)))
                ctx['embeds'].append(src)
            continue
        inner = body_html(c, ctx, depth + 1)
        if t not in BODY_TAGS:
            if t in ('div', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'pre', 'dl', 'dt', 'dd', 'details', 'summary'):
                out.append('\n' + inner + '\n')
            else:
                out.append(inner)
            continue
        if t == 'br':
            out.append('<br>')
            continue
        attrs = ''
        if t == 'a':
            href = fix_href(c.attrs.get('href'))
            attrs = ' href="%s"' % html.escape(href) if href else ''
            if c.attrs.get('target'):
                attrs += ' target="%s"' % html.escape(c.attrs['target'])
        if t in ('th', 'td'):
            for k in ('colspan', 'rowspan'):
                if c.attrs.get(k):
                    attrs += ' %s="%s"' % (k, html.escape(c.attrs[k]))
        if t in ('p', 'li', 'strong', 'em', 'a', 'h2', 'h3', 'h4', 'th', 'td', 'figcaption', 'blockquote') and not clean(re.sub(r'<[^>]+>', '', inner)) and '<img' not in inner:
            continue
        out.append('<%s%s>%s</%s>' % (t, attrs, inner, t))
    return ''.join(out)


def tidy_body(h):
    h = re.sub(r'[ \t\r\f\v]+', ' ', h)
    h = re.sub(r'\s*\n\s*', '\n', h)
    h = re.sub(r'\s*(</?(?:p|ul|ol|li|h2|h3|h4|blockquote|figure|figcaption|table|thead|tbody|tr|th|td)\b[^>]*>)\s*', r'\1', h)
    h = re.sub(r'(</(?:p|ul|ol|h2|h3|h4|blockquote|figure|table)>)', r'\1\n', h)
    h = re.sub(r'\n+', '\n', h)
    return h.strip()


# ---------------------------------------------------------------- images
IMG_REFS = {}   # orig url -> {'pages': set(), 'alt': ...}


def largest_src(n):
    src = n.attrs.get('src') or n.attrs.get('data-src') or ''
    best, bw = src, -1
    for part in (n.attrs.get('srcset') or n.attrs.get('data-srcset') or '').split(','):
        bits = part.strip().split()
        if len(bits) >= 2 and bits[1].endswith('w'):
            try:
                w = int(bits[1][:-1])
            except ValueError:
                continue
            if w > bw:
                best, bw = bits[0], w
    if bw < 0:
        best = src
    return fix_href(best), fix_href(src)


def is_emoji(n):
    return 'fonts.gstatic.com/s/e/notoemoji' in (n.attrs.get('src') or '')


def img_block(n, ctx):
    big, src = largest_src(n)
    if not big or big.startswith('data:') or is_emoji(n):
        return None
    if big.startswith('https://ladyltest.deeproots.io/'):
        ctx['dropped'].append('img src on the staging host %s rewritten to the same path on the live host' % big)
        big = ORIGIN + big[len('https://ladyltest.deeproots.io'):]
    if big.lower().endswith('.heic'):
        ctx['dropped'].append('HEIC image %s (application/octet-stream; not a web image format, browsers other than Safari do not render it): dropped' % big)
        return None
    b = {'type': 'img', 'src': big, 'alt': clean(n.attrs.get('alt', ''))}
    if n.attrs.get('width') and n.attrs['width'].isdigit():
        b['w'] = int(n.attrs['width'])
    if n.attrs.get('height') and n.attrs['height'].isdigit():
        b['h'] = int(n.attrs['height'])
    if '/wp-content/uploads/' in big:
        IMG_REFS.setdefault(big, {'pages': set(), 'alts': set()})
        IMG_REFS[big]['pages'].add(ctx['path'])
        if b['alt']:
            IMG_REFS[big]['alts'].add(b['alt'])
    else:
        ctx['remote_imgs'].append(big)
    return b


# ---------------------------------------------------------------- Breakdance-aware walker
def walk(n, ctx):
    out = []
    for c in n.children:
        if isinstance(c, str):
            t = clean(c)
            if t:
                out.append({'type': 'p', 'html': esc(t)})
            continue
        out.extend(node_blocks(c, ctx))
    return out


def heading_block(c, ctx):
    lvl = int(c.tag[1]) if re.fullmatch(r'h[1-6]', c.tag) else 2
    spans = [x for x in c.children if isinstance(x, Node) and x.tag == 'span']
    txt = clean(html.unescape(re.sub(r'<[^>]+>', ' ', inline_html(c, spaced_spans=True))))
    t = 'h%d' % min(max(lvl, 1), 4)
    b = {'type': t, 'text': txt}
    if lvl > 4:
        b['level'] = lvl
    if spans:
        acc = clean(text_of(spans[-1]))
        if acc and acc != txt:
            b['accent'] = acc
    a = find1(c, lambda x: x.tag == 'a')
    if a is not None and a.attrs.get('href'):
        b['href'] = fix_href(a.attrs['href'])
    return [b] if txt else []


def p_block(c, ctx, spaced=False, role=None):
    h = tidy_inline(inline_html(c, spaced_spans=spaced))
    if not plain(h):
        return []
    b = {'type': 'p', 'html': h}
    if role:
        b['role'] = role
    return [b]


def icon_guess(href):
    h = (href or '').lower()
    if h.startswith('tel:'):
        return 'phone'
    if h.startswith('mailto:'):
        return 'mail'
    if 'maps' in h or 'goo.gl' in h:
        return 'pin'
    if 'instagram' in h:
        return 'instagram'
    return 'arrow'


def container_link(c, ctx):
    href = fix_href(c.attrs.get('href'))
    inner = walk(c, ctx)
    if not inner:
        return []
    has_icon = find1(c, lambda x: 'bde-icon' in x.cls() or x.tag == 'svg') is not None
    imgs = [b for b in inner if b['type'] == 'img']
    heads = [b for b in inner if b['type'] in ('h1', 'h2', 'h3', 'h4')]
    if not imgs and not heads:
        texts = ' '.join(plain(b.get('html', '')) or b.get('text', '') for b in inner)
        return [{'type': 'icon-box', 'icon': icon_guess(href) if has_icon else '', 'title': '',
                 'html': '<a href="%s">%s</a>' % (html.escape(href), esc(clean(texts)))}]
    b = {'type': 'card', 'href': href}
    if imgs:
        b['img'] = {k: v for k, v in imgs[0].items() if k != 'type'}
    rest = []
    for x in inner:
        if imgs and x is imgs[0]:
            continue
        if heads and x is heads[0]:
            b['title'] = x['text']
            b['level'] = int(x['type'][1])
            continue
        if x['type'] == 'img':
            b.setdefault('more_imgs', []).append({k: v for k, v in x.items() if k != 'type'})
            continue
        rest.append(block_plain_html(x))
    rest = [r for r in rest if r]
    if rest:
        b['html'] = '<br>'.join(rest)
    return [b]


def block_plain_html(x):
    if x['type'] == 'p':
        return re.sub(r'</?a\b[^>]*>', '', x['html'])
    if x['type'] in ('h1', 'h2', 'h3', 'h4'):
        return esc(x['text'])
    if x['type'] in ('ul', 'ol'):
        return '<br>'.join(re.sub(r'</?a\b[^>]*>', '', i) for i in x['items'])
    if x['type'] == 'button':
        return esc(x['text'])
    if x.get('html'):
        return re.sub(r'</?a\b[^>]*>', '', x['html'])
    return esc(x.get('text', ''))


def list_block(c, ctx):
    items = []
    for li in c.children:
        if isinstance(li, Node) and li.tag == 'li':
            h = tidy_inline(inline_html(li))
            if plain(h):
                items.append(h)
    return [{'type': 'ol' if c.tag == 'ol' else 'ul', 'items': items}] if items else []


def table_block(c, ctx):
    rows, head = [], False
    for tr in find_all(c, lambda x: x.tag == 'tr'):
        cells = [x for x in tr.children if isinstance(x, Node) and x.tag in ('td', 'th')]
        if not rows and cells and all(x.tag == 'th' for x in cells):
            head = True
        rows.append([plain(tidy_inline(inline_html(x))) for x in cells])
    b = {'type': 'table', 'rows': rows}
    if head:
        b['head'] = True
    return [b] if rows else []


def faq_block(c, ctx):
    items = []
    for it in find_all(c, has_cls('bde-faq__item')):
        q = find1(it, has_cls('bde-faq__title'))
        a = find1(it, has_cls('bde-faq__answer-content')) or find1(it, has_cls('bde-faq__answer'))
        qt = clean(text_of(q)) if q is not None else ''
        ah = tidy_body(body_html(a, ctx)) if a is not None else ''
        if not re.search(r'<(p|ul|ol|h2|h3|h4|table|blockquote)\b', ah) and ah:
            ah = '<p>%s</p>' % ah
        items.append({'q': qt, 'a_html': ah})
    return [{'type': 'faq', 'items': items}] if items else []


def details_block(c, ctx):
    s = find1(c, lambda x: x.tag == 'summary')
    body = Node('div', [])
    body.children = [x for x in c.children if x is not s]
    return [{'type': 'faq', 'items': [{'q': clean(text_of(s)) if s is not None else '', 'a_html': tidy_body(body_html(body, ctx))}]}]


def review_blocks(c, ctx):
    out = []
    for it in find_all(c, has_cls('ti-review-item')):
        name = clean(text_of(find1(it, has_cls('ti-name')) or Node('x', [])))
        content = find1(it, has_cls('ti-review-content'))
        txt = clean(text_of(content)) if content is not None else ''
        stars = find_all(it, lambda x: x.tag == 'img' and 'ti-star' in x.cls())
        rating = 0.0
        for s in stars:
            src = s.attrs.get('src', '')
            rating += 1.0 if src.endswith('/f.svg') else (0.5 if src.endswith('/h.svg') else 0.0)
        plat = 'Google'
        for k in it.cls():
            if k.startswith('source-'):
                plat = k[7:]
        date = clean(text_of(find1(it, has_cls('ti-date')) or Node('x', [])))
        b = {'type': 'review', 'name': name, 'text': txt, 'rating': rating if rating % 1 else int(rating), 'platform': plat}
        if date:
            b['date'] = date
        out.append(b)
    ctx['dropped'].append('Trustindex widget chrome strings ("Posted on Google", "Trustindex verifies that the original source of the review is Google.", "Read more", "Hide"), reviewer avatars (googleusercontent) and platform/star icons (cdn.trustindex.io)')
    return out


def instagram_blocks(c, ctx):
    out = []
    for it in find_all(c, has_cls('sbi_item')):
        a = find1(it, has_cls('sbi_photo'))
        img = find1(it, lambda x: x.tag == 'img')
        sr = find1(it, has_cls('sbi-screenreader'))
        kind = next((k[9:] for k in it.cls() if k.startswith('sbi_type_')), '')
        b = {'type': 'embed', 'kind': 'instagram', 'src': (a.attrs.get('href') if a is not None else ''),
             'note': (img.attrs.get('alt', '') if img is not None else '').strip(), 'media': kind}
        if sr is not None:
            b['shown'] = clean(text_of(sr))
        out.append(b)
    rest = [clean(text_of(x)) for x in find_all(c, lambda x: x.tag in ('a', 'span', 'button') and ('sbi_load_btn' in x.cls() or 'sbi_follow_btn' in x.cls()))]
    for r in rest:
        if r:
            ctx['dropped'].append('Instagram feed button "%s" (feed machinery)' % r)
    ctx['dropped'].append('Instagram images: Smash Balloon serves a placeholder.png and loads the photos from Instagram by JS; captions kept as embed.note')
    return out


def form_block(c, ctx):
    fields, types, consent, notes = [], [], '', []
    for f in find_all(c, lambda x: 'gfield' in x.cls()):
        typ = next((k[13:] for k in f.cls() if k.startswith('gfield--type-')), '')
        if typ in ('hidden', 'honeypot'):
            continue
        if 'gform_validation_container' in f.cls():
            continue
        lab = find1(f, lambda x: 'gfield_label' in x.cls())
        lt = ''
        if lab is not None:
            lt = clean(''.join(text_of(x) for x in lab.children if not (isinstance(x, Node) and 'gfield_required' in x.cls())))
        if typ == 'consent':
            cl = find1(f, has_cls('gfield_consent_label'))
            consent = clean(text_of(cl)) if cl is not None else lt
            continue
        if typ == 'html':
            t = clean(text_of(f))
            if t:
                notes.append(tidy_inline(inline_html(f)))
            continue
        if typ in ('checkbox', 'radio', 'select', 'multiselect'):
            opts = [clean(text_of(x)) for x in find_all(f, lambda x: x.tag == 'label' and 'gfield_label' not in x.cls())]
            opts += [clean(text_of(x)) for x in find_all(f, lambda x: x.tag == 'option')]
            fields.append(lt)
            types.append({'input': typ, 'options': [o for o in opts if o]})
        else:
            fields.append(lt)
            types.append({'input': typ})
        desc = find1(f, has_cls('gfield_description'))
        if desc is not None and clean(text_of(desc)):
            notes.append(tidy_inline(inline_html(desc)))
    btn = find1(c, lambda x: x.tag in ('button', 'input') and ('gform_button' in x.cls() or x.attrs.get('type') == 'submit'))
    bt = clean(text_of(btn)) if btn is not None and btn.tag == 'button' else (btn.attrs.get('value', '') if btn is not None else '')
    heading = find1(c, has_cls('gform_title'))
    descr = find1(c, has_cls('gform_description'))
    b = {'type': 'form', 'fields': fields, 'fieldTypes': types, 'button': bt}
    if consent:
        b['consent'] = consent
    if notes:
        b['notes'] = notes
    out = []
    if heading is not None and clean(text_of(heading)):
        out.append({'type': 'h3', 'text': clean(text_of(heading))})
    if descr is not None and clean(text_of(descr)):
        out.append({'type': 'p', 'html': tidy_inline(inline_html(descr))})
    ctx['dropped'].append('Gravity Forms machinery (hidden inputs, validation, honeypot, AJAX iframe); labels kept in a form block')
    out.append(b)
    return out


def loop_blocks(c, ctx):
    items = []
    for art in find_all(c, lambda x: x.tag == 'article'):
        a = find1(art, lambda x: x.tag == 'a')
        it = {'href': fix_href(a.attrs.get('href')) if a is not None else ''}
        img = find1(art, lambda x: x.tag == 'img')
        if img is not None:
            ib = img_block(img, ctx)
            if ib:
                it['img'] = {k: v for k, v in ib.items() if k != 'type'}
        h = find1(art, lambda x: re.fullmatch(r'h[1-6]', x.tag) is not None)
        it['title'] = clean(text_of(h)) if h is not None else ''
        d = find1(art, has_cls('ee-postmeta-date'))
        if d is not None:
            it['dateText'] = clean(text_of(d))
        texts = [clean(text_of(x)) for x in find_all(art, lambda x: 'bde-text' in x.cls())]
        texts = [t for t in texts if t]
        if texts and texts[-1] == 'Read More':
            it['more'] = texts.pop()
        if 'dateText' not in it and texts:
            it['dateText'] = texts.pop(0)
        if texts:
            it['timeText'] = texts.pop(0)
        if texts:
            it['text'] = ' '.join(texts)
        items.append(it)
    ctx['loops'].append(items)
    return [{'type': 'loop', 'of': ctx.get('loop_of', ''), 'items': items}] if items else []


def node_blocks(c, ctx):
    if c.tag in SKIP_TAGS:
        return []
    if c.attrs.get('aria-hidden') == 'true':
        t = clean(text_of(c))
        if t:
            ctx['aria_hidden'].append(t[:80])
        return []
    kind, post = kind_of(c)
    cl = c.cls()
    if 'ti-widget' in cl or (c.tag == 'pre' and 'ti-widget' in cl):
        return review_blocks(c, ctx)
    if c.attrs.get('id') == 'sb_instagram' or 'sbi' in cl:
        return instagram_blocks(c, ctx)
    if 'gform_wrapper' in cl or (c.tag == 'form' and (c.attrs.get('id') or '').startswith('gform_')):
        return form_block(c, ctx)
    if kind in ('header-builder', 'menu', 'menu-dropdown', 'social-icons'):
        ctx['dropped'].append('%s element inside content (chrome)' % kind)
        return []
    if kind == 'breadcrumbs':
        ctx['crumbs'] = clean(text_of(c))
        return []
    if kind == 'table-of-contents':
        ctx['dropped'].append('table-of-contents (built by JS from the body headings; empty server-side)')
        return []
    if kind == 'adjacentposts':
        for a in find_all(c, lambda x: x.tag == 'a'):
            lab = clean(text_of(find1(a, has_cls('ee-adjacentposts-label')) or Node('x', [])))
            tit = clean(text_of(find1(a, has_cls('ee-adjacentposts-title')) or Node('x', [])))
            ctx['adjacent'].append({'label': lab, 'title': tit, 'href': fix_href(a.attrs.get('href'))})
        return []
    if kind == 'code-block':
        return walk(c, ctx) if clean(text_of(c)) else []
    if kind in ('fancy-divider', 'icon'):
        return []
    if kind == 'post-loop':
        return loop_blocks(c, ctx)
    if kind == 'frequently-asked-questions':
        return faq_block(c, ctx)
    if kind == 'image2':
        b = img_block(c, ctx) if c.tag == 'img' else None
        if c.tag != 'img':
            im = find1(c, lambda x: x.tag == 'img')
            b = img_block(im, ctx) if im is not None else None
        if b:
            a = c.parent
            while a is not None and a.tag != 'a' and a.tag != 'root':
                a = a.parent
        return [b] if b else []
    if kind == 'google-map':
        fr = find1(c, lambda x: x.tag == 'iframe')
        return [{'type': 'embed', 'kind': 'map', 'src': (fr.attrs.get('src') or fr.attrs.get('data-src') or '') if fr is not None else '', 'note': ''}]
    if kind == 'star-rating':
        lab = find1(c, has_cls('bde-star-rating__label'))
        t = clean(text_of(lab)) if lab is not None else ''
        return [{'type': 'p', 'html': esc(t), 'role': 'rating'}] if t else []
    if kind == 'heading':
        return heading_block(c, ctx)
    if kind == 'button':
        a = find1(c, lambda x: x.tag == 'a')
        t = clean(text_of(c))
        if not t:
            return []
        return [{'type': 'button', 'text': t, 'href': fix_href(a.attrs.get('href')) if a is not None else ''}]
    if kind == 'text-link':
        h = tidy_inline(inline_html(c))
        if not plain(h):
            return []
        return [{'type': 'p', 'html': '<a href="%s">%s</a>' % (html.escape(fix_href(c.attrs.get('href'))), h), 'role': 'link'}]
    if kind == 'container-link':
        return container_link(c, ctx)
    if kind == 'icon-list':
        items = []
        for li in find_all(c, lambda x: x.tag == 'li'):
            h = tidy_inline(inline_html(li))
            if plain(h):
                items.append(h)
        return [{'type': 'ul', 'items': items}] if items else []
    if kind == 'text':
        if any(isinstance(x, Node) and x.tag in BLOCK_TAGS - {'button'} for x in c.children):
            return walk(c, ctx)
        return p_block(c, ctx, spaced=True)
    if kind == 'post-meta':
        return p_block(c, ctx, role='meta')
    if kind == 'logo-list':
        out, seen = [], set()
        for im in find_all(c, lambda x: x.tag == 'img'):
            b = img_block(im, ctx)
            if b:
                a = im.parent
                while a is not None and a.tag not in ('a', 'root'):
                    a = a.parent
                if a is not None and a.tag == 'a' and a.attrs.get('href'):
                    b['href'] = fix_href(a.attrs['href'])
                b['role'] = 'logo'
                if b['src'] in seen:
                    continue
                seen.add(b['src'])
                out.append(b)
        if len(out) < len(find_all(c, lambda x: x.tag == 'img')):
            ctx['dropped'].append('logo-list marquee repeats (the same %d brand logos printed several times for the scroll loop): kept once' % len(out))
        return out
    if kind == 'shortcode':
        return walk(c, ctx)
    # generic HTML
    t = c.tag
    if re.fullmatch(r'h[1-6]', t):
        return heading_block(c, ctx)
    if t == 'p':
        kids = [x for x in c.children if isinstance(x, Node) and x.tag not in SKIP_TAGS]
        if kids and all(x.tag in ('img', 'br', 'a', 'picture') for x in kids) and not clean(''.join(x for x in c.children if isinstance(x, str))) and find_all(c, lambda x: x.tag == 'img') and not clean(text_of(c)):
            out = []
            for im in find_all(c, lambda x: x.tag == 'img'):
                b = img_block(im, ctx)
                if b:
                    a = im.parent
                    if a is not None and a.tag == 'a' and a.attrs.get('href'):
                        b['href'] = fix_href(a.attrs['href'])
                    out.append(b)
            return out
        if any(isinstance(x, Node) and x.tag in BLOCK_TAGS - {'button', 'img'} for x in c.children):
            return walk(c, ctx)
        out = p_block(c, ctx)
        for im in find_all(c, lambda x: x.tag == 'img'):
            b = img_block(im, ctx)
            if b:
                out.append(b)
        return out
    if t in ('ul', 'ol'):
        return list_block(c, ctx)
    if t == 'blockquote':
        h = tidy_inline(inline_html(c))
        return [{'type': 'quote', 'html': h}] if plain(h) else []
    if t == 'table':
        return table_block(c, ctx)
    if t == 'figure':
        out = []
        cap = find1(c, lambda x: x.tag == 'figcaption')
        for im in find_all(c, lambda x: x.tag == 'img'):
            b = img_block(im, ctx)
            if b:
                out.append(b)
        if cap is not None and clean(text_of(cap)):
            if out:
                out[-1]['caption'] = tidy_inline(inline_html(cap))
            else:
                out.append({'type': 'p', 'html': tidy_inline(inline_html(cap)), 'role': 'caption'})
        rest = Node('div', [])
        rest.children = [x for x in c.children if not (isinstance(x, Node) and x.tag in ('img', 'figcaption', 'picture', 'a'))]
        if clean(text_of(rest)):
            out.extend(walk(rest, ctx))
        return out
    if t == 'img':
        b = img_block(c, ctx)
        return [b] if b else []
    if t == 'picture':
        im = find1(c, lambda x: x.tag == 'img')
        b = img_block(im, ctx) if im is not None else None
        return [b] if b else []
    if t == 'iframe':
        src = c.attrs.get('src') or c.attrs.get('data-src') or ''
        k = 'youtube' if 'youtu' in src else ('vimeo' if 'vimeo' in src else ('map' if 'google.com/maps' in src else 'iframe'))
        return [{'type': 'embed', 'kind': k, 'src': src, 'note': c.attrs.get('title', '')}] if src else []
    if t == 'video':
        srcs = [x.attrs.get('src') for x in c.children if isinstance(x, Node) and x.tag == 'source' and x.attrs.get('src')]
        src = c.attrs.get('src') or (srcs[0] if srcs else '')
        ctx['videos'].append(src)
        return [{'type': 'video', 'src': fix_href(src), 'poster': fix_href(c.attrs.get('poster', ''))}] if src else []
    if t == 'details':
        return details_block(c, ctx)
    if t == 'form':
        return form_block(c, ctx)
    if t in ('br', 'hr'):
        return []
    if t == 'a':
        if any(isinstance(x, Node) and (x.tag in BLOCK_TAGS or kind_of(x)[0]) for x in c.children):
            return container_link(c, ctx)
        h = tidy_inline(inline_html(wrap(c)))
        return [{'type': 'p', 'html': h, 'role': 'link'}] if plain(h) else []
    if t == 'button':
        tt = clean(text_of(c))
        if tt:
            ctx['dropped'].append('a bare <button> "%s" (widget control)' % tt[:40])
        return []
    if t in INLINE_TAGS:
        h = tidy_inline(inline_html(wrap(c)))
        return [{'type': 'p', 'html': h}] if plain(h) else []
    return walk(c, ctx)


def wrap(c):
    n = Node('x', [])
    n.children = [c]
    return n


# ---------------------------------------------------------------- post-processing
def hours_pass(blocks):
    out, i = [], 0
    while i < len(blocks):
        b = blocks[i]
        nxt = blocks[i + 1] if i + 1 < len(blocks) else None
        if b['type'] == 'p' and re.fullmatch(r'(Store|Delivery|Pickup) Hours:?', plain(b['html'])) and nxt and nxt['type'] == 'ul' and \
                all(re.match(r'^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)', plain(x)) for x in nxt['items']):
            rows = []
            for it in nxt['items']:
                t = plain(it)
                m = re.match(r'^(.*?)(?:\s+-\s+|\s+)(\d{1,2}(?::\d\d)?\s*(?:am|pm|a|p|AM|PM)\b.*)$', t)
                rows.append([m.group(1).strip(), m.group(2).strip()] if m else [t, ''])
            out.append({'type': 'hours', 'title': plain(b['html']), 'rows': rows, 'lines': nxt['items']})
            i += 2
            continue
        out.append(b)
        i += 1
    return out


def links_pass(blocks):
    out = []
    for b in blocks:
        if b['type'] == 'p' and b.get('role') == 'link' and out and out[-1].get('role') in ('link', 'links'):
            prev = out[-1]
            if prev['type'] == 'p':
                out[-1] = {'type': 'ul', 'role': 'links', 'items': [prev['html'], b['html']]}
            else:
                prev['items'].append(b['html'])
            continue
        out.append(b)
    return out


def slugify(s):
    s = html.unescape(s).lower()
    s = re.sub(r'[’\']', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:60].strip('-') or 'section'


def finish_section(blocks, idx, src, page):
    blocks = links_pass(hours_pass(blocks))
    sec = {'id': '', 'src': src, 'heading': '', 'blocks': blocks}
    hpos = None
    for i, b in enumerate(blocks):
        if b['type'] == 'h1':
            hpos = i
            break
    if hpos is None:
        for i, b in enumerate(blocks):
            if b['type'] in ('h2', 'h3', 'h4'):
                hpos = i
                break
    if hpos is not None:
        hb = blocks[hpos]
        sec['heading'] = hb['text']
        sec['headingLevel'] = int(hb['type'][1])
        if hb.get('accent'):
            sec['headingAccent'] = hb['accent']
        if hb['type'] == 'h1' and not page.get('h1'):
            page['h1'] = hb['text']
        del blocks[hpos]
        if hpos > 0:
            pb = blocks[hpos - 1]
            if pb['type'] == 'p' and not pb.get('role') and len(plain(pb['html']).split()) <= 8 and '<a ' not in pb['html']:
                pb['role'] = 'kicker'
    # any further h1 on the page (rare) is demoted to h2 so the rebuild keeps one H1
    for b in blocks:
        if b['type'] == 'h1':
            if not page.get('h1'):
                page['h1'] = b['text']
                b['type'] = 'h2'
                b['wasH1'] = True
            else:
                b['type'] = 'h2'
                b['wasH1'] = True
    sec['id'] = slugify(sec['heading']) if sec['heading'] else 's%d' % (idx + 1)
    return sec


def head_meta(h):
    m = {}
    t = re.search(r'<title>([\s\S]*?)</title>', h)
    m['title'] = clean(html.unescape(t.group(1))) if t else ''

    def meta(attr, name):
        x = re.search(r'<meta\s+[^>]*%s="%s"[^>]*>' % (attr, re.escape(name)), h)
        if not x:
            return ''
        c = re.search(r'content="([^"]*)"', x.group(0))
        return html.unescape(c.group(1)) if c else ''
    m['description'] = meta('name', 'description')
    x = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', h)
    m['canonical'] = x.group(1) if x else ''
    m['ogImage'] = meta('property', 'og:image')
    m['ogTitle'] = meta('property', 'og:title')
    m['ogDescription'] = meta('property', 'og:description')
    ld = []
    for s in re.findall(r'<script type="application/ld\+json"[^>]*>([\s\S]*?)</script>', h):
        try:
            ld.append(json.loads(s))
        except Exception:
            pass
    m['jsonld'] = ld
    return m


def body_info(root):
    body = find1(root, lambda x: x.tag == 'body')
    bc = body.attrs.get('class', '')
    pid = re.search(r'\b(?:page-id|postid)-(\d+)', bc)
    return body, bc, pid.group(1) if pid else ''


MONTHS = {m: i + 1 for i, m in enumerate(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'])}


def date_iso(s):
    n = re.search(r'\b(\d{1,2})/(\d{1,2}),?\s*(\d{4})\b', s or '')
    if n:
        return '%s-%02d-%02d' % (n.group(3), int(n.group(1)), int(n.group(2)))
    m = re.search(r'([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})', s or '')
    if not m or m.group(1).lower() not in MONTHS:
        return None
    return '%s-%02d-%02d' % (m.group(3), MONTHS[m.group(1).lower()], int(m.group(2)))


# ---------------------------------------------------------------- main capture
def capture_page(url, file):
    h = open(os.path.join(RAW, file), encoding='utf-8', errors='strict').read()
    root = parse(h)
    body, bclass, pid = body_info(root)
    meta = head_meta(h)
    path = urllib.parse.urlsplit(url).path or '/'
    ctx = {'path': path, 'dropped': [], 'crumbs': '', 'adjacent': [], 'aria_hidden': [], 'remote_imgs': [], 'loops': [],
           'videos': [], 'embeds': [], 'loop_of': ''}
    if path in ('/blog/',):
        ctx['loop_of'] = 'posts'
    elif path in ('/events/',):
        ctx['loop_of'] = 'events'
    page = {'h1': ''}
    sections, top = [], []
    for c in body.children:
        if isinstance(c, str) or c.tag in SKIP_TAGS:
            continue
        kind, post = kind_of(c)
        top.append({'tag': c.tag, 'kind': kind, 'post': post, 'chars': len(clean(text_of(c)))})
        if post in CHROME_TEMPLATES:
            continue
        if not clean(text_of(c)) and not find_all(c, lambda x: x.tag in ('img', 'iframe', 'video')):
            continue
        blocks = walk(c, ctx)
        if not blocks:
            continue
        sec = finish_section(blocks, len(sections), ' '.join(x for x in c.cls() if KIND_RE.match(x)), page)
        sections.append(sec)
    ids = {}
    for s in sections:
        if s['id'] in ids:
            ids[s['id']] += 1
            s['id'] = '%s-%d' % (s['id'], ids[s['id']])
        else:
            ids[s['id']] = 1
    rec = {'url': url, 'path': path, 'postId': pid, 'title': meta['title'], 'description': meta['description'],
           'canonical': meta['canonical'], 'ogImage': meta['ogImage'], 'h1': page['h1']}
    if meta['jsonld']:
        rec['jsonld'] = meta['jsonld']
    rec['sections'] = sections
    return rec, ctx, top, root, h, meta


def main():
    idx = json.load(open(os.path.join(RAW, '_index.json'), encoding='utf-8'))
    stats = {'pages': {}, 'top': {}, 'dropped': {}, 'aria_hidden': {}, 'remote_imgs': {}, 'videos': {}, 'embeds': {}}
    recs = {}
    for url, v in idx.items():
        if v.get('status') != 200:
            continue
        rec, ctx, top, root, h, meta = capture_page(url, v['file'])
        recs[url] = (rec, ctx, root, h, meta)
        stats['top'][rec['path']] = top
        stats['dropped'][rec['path']] = sorted(set(ctx['dropped']))
        stats['aria_hidden'][rec['path']] = ctx['aria_hidden']
        stats['remote_imgs'][rec['path']] = sorted(set(ctx['remote_imgs']))
        if ctx['videos']:
            stats['videos'][rec['path']] = ctx['videos']
        if ctx['embeds']:
            stats['embeds'][rec['path']] = ctx['embeds']

    # brand images (header logo, footer wordmark, site icons)
    home_rec, home_ctx, home_root, home_h, _ = recs[ORIGIN + '/']
    brand = []
    hdr = find1(home_root, lambda x: x.tag == 'header')
    logo = find1(hdr, lambda x: x.tag == 'img' and 'wordmark' in (x.attrs.get('alt') or '').lower())
    if logo is not None:
        brand.append(('ladyl-logo', largest_src(logo)[0], logo.attrs.get('alt', '')))
    foot = find1(home_root, lambda x: 'bde-section-52-140' in x.cls())
    if foot is not None:
        for im in find_all(foot, lambda x: x.tag == 'img'):
            brand.append(('ladyl-logo-footer', largest_src(im)[0], im.attrs.get('alt', '')))
    for rel, href in re.findall(r'<link rel="(icon|apple-touch-icon)" href="([^"]+)"', home_h):
        brand.append(('icon:' + rel, href, ''))
    x = re.search(r'name="msapplication-TileImage" content="([^"]+)"', home_h)
    if x:
        brand.append(('icon:tile', x.group(1), ''))
    og_urls = set(r[0]['ogImage'] for r in recs.values() if r[0].get('ogImage'))

    # featured images of posts the /blog/ hub does not list (it prints only the 8 newest): WP REST, fetched once into
    # tmp/capture/rest/ (posts?_fields=slug,featured_media + media?include=...); the image bytes come from uploads
    rest_img = {}
    rp, rm = os.path.join(SCRATCH, 'rest', 'posts.json'), os.path.join(SCRATCH, 'rest', 'media.json')
    if os.path.exists(rp) and os.path.exists(rm):
        media = {m['id']: m for m in json.load(open(rm, encoding='utf-8'))}
        for p in json.load(open(rp, encoding='utf-8')):
            m = media.get(p.get('featured_media'))
            if not m or m['source_url'].lower().endswith('.heic'):
                continue
            path = urllib.parse.urlsplit(p['link']).path
            md = m.get('media_details') or {}
            rest_img[urllib.parse.unquote(p['link']).lower()] = {'src': m['source_url'], 'alt': clean(m.get('alt_text', '')), 'w': md.get('width'), 'h': md.get('height')}
            IMG_REFS.setdefault(m['source_url'], {'pages': set(), 'alts': set()})['pages'].add(path + ' (featured)')
    all_urls = list(IMG_REFS.keys()) + [b[1] for b in brand] + [u for u in og_urls if '/wp-content/uploads/' in u]
    fetched = fetch_all(all_urls) if FETCH else load_fetch_log()
    local = place_images(fetched)

    # county + name map from the /service/ hub
    county_of, name_of, unlinked = {}, {}, []
    hub = recs.get(ORIGIN + '/service/')
    if hub:
        for s in hub[0]['sections']:
            cur = None
            for b in [{'type': 'h' + str(s.get('headingLevel', 2)), 'text': s['heading']}] + s['blocks']:
                if b['type'] in ('h2', 'h3', 'h4'):
                    # the hub's county headings read "Bergen County" ... but the last one is just "Passaic"
                    m = re.match(r'^(Hudson|Bergen|Essex|Union|Passaic)(?: County)?$', b.get('text', '').strip())
                    if m:
                        cur = m.group(1)
                hs = []
                if b['type'] == 'card' and b.get('href'):
                    hs = ['<a href="%s">%s</a>' % (b['href'], esc(b.get('title', '')))]
                elif b['type'] in ('h4',) and cur and not b.get('href'):
                    # a town printed as a plain heading with no link (the hub forgets to link it)
                    guess = slugify(b['text']) + '-weed-delivery'
                    if os.path.exists(os.path.join(RAW, '_index.json')) and (ORIGIN + '/service/%s/' % guess) in recs:
                        county_of.setdefault(guess, cur)
                        name_of.setdefault(guess, b['text'])
                        unlinked.append(b['text'])
                elif b['type'] in ('ul', 'ol'):
                    hs = b['items']
                elif b.get('html'):
                    hs = [b['html']]
                for item in hs:
                    for href, txt in re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', item):
                        m2 = re.match(r'^https://ladyljerseycity\.com/service/([^/]+)/$', html.unescape(href))
                        if m2:
                            if cur:
                                county_of.setdefault(m2.group(1), cur)
                            name_of.setdefault(m2.group(1), plain(txt))
    # hub loop items (blog dates + featured images; event dates)
    blog_loop, event_loop = {}, {}
    for url in (ORIGIN + '/blog/', ORIGIN + '/events/'):
        if url in recs:
            for items in recs[url][1]['loops']:
                for it in items:
                    (blog_loop if url.endswith('/blog/') else event_loop)[urllib.parse.unquote(it['href']).lower()] = it

    written = {'pages': [], 'posts': [], 'events': [], 'places': [], 'delivery': []}
    for d in written:
        os.makedirs(os.path.join(CONTENT, d), exist_ok=True)
    place_names = {'dispensary-near-lincoln-park': 'Lincoln Park', 'dispensary-near-hoboken': 'Hoboken', 'dispensary-near-statue-of-liberty': 'Statue of Liberty',
                   'dispensary-near-north-bergen': 'North Bergen', 'dispensary-near-newark-international-airport': 'Newark International Airport',
                   'dispensary-near-bayonne': 'Bayonne', 'dispensary-near-kearny': 'Kearny'}
    for url, (rec, ctx, root, h, meta) in recs.items():
        rewrite_imgs(rec, local)
        segs = [s for s in rec['path'].split('/') if s]
        raw_slug = segs[-1] if segs else 'home'
        dec = urllib.parse.unquote(raw_slug)
        file_slug = re.sub(r'-+', '-', re.sub(r'[^a-z0-9-]+', '', dec.lower())).strip('-')
        rec2 = {'slug': dec, 'path': rec['path'], 'url': url}
        if file_slug != dec:
            rec2['fileSlug'] = file_slug
            rec2['pathDecoded'] = urllib.parse.unquote(rec['path'])
        og = rec['ogImage']
        rec2.update({'title': rec['title'], 'description': rec['description'], 'canonical': rec['canonical'],
                     'ogImage': local.get(og, {}).get('path', og) if og else '', 'ogImageSrc': og, 'h1': rec['h1'], 'postId': rec['postId']})
        if rec.get('jsonld'):
            rec2['jsonld'] = rec['jsonld']
        typ = 'pages'
        if len(segs) == 2 and segs[0] == 'blog':
            typ = 'posts'
        elif len(segs) == 2 and segs[0] == 'events':
            typ = 'events'
        elif len(segs) == 2 and segs[0] == 'new-jersey':
            typ = 'places'
        elif len(segs) == 2 and segs[0] == 'service':
            typ = 'delivery'
        if ctx['adjacent']:
            rec2['adjacent'] = ctx['adjacent']
        if typ == 'posts':
            lp = blog_loop.get(urllib.parse.unquote(url).lower(), {})
            body = find1(root, lambda x: 'post_content' in x.cls())
            bctx = dict(ctx, embeds=[])
            bh = tidy_body(body_html(body, bctx)) if body is not None else ''
            bh = rewrite_html_imgs(bh, local)
            rec2['dateText'] = lp.get('dateText', '')
            iso = None
            for ld in rec.get('jsonld', []):
                for g in (ld.get('@graph', []) if isinstance(ld, dict) else []):
                    if isinstance(g, dict) and g.get('datePublished') and g.get('@type') in ('BlogPosting', 'Article', 'NewsArticle', 'WebPage'):
                        iso = iso or g['datePublished']
            rec2['date'] = iso or date_iso(lp.get('dateText', '')) or ''
            rec2['dateSource'] = 'JSON-LD datePublished' if iso else ('/blog/ hub loop date' if lp.get('dateText') else 'none')
            im = lp.get('img') or rest_img.get(urllib.parse.unquote(url).lower())
            rec2['imageSource'] = '/blog/ hub card' if lp.get('img') else ('WP REST featured_media' if im else 'none (featured image is HEIC or missing)')
            if im:
                li = local.get(im['src'])
                rec2['image'] = {'src': li['path'] if li else im['src'], 'w': li['w'] if li else im.get('w'), 'h': li['h'] if li else im.get('h'), 'alt': im.get('alt', '')}
            else:
                rec2['image'] = None
            paras = re.findall(r'<p>(.*?)</p>', bh)
            rec2['excerpt'] = plain(paras[0]) if paras else ''
            rec2['html'] = bh
            rec2['sections'] = rec['sections']
        elif typ == 'events':
            lp = event_loop.get(urllib.parse.unquote(url).lower(), {})
            first = rec['sections'][0] if rec['sections'] else {'blocks': []}
            tx = [b for b in first['blocks'] if b['type'] == 'p' and not b.get('role')]
            # the event template prints date, time and venue as three text elements under the H1
            dt = lp.get('dateText') or (plain(tx[0]['html']) if tx else '')
            tm = lp.get('timeText', '')
            for b in first['blocks']:
                if b['type'] == 'p' and plain(b['html']) == dt and not b.get('role'):
                    b['role'] = 'date'
                elif b['type'] == 'p' and tm and plain(b['html']) == tm and not b.get('role'):
                    b['role'] = 'time'
            if not tm:
                cand = [b for b in first['blocks'] if b['type'] == 'p' and re.search(r'\d\s*(?::\d\d)?\s*(AM|PM|am|pm)', plain(b['html'])) and not b.get('role')]
                if cand:
                    tm = plain(cand[0]['html'])
                    cand[0]['role'] = 'time'
            rec2['dateText'] = dt
            rec2['timeText'] = tm
            rec2['startISO'] = None if (dt or '').strip().lower() == 'year-round' else date_iso(dt)
            imgs = [b for s in rec['sections'] for b in s['blocks'] if b['type'] == 'img']
            rec2['image'] = ({'src': imgs[0]['src'], 'w': imgs[0].get('w'), 'h': imgs[0].get('h'), 'alt': imgs[0].get('alt', '')} if imgs else None)
            rec2['sections'] = rec['sections']
        else:
            rec2['sections'] = rec['sections']
        if typ == 'places':
            rec2 = dict(list(rec2.items())[:3] + [('name', place_names.get(dec, ''))] + list(rec2.items())[3:])
        if typ == 'delivery':
            hub_nm = name_of.get(dec, '')
            slug_nm = dec.replace('-weed-delivery', '')
            nm = hub_nm if re.sub(r'[^a-z]', '', hub_nm.lower()) == re.sub(r'[^a-z]', '', slug_nm) else ' '.join(w if w in ('of',) else w.capitalize() for w in slug_nm.split('-'))
            if hub_nm and nm != hub_nm:
                rec2['nameOnHub'] = hub_nm
            rec2 = dict(list(rec2.items())[:3] + [('name', nm), ('county', county_of.get(dec))] + list(rec2.items())[3:])
        fname = (file_slug if typ != 'pages' else (dec if segs else 'home')) + '.json'
        with open(os.path.join(CONTENT, typ, fname), 'w', encoding='utf-8', newline='\n') as o:
            json.dump(rec2, o, ensure_ascii=False, indent=1)
        written[typ].append(fname)
        stats['pages'][rec['path']] = {'type': typ, 'file': typ + '/' + fname, 'sections': len(rec['sections']),
                                       'blocks': sum(len(s['blocks']) for s in rec['sections'])}
    # brand files
    os.makedirs(BRAND, exist_ok=True)
    brand_out = []
    for role, u, alt in brand:
        f = fetched.get(u)
        if not f or not f.get('ok'):
            brand_out.append({'role': role, 'src': u, 'ok': False})
            continue
        ext = f['ext']
        if role == 'ladyl-logo':
            dst = 'ladyl-logo.' + ext
        elif role == 'ladyl-logo-footer':
            dst = 'ladyl-logo-footer.' + ext
        elif role == 'icon:apple-touch-icon':
            dst = 'apple-touch-icon.png'
        elif role == 'icon:icon' and '32x32' in u:
            dst = 'favicon-32.png'
        elif role == 'icon:icon':
            dst = 'favicon.png'
        else:
            dst = 'favicon-270.png'
        shutil.copyfile(f['file'], os.path.join(BRAND, dst))
        brand_out.append({'role': role, 'src': u, 'file': 'assets/brand/' + dst, 'w': f.get('w'), 'h': f.get('h'), 'bytes': f.get('bytes'), 'alt': alt})
    try:
        from PIL import Image
        srcs = [os.path.join(BRAND, x) for x in ('favicon-270.png', 'favicon.png') if os.path.exists(os.path.join(BRAND, x))]
        if srcs:
            Image.open(srcs[0]).convert('RGBA').save(os.path.join(BRAND, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
            brand_out.append({'role': 'icon:ico', 'file': 'assets/brand/favicon.ico', 'from': os.path.basename(srcs[0]) + ' (PIL ICO 16/32/48)'})
    except Exception as e:
        brand_out.append({'role': 'icon:ico', 'error': str(e)})
    stats['brand'] = brand_out
    stats['written'] = {k: len(v) for k, v in written.items()}
    stats['county_of'] = county_of
    stats['name_of'] = name_of
    stats['unlinked_towns'] = unlinked
    stats['images'] = {'refs': len(IMG_REFS), 'local': len(set(v['path'] for v in local.values()))}
    with open(os.path.join(SCRATCH, 'stats.json'), 'w', encoding='utf-8') as o:
        json.dump(stats, o, ensure_ascii=False, indent=1)
    # asset map
    amap = {}
    for u, v in local.items():
        e = amap.setdefault(v['file'], {'file': 'assets/photos/ll/' + v['file'], 'sources': [], 'bytes': v['bytes'], 'w': v['w'], 'h': v['h'], 'type': v['ext'], 'sha1': v['sha1'], 'usedOn': set()})
        e['sources'].append(u)
        e['usedOn'] |= set(IMG_REFS.get(u, {}).get('pages', set()))
        for r in recs.values():
            if r[0].get('ogImage') == u:
                e['usedOn'].add(r[0]['path'] + ' (og:image)')
    rejected = [{'src': u, 'status': f.get('status'), 'magic': f.get('magic'), 'note': f.get('note', '')} for u, f in fetched.items() if not f.get('ok')]
    out = {'about': 'Lady L content images captured from the live site (largest srcset candidate, wp-content/uploads), de-duplicated by sha1. Brand files in assets/brand/ are listed under brand.',
           'images': sorted(({**e, 'usedOn': sorted(e['usedOn'])} for e in amap.values()), key=lambda e: e['file']),
           'brand': brand_out, 'rejected': rejected,
           'census': census(fetched)}
    os.makedirs(os.path.join(ROOT, 'facts'), exist_ok=True)
    with open(os.path.join(ROOT, 'facts', 'asset-map.json'), 'w', encoding='utf-8', newline='\n') as o:
        json.dump(out, o, ensure_ascii=False, indent=1)
    print('written', stats['written'], 'images refs', len(IMG_REFS), 'local files', len(amap), 'rejected', len(rejected))


# ---------------------------------------------------------------- fetching + placing images
def magic(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if b[:3] == b'\xff\xd8\xff':
        return 'jpg'
    if b[:6] in (b'GIF87a', b'GIF89a'):
        return 'gif'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        return 'webp'
    if b[4:12] in (b'ftypavif', b'ftypavis'):
        return 'avif'
    head = b[:512].lstrip().lower()
    if (head.startswith(b'<?xml') or head.startswith(b'<svg')) and b'<svg' in b[:4096].lower():
        return 'svg'
    return None


def dims(path, kind):
    if kind == 'svg':
        s = open(path, encoding='utf-8', errors='replace').read(8192)
        m = re.search(r'<svg[^>]*>', s)
        tag = m.group(0) if m else ''
        w = re.search(r'\swidth="([\d.]+)', tag)
        h = re.search(r'\sheight="([\d.]+)', tag)
        if w and h:
            return int(float(w.group(1))), int(float(h.group(1)))
        vb = re.search(r'viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"', tag)
        if vb:
            return int(float(vb.group(1))), int(float(vb.group(2)))
        return None, None
    try:
        from PIL import Image
        with Image.open(path) as im:
            return im.size
    except Exception:
        return None, None


def load_fetch_log():
    p = os.path.join(DL, '_log.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def fetch_all(urls):
    os.makedirs(DL, exist_ok=True)
    log = load_fetch_log()
    stop = False
    for u in sorted(set(urls)):
        if u in log and (log[u].get('ok') or log[u].get('status') in (404, 410)):
            continue
        if stop:
            break
        if urllib.parse.urlsplit(u).netloc != 'ladyljerseycity.com':
            log[u] = {'ok': False, 'note': 'not the same host: not fetched'}
            continue
        time.sleep(0.4)
        name = hashlib.sha1(u.encode()).hexdigest()[:16] + '.bin'
        fp = os.path.join(DL, name)
        try:
            safe = urllib.parse.quote(u, safe=':/?&=%#+,;@!$*()~-._')
            req = urllib.request.Request(safe, headers={'User-Agent': UA, 'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8'})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                status = r.status
                ctype = r.headers.get('Content-Type', '')
        except urllib.error.HTTPError as e:
            log[u] = {'ok': False, 'status': e.code, 'note': 'HTTP error'}
            if e.code in (401, 403, 429):
                print('STOP: HTTP', e.code, u)
                stop = True
            continue
        except Exception as e:
            log[u] = {'ok': False, 'status': None, 'note': 'fetch error: %s' % e}
            continue
        mk = magic(data)
        if not mk:
            log[u] = {'ok': False, 'status': status, 'magic': None, 'ctype': ctype, 'bytes': len(data), 'note': 'rejected: not PNG/JPEG/WebP/GIF/SVG/AVIF (soft-404?)'}
            continue
        open(fp, 'wb').write(data)
        w, h = dims(fp, mk)
        log[u] = {'ok': True, 'status': status, 'magic': mk, 'ext': 'jpg' if mk == 'jpg' else mk, 'ctype': ctype, 'bytes': len(data),
                  'sha1': hashlib.sha1(data).hexdigest(), 'file': fp, 'w': w, 'h': h}
        print('ok', status, mk, len(data), w, h, u[-70:])
    with open(os.path.join(DL, '_log.json'), 'w', encoding='utf-8') as o:
        json.dump(log, o, ensure_ascii=False, indent=1)
    return log


def census(log):
    c = {}
    for u, f in log.items():
        k = f.get('magic') or ('rejected' if f.get('status') else 'not-fetched')
        c[k] = c.get(k, 0) + 1
    return c


def place_images(log):
    os.makedirs(PHOTOS, exist_ok=True)
    by_sha, names, local = {}, {}, {}
    for u in sorted(IMG_REFS.keys()) + sorted(k for k in log if k not in IMG_REFS):
        f = log.get(u)
        if not f or not f.get('ok'):
            continue
        if u not in IMG_REFS and '/wp-content/uploads/' in u and not any(x in u for x in ('cropped-favicon', 'lady-l-cannabis.webp', 'Link-')):
            pass
        sha = f['sha1']
        if sha in by_sha:
            local[u] = by_sha[sha]
            continue
        base = urllib.parse.unquote(os.path.basename(urllib.parse.urlsplit(u).path)).lower()
        base = re.sub(r'[^a-z0-9._-]+', '-', base).strip('-')
        stem, ext = os.path.splitext(base)
        ext = '.' + f['ext']
        cand, n = stem + ext, 1
        while cand in names and names[cand] != sha:
            n += 1
            cand = '%s-%d%s' % (stem, n, ext)
        names[cand] = sha
        shutil.copyfile(f['file'], os.path.join(PHOTOS, cand))
        v = {'file': cand, 'path': '/assets/photos/ll/' + cand, 'w': f['w'], 'h': f['h'], 'bytes': f['bytes'], 'sha1': sha, 'ext': f['ext']}
        by_sha[sha] = v
        local[u] = v
    return local


def rewrite_imgs(rec, local):
    def fix(b):
        if not isinstance(b, dict):
            return
        if b.get('type') == 'img' or ('src' in b and 'alt' in b and b.get('type') is None):
            l = local.get(b.get('src'))
            if l:
                b['orig'] = b['src']
                b['src'] = l['path']
                b['w'], b['h'] = l['w'], l['h']
        for k in ('img',):
            if isinstance(b.get(k), dict):
                fix(b[k])
        for k in ('more_imgs', 'items'):
            if isinstance(b.get(k), list):
                for x in b[k]:
                    fix(x)
    for s in rec['sections']:
        for b in s['blocks']:
            fix(b)


def rewrite_html_imgs(h, local):
    def rep(m):
        src = html.unescape(m.group(1))
        l = local.get(src)
        if not l:
            return m.group(0)
        tag = m.group(0).replace(m.group(1), l['path'])
        tag = re.sub(r'\swidth="\d+"', '', tag)
        tag = re.sub(r'\sheight="\d+"', '', tag)
        return tag[:-1] + ' width="%s" height="%s">' % (l['w'], l['h'])
    return re.sub(r'<img src="([^"]+)"[^>]*>', rep, h)


if __name__ == '__main__':
    main()
