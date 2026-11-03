// shop.mjs: SHOP lane (docs/BUILD-CONTRACT.md section 6). Pages:
//   /products/                 hub: page hero, the 8 category arch tiles (ia.nav Products children), Lady L's own
//                              "shop by category" words (home.json), an order band (menu), the two services
//   /products/<slug>/ x 8      category: hero with the category still breaking out of its arch, WRITER glue
//                              (ctx.glue[slug]), Lady L's own words about the category quoted from captured pages,
//                              an order band (menu(ctx, slug)), other categories, a deals band
//   /jersey-city-weed-deals/, /jersey-city-420-discounts-day/, /rewards/, /refer-a-friend/
//                              Lady L's captured pages, EVERY word, head verbatim, on the inner-page layout (page hero +
//                              alternating sections); offers as glass offer cards with Deco chips, steps as Deco
//                              numerals, reward tiers as a glass ladder, FAQs as accordions.
// Every new word here is neutral glue (D2). In-site shop navigation stays on /products/...; explicit order buttons leave
// for Lady L's live menu through menu(ctx, slug) (D4). Lane classes are prefixed s-.
import { esc, escA, linkAttrs, gimg, img, absUrl, menu, rewriteLinks, liveHref, stripTags, demoForm } from './util.mjs';
import * as shell from './shell.mjs';

const { page, crumbsHtml, icon } = shell;
const TAIL = ' | LADY L CANNABIS';
const CAPTURED = ['jersey-city-weed-deals', 'jersey-city-420-discounts-day', 'rewards', 'refer-a-friend'];
const pad = (n) => String(n).padStart(2, '0');
const rw = (html) => rewriteLinks(html || '');
const text = (html) => stripTags(String(html || '')).replace(/\s+/g, ' ').trim();

// ---------- data ----------
const cats = (ctx) => (((ctx.ia.nav || []).find((n) => n.href === '/products/') || {}).children || [])
  .map((c, i) => ({ ...c, slug: c.href.replace(/^\/products\/|\/$/g, ''), i }));
function glueOf(ctx, slug) {
  const g = ctx.glue || {};
  const hit = g[slug] || (g.categories && (Array.isArray(g.categories) ? g.categories.find((x) => x.slug === slug) : g.categories[slug]));
  return hit && typeof hit === 'object' ? hit : null;
}
const points = (g) => ((g && g.points) || []).map((p) => (typeof p === 'string' ? p : [p.title, p.text].filter(Boolean).join(': '))).filter(Boolean);
const intro = (g) => [].concat((g && g.intro) || []).filter(Boolean);
const pageName = (rec) => String((rec && (rec.title || rec.h1)) || '').split('|')[0].trim();
const blocksOf = (rec) => ((rec && rec.sections) || []).flatMap((s) => s.blocks || []);

// ---------- shared pieces ----------
const arrow = (label) => `${esc(label)}${icon('arrow', 's-arr')}`;
const extIco = () => icon('ext', 's-ext');
function btn(u, label, cls = 'btn btn--sun') {
  const h = liveHref(u);
  return `<a class="${cls}"${linkAttrs(h)}>${esc(label)}${/^https?:/i.test(h) ? extIco() : ''}</a>`;
}
const clip = (extra = '') => `<div class="band__clip" aria-hidden="true">${extra}<span class="grain"></span></div>`;
const crumbsLd = (ctx, crumbs) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: absUrl(ctx, c.href) } : {}) })) });

function out(ctx, { path, title, description, crumbs, bodyClass, main, jsonld = [] }) {
  return { path, html: page({ ctx, path, title, description, crumbs, heroCrumbs: true, bodyClass: 'page-shop ' + bodyClass, main, og: { title, description, type: 'website', url: absUrl(ctx, path) }, jsonld: [crumbsLd(ctx, crumbs), ...jsonld] }) };
}

// The page hero (adopted inner-page pattern): night ground, sunburst rays, kicker, H1, one line, CTAs, breadcrumb,
// and an arch window on the right that breaks out over the hero's bottom edge into the next band.
function hero({ crumbs, kicker, h1, line, ctas, media, cls = '' }) {
  return `<section class="page-hero s-hero ${cls}" data-sunburst data-spot>
${clip('<span class="s-hero__glow"></span>')}
<div class="wrap page-hero__inner">
<div class="page-hero__text s-hero__text">
${crumbsHtml(crumbs)}
${kicker ? `<p class="kicker s-hero__kicker" data-reveal>${esc(kicker)}</p>` : ''}
<h1 class="display s-hero__h1" data-reveal style="--i:1">${h1}</h1>
${line ? `<div class="page-hero__lede s-hero__line" data-reveal style="--i:2">${line}</div>` : ''}
${ctas ? `<div class="btn-row s-hero__ctas" data-reveal style="--i:3">${ctas}</div>` : ''}
</div>
<div class="page-hero__art s-hero__art" data-reveal style="--i:2">${media}</div>
</div>
</section>`;
}
// arch window + an optional cut-out riding on parallax (the two protrusions of the first screen)
function heroArch(inner, { cut = '', wide = false } = {}) {
  return `<div class="s-heroarch${wide ? ' s-heroarch--wide' : ''}">
<span class="s-heroarch__halo" aria-hidden="true"></span>
<figure class="arch s-heroarch__frame" data-tilt="4"><span class="arch__img">${inner}</span></figure>
${cut ? `<span class="s-heroarch__cut" data-depth="0.14" aria-hidden="true">${gimg(cut, { alt: '', cls: 'cut', sizes: '(min-width: 1024px) 220px, 28vw' })}</span>` : ''}
</div>`;
}

function tile(c, i, sizes = '(min-width: 1240px) 290px, (min-width: 1024px) 23vw, (min-width: 640px) 45vw, 70vw') {
  return `<li class="s-tiles__item" data-reveal style="--i:${i % 4}"><a class="tile s-tile"${linkAttrs(c.href)}>
<span class="tile__media s-tile__media">${gimg(c.gimg, { alt: '', sizes })}<span class="s-tile__no" aria-hidden="true">${pad(c.i + 1)}</span></span>
<span class="tile__title s-tile__title">${esc(c.label)}</span>
<span class="tile__cta s-tile__cta">${arrow('Explore')}</span>
</a></li>`;
}

// the Delivery + Pickup pair: FOUNDATION's serviceCards(ctx) when exported, else a small pair from site.json facts
function services(ctx) {
  if (typeof shell.serviceCards === 'function') return `<div class="s-svcs">${shell.serviceCards(ctx)}</div>`;
  const d = ctx.site.delivery || {};
  const p = ctx.site.pickup || {};
  const card = (ico, t, facts, info, cta, i) => `<article class="svc glass glass--lift s-svc" data-reveal style="--i:${i}">
<span class="s-svc__ico">${icon(ico)}</span>
<h3 class="s-svc__t">${esc(t)}</h3>
<ul class="s-svc__facts">${facts.filter(Boolean).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<div class="btn-row">${btn(menu(ctx), cta)}${btn(info, 'Details', 'btn btn--ghost')}</div>
</article>`;
  return `<div class="s-svcs">${card('truck', 'Delivery', [d.window, d.minimum, d.id], '/service/', 'Order for Delivery', 0)}${card('bag', 'Pickup', [p.step, ctx.site.lastCall], '/in-store-pickup/', 'Order for Pickup', 1)}</div>`;
}

// Lady L's own words, quoted verbatim in a glass card with a link to the page they come from
function quoteCard({ heading, q, html, from, href: to }, i = 0, cls = '') {
  return `<figure class="glass glass--lift s-quote ${cls}" data-reveal style="--i:${i}">
<span class="s-quote__mark" aria-hidden="true">&ldquo;</span>
${heading ? `<p class="s-quote__h">${esc(heading)}</p>` : ''}
${q ? `<p class="s-quote__q">${esc(q)}</p>` : ''}
<blockquote class="s-quote__body">${html}</blockquote>
<figcaption class="s-quote__src">From <a${linkAttrs(to)}>${esc(from)}</a></figcaption>
</figure>`;
}

// ---------- Lady L's words about a category (search every captured page) ----------
const CAT_RE = {
  flower: /\bflower\b/gi,
  'pre-rolls': /\bpre-?rolls?\b/gi,
  'infused-pre-rolls': /\binfused\b/gi,
  vapes: /\bvap(?:e|es|orizers?|ing)\b/gi,
  edibles: /\bedibles?\b|\bgumm(?:y|ies)\b/gi,
  tinctures: /\btinctures?\b/gi,
  concentrates: /\bconcentrates?\b|\blive resin\b|\brosin\b/gi,
  accessories: /\baccessor(?:y|ies)\b/gi,
};
const PRIORITY = ['cannabis-guide', 'service', 'home', 'faq', 'jersey-city-weed-deals', 'jersey-city-420-discounts-day', 'about-us'];
const hits = (re, s) => (String(s).match(re) || []).length;
function candidates(ctx) {
  if (candidates.cache) return candidates.cache;
  const order = [...PRIORITY.filter((s) => ctx.content[s]), ...Object.keys(ctx.content).filter((s) => !PRIORITY.includes(s) && !s.includes('--'))];
  const list = [];
  order.forEach((slug, pi) => {
    const rec = ctx.content[slug];
    const from = slug === 'home' ? 'the Lady L home page' : pageName(rec);
    const to = rec.path || '/' + slug + '/';
    for (const s of rec.sections || []) {
      const bl = s.blocks || [];
      bl.forEach((b, bi) => {
        if (b.type === 'p' && text(b.html).length >= 60) list.push({ pi, slug, from, href: to, heading: s.heading, txt: text(b.html), html: `<p>${rw(b.html)}</p>` });
        if ((b.type === 'ul' || b.type === 'ol') && Array.isArray(b.items)) {
          const prev = bl[bi - 1] && bl[bi - 1].type === 'p' ? bl[bi - 1] : null;
          for (const it of b.items) {
            const h = typeof it === 'string' ? it : it.html || it.text || '';
            if (text(h).length < 16) continue;
            list.push({ pi, slug, from, href: to, heading: s.heading, txt: text(h), lead: prev ? text(prev.html) : '', html: `${prev ? `<p>${rw(prev.html)}</p>` : ''}<ul><li>${rw(h)}</li></ul>`, item: true });
          }
        }
        if (b.type === 'faq') for (const it of b.items || []) list.push({ pi, slug, from, href: to, heading: '', q: it.q, txt: text(it.q + ' ' + it.a_html), html: rw(it.a_html) });
      });
    }
  });
  candidates.cache = list;
  return list;
}
function wordsFor(ctx, slug, max = 3) {
  const re = CAT_RE[slug];
  if (!re) return [];
  const scored = [];
  for (const c of candidates(ctx)) {
    let n = hits(re, c.txt);
    const inHead = hits(re, c.heading || '');
    // the Cannabis Guide is Lady L's guide to flower: its alternative-cannabinoid section belongs with flower
    const pin = slug === 'flower' && c.slug === 'cannabis-guide' && /alternative cannabinoids/i.test(c.heading || '');
    if (!n && !inHead && !pin) continue;
    const others = Object.keys(CAT_RE).filter((k) => k !== slug && k !== 'infused-pre-rolls' && hits(CAT_RE[k], c.txt)).length;
    const score = Math.min(n, 3) * 2 + inHead * 3 + (pin ? 3 : 0) - Math.max(0, others - 2) - c.pi * 0.25 - (c.item ? 0.5 : 0);
    scored.push({ ...c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const pick = [];
  for (const c of scored) {
    const key = c.html;
    if (seen.has(key)) continue;
    seen.add(key);
    pick.push(c);
    if (pick.length >= max) break;
  }
  return pick;
}
function shopByCategory(ctx) {
  const home = ctx.content.home;
  if (!home) return null;
  const s = (home.sections || []).find((x) => /shop by category/i.test(x.heading || '') || (x.blocks || []).some((b) => /^h[1-4]$/.test(b.type) && /shop by category/i.test(b.text || '')));
  const p = s && (s.blocks || []).find((b) => b.type === 'p' && text(b.html).length > 40);
  return p ? { heading: (s.heading || 'shop by category'), html: `<p>${rw(p.html)}</p>`, from: 'the Lady L home page', href: '/' } : null;
}

// ---------- deals band (category pages) ----------
function dealBand(ctx) {
  const deals = ctx.content['jersey-city-weed-deals'];
  const rew = ctx.content.rewards;
  const card = (to, ico, t, line, cta, i) => `<a class="glass glass--lift s-dealcard" data-reveal style="--i:${i}"${linkAttrs(to)}>
<span class="chip chip--sun s-dealcard__chip">${icon(ico)}<span>${esc(cta)}</span></span>
<span class="s-dealcard__t">${esc(t)}</span>
<span class="s-dealcard__d">${esc(line)}</span>
<span class="link-arrow s-dealcard__go">${arrow('Open')}</span>
</a>`;
  return `<section class="band band--sun s-dealband" aria-labelledby="dealband-h" data-sunburst>
${clip()}
<div class="wrap s-dealband__grid">
<div class="s-dealband__head" data-reveal><p class="kicker">Deals and rewards</p><h2 class="display s-h2" id="dealband-h">Save on your <em>next</em> order</h2></div>
${card('/jersey-city-weed-deals/', 'tag', deals ? deals.h1 || pageName(deals) : 'Jersey City Weed Deals', 'Specials, discount types and loyalty points, on Lady L\'s deals page.', 'Deals', 1)}
${card('/rewards/', 'gift', rew ? rew.h1 || pageName(rew) : 'Lady L Rewards', ctx.site.loyaltyLine || '', 'Rewards', 2)}
</div>
</section>`;
}

// ---------- order band ----------
function orderBand(ctx, { slug = '', label = '', id = 'order-h' } = {}) {
  const u = menu(ctx, slug || undefined);
  const d = ctx.site.delivery || {};
  const h = label ? `Order <em>${esc(label)}</em> for delivery or pickup` : 'Order online for <em>delivery</em> or pickup';
  const all = cats(ctx);
  return `<section class="band band--night s-order" aria-labelledby="${id}" data-spot>
${clip('<span class="s-order__glow"></span>')}
<div class="wrap s-order__grid">
<div class="s-order__text" data-reveal>
<p class="kicker">Lady L's online menu</p>
<h2 class="display s-h2" id="${id}">${h}</h2>
<ul class="s-order__facts">${[d.window, ctx.site.lastCall].filter(Boolean).map((f) => `<li>${icon('star', 's-order__star')}<span>${esc(f)}</span></li>`).join('')}</ul>
<div class="btn-row">${btn(u, 'Order for Delivery')}${btn(u, 'Order for Pickup', 'btn btn--glass')}</div>
<p class="s-order__more"><a class="link-arrow"${linkAttrs('/service/')}>${arrow('How delivery works')}</a> <a class="link-arrow"${linkAttrs('/in-store-pickup/')}>${arrow('How pickup works')}</a></p>
</div>
${label ? '' : `<ul class="s-order__chips" data-reveal style="--i:1">${all.map((c) => `<li><a class="chip s-chip"${linkAttrs(menu(ctx, c.menu || c.slug))}>${esc(c.label)}${extIco()}</a></li>`).join('')}</ul>`}
</div>
</section>`;
}

// ---------- /products/ ----------
function productsPage(ctx) {
  const path = '/products/';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Products' }];
  const all = cats(ctx);
  const sbc = shopByCategory(ctx);
  const media = heroArch(gimg('g-flower', { eager: true, alt: '', sizes: '(min-width: 1024px) 440px, 76vw' }), { cut: 'g-pampas-cut' });
  const main = `${hero({
    crumbs,
    kicker: 'Shop by category',
    h1: 'Cannabis <em>Products</em>',
    line: `<p>${all.length} categories on Lady L's online menu, for delivery or in-store pickup at ${esc(ctx.site.address.streetShort)}.</p>`,
    ctas: `${btn(menu(ctx), 'Order for Delivery')}${btn(menu(ctx), 'Order for Pickup', 'btn btn--glass')}`,
    media,
    cls: 's-hero--hub',
  })}
<section class="band band--cream s-after s-cats" aria-labelledby="cats-h">
${clip('<span class="s-botanical"></span>')}
<div class="wrap">
<div class="s-head s-head--row" data-reveal><div><p class="kicker">The categories</p><h2 class="display s-h2" id="cats-h">Shop by <em>category</em></h2></div><p class="s-head__note">Each tile opens a category page with a link to that part of Lady L's online menu.</p></div>
<ul class="s-tiles" role="list">
${all.map((c, i) => tile(c, i)).join('\n')}
</ul>
</div>
</section>
${sbc ? `<section class="band band--linen s-words" aria-labelledby="words-h">
<div class="wrap s-words__grid">
<div class="s-words__head" data-reveal><p class="kicker">In Lady L's words</p><h2 class="display s-h2" id="words-h">Curated, <em>not</em> crowded</h2><p class="s-head__note">Lady L's own words about what the shop carries.</p><a class="link-arrow"${linkAttrs('/')}>${arrow('Visit the home page')}</a></div>
${quoteCard(sbc, 1, 'glass--cream s-quote--big')}
</div>
</section>` : ''}
${orderBand(ctx)}
<section class="band band--cream s-svcband" aria-labelledby="svc-h">
<div class="wrap">
<div class="s-head s-head--center" data-reveal><p class="kicker">Two ways to get it</p><h2 class="display s-h2" id="svc-h">Delivery <em>and</em> pickup</h2></div>
${services(ctx)}
</div>
</section>`;
  return out(ctx, { path, title: 'Cannabis Products' + TAIL, description: `Shop by category at Lady L Cannabis, ${ctx.site.address.street}, Jersey City, NJ: ${all.map((c) => c.label.toLowerCase()).join(', ')}, for delivery or in-store pickup.`, crumbs, bodyClass: 'page-products', main });
}

// ---------- /products/<slug>/ ----------
const CUT = { flower: 'g-bud-cut', 'pre-rolls': 'g-leaf-cut', 'infused-pre-rolls': 'g-moon-cut', vapes: 'g-pampas-cut', edibles: 'g-moon-cut', tinctures: 'g-leaf-cut', concentrates: 'g-bud-cut', accessories: 'g-pampas-cut' };
function categoryPage(ctx, cat, all) {
  const path = cat.href;
  const g = glueOf(ctx, cat.slug);
  const label = (g && g.label) || cat.label;
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Products', href: '/products/' }, { label }];
  const order = menu(ctx, cat.menu || cat.slug);
  const words = wordsFor(ctx, cat.slug, cat.slug === 'flower' ? 4 : 3);
  const others = all.filter((c) => c.slug !== cat.slug);
  const ins = intro(g);
  const pts = points(g);
  const media = heroArch(gimg(cat.gimg, { eager: true, alt: (g && g.alt) || '', sizes: '(min-width: 1024px) 560px, 88vw' }), { cut: CUT[cat.slug], wide: true });
  const main = `${hero({
    crumbs,
    kicker: 'Shop by category',
    h1: `<em>${esc(label)}</em>`,
    line: `<p>Order ${esc(label.toLowerCase())} from Lady L for delivery or in-store pickup.</p>`,
    ctas: `${btn(order, 'Order for Delivery')}${btn(order, 'Order for Pickup', 'btn btn--glass')}`,
    media,
    cls: 's-hero--cat',
  })}
<section class="band band--cream s-after s-format" aria-labelledby="format-h">
${clip('<span class="s-botanical"></span>')}
<div class="wrap s-format__grid">
<div class="s-format__text" data-reveal>
<p class="kicker">The format</p>
<h2 class="display s-h2" id="format-h">About <em>${esc(label.toLowerCase())}</em></h2>
<div class="prose s-format__prose">${ins.length ? ins.map((s) => `<p>${esc(s)}</p>`).join('') : `<p>${esc(label)} is one of the categories on Lady L's online menu.</p>`}</div>
</div>
${pts.length ? `<div class="glass glass--cream glass--lift s-points" data-reveal style="--i:1">
<p class="s-points__h">Good to know</p>
<ol class="s-points__list">${pts.map((p, i) => `<li><span class="numeral s-points__n" aria-hidden="true">${pad(i + 1)}</span><span>${esc(p)}</span></li>`).join('')}</ol>
<a class="link-arrow"${linkAttrs('/education/')}>${arrow('More in Education')}</a>
</div>` : ''}
</div>
</section>
${words.length ? `<section class="band band--plum s-words s-words--cat" aria-labelledby="lw-h">
${clip('<span class="s-words__glow"></span>')}
<div class="wrap">
<div class="s-head s-head--row" data-reveal><div><p class="kicker">In Lady L's words</p><h2 class="display s-h2" id="lw-h">What Lady L says about <em>${esc(label.toLowerCase())}</em></h2></div><p class="s-head__note">Quoted from Lady L's own pages, each with a link to the page it comes from.</p></div>
<div class="s-quotes s-quotes--${Math.min(words.length, 4)}">
${words.map((w, i) => quoteCard(w, i)).join('\n')}
</div>
</div>
</section>` : ''}
${orderBand(ctx, { slug: cat.menu || cat.slug, label })}
<section class="band band--linen s-others" aria-labelledby="others-h">
<div class="wrap">
<div class="s-head s-head--row" data-reveal><div><p class="kicker">Keep browsing</p><h2 class="display s-h2" id="others-h">Other <em>categories</em></h2></div><a class="link-arrow s-head__link"${linkAttrs('/products/')}>${arrow('All products')}</a></div>
<ul class="s-tiles s-tiles--others" role="list">
${others.map((c, i) => tile(c, i, '(min-width: 1240px) 210px, (min-width: 1024px) 16vw, (min-width: 640px) 30vw, 60vw')).join('\n')}
</ul>
</div>
</section>
${dealBand(ctx)}`;
  const seo = g && g.seoTitle ? (/\|\s*LADY L CANNABIS\s*$/i.test(g.seoTitle) ? g.seoTitle : g.seoTitle + TAIL) : label + TAIL;
  const description = (g && g.description) || `${label} at Lady L Cannabis, ${ctx.site.address.street}, Jersey City, NJ: order online for delivery or in-store pickup.`;
  return out(ctx, { path, title: seo, description, crumbs, bodyClass: 'page-category cat-' + cat.slug, main });
}

// ---------- captured pages: Lady L's own words, every block ----------
const OFFER_LEAD = /deal|discount|offer|special|promotion|earn extra|ways to earn/i;
const isShortList = (b) => (b.type === 'ul' || b.type === 'ol') && Array.isArray(b.items) && b.items.length >= 3 && b.items.every((it) => text(typeof it === 'string' ? it : it.html || it.text).length <= 140);
const isTierList = (b) => (b.type === 'ul' || b.type === 'ol') && Array.isArray(b.items) && b.items.length >= 2 && b.items.every((it) => /points?\s*=\s*\$\d+/i.test(text(typeof it === 'string' ? it : it.html || it.text)));
const altOf = (b) => (/^[w-]+$/.test(String(b.alt || '')) && /_|-/.test(String(b.alt || '')) ? '' : b.alt || '');
const TIER = /points?s*=s*$d+/i;
const itemHtml = (it) => (typeof it === 'string' ? it : it.html || esc(it.text || ''));

function listHtml(b) {
  return `<${b.type} class="s-list">${b.items.map((it) => `<li>${rw(itemHtml(it))}</li>`).join('')}</${b.type}>`;
}
function offersHtml(b, chip = 'Offer') {
  return `<ul class="s-offers" role="list">${b.items.map((it, i) => `<li class="s-offers__item" data-reveal style="--i:${i % 4}"><div class="glass glass--lift s-offer">
<span class="chip chip--sun s-offer__chip" aria-hidden="true">${esc(chip)} ${pad(i + 1)}</span>
<p class="s-offer__t">${rw(itemHtml(it))}</p>
</div></li>`).join('')}</ul>`;
}
// rungs: html strings (list items or tier headings); tag keeps a captured heading a heading
function ladderHtml(rungs, tag = 'p') {
  return `<ol class="s-ladder" role="list">${rungs.map((h, i) => {
    const amt = (text(h).match(/\$\d+/) || [''])[0];
    return `<li class="s-ladder__rung" style="--rung:${i};--i:${i}" data-reveal><div class="glass glass--strong glass--lift s-ladder__card">
<span class="s-ladder__amt" aria-hidden="true">${esc(amt)}</span>
<${tag} class="s-ladder__t">${rw(h)}</${tag}>
</div></li>`;
  }).join('')}</ol>`;
}
function faqHtml(items) {
  return `<div class="faq s-faq">${items.map((it, i) => `<details class="faq__item s-faq__item" data-reveal style="--i:${i % 4}"${i === 0 ? ' open' : ''}>
<summary class="faq__q s-faq__q"><span>${esc(it.q)}</span>${icon('plus', 's-faq__ico')}</summary>
<div class="faq__a s-faq__a prose">${it.html}</div>
</details>`).join('\n')}</div>`;
}
function stepsHtml(steps) {
  return `<ol class="s-steps" role="list">${steps.map((s, i) => {
    const m = String(s.title || '').match(/^(steps*d+s*:?)s*(.*)$/i);
    const title = m ? `<span class="s-step__label">${esc(m[1])}</span> ${esc(m[2])}` : esc(s.title || '');
    const ico = s.icon && !/lettersnumbers/i.test(s.icon.src) ? `<span class="s-step__ico">${img({ src: s.icon.src, alt: '', w: s.icon.w, h: s.icon.h }, { sizes: '72px' })}</span>` : '';
    return `<li class="s-step" data-reveal style="--i:${i}"><div class="glass glass--lift s-step__card">
<span class="s-step__top"><span class="numeral s-step__n" aria-hidden="true">${i + 1}</span>${ico}</span>
${s.label ? `<p class="s-step__label">${esc(s.label)}</p>` : ''}
${s.title ? `<h3 class="s-step__t">${title}</h3>` : ''}
${s.body}
</div></li>`;
  }).join('')}</ol>`;
}

function blockHtml(ctx, b, opts = {}) {
  switch (b.type) {
    case 'p': return `<p>${rw(b.html)}</p>`;
    case 'h1': return `<h2 class="display s-h2">${esc(b.text)}</h2>`;
    case 'h2': return `<h2 class="display s-h2">${esc(b.text)}</h2>`;
    case 'h3': return `<h3 class="s-h3">${esc(b.text)}</h3>`;
    case 'h4': return `<h4 class="s-h4">${esc(b.text)}</h4>`;
    case 'ul': case 'ol': return listHtml(b);
    case 'img': return `<figure class="s-fig${opts.icon ? ' s-fig--icon' : ''}">${img({ src: b.src, alt: altOf(b), w: b.w, h: b.h }, { sizes: opts.icon ? '140px' : '(min-width: 1024px) 480px, 90vw' })}</figure>`;
    case 'button': return b.text ? `<div class="btn-row s-btns">${btn(b.href || menu(ctx), b.text, opts.btnCls || 'btn btn--sun')}</div>` : '';
    case 'quote': return `<blockquote class="s-bq">${b.html ? rw(b.html) : esc(b.text || '')}${b.cite ? `<footer>${esc(b.cite)}</footer>` : ''}</blockquote>`;
    case 'faq': return faqHtml((b.items || []).map((it) => ({ q: it.q, html: rw(it.a_html) })));
    case 'icon-box': return `<div class="glass glass--lift s-ibox">${b.title ? `<h3 class="s-h3">${esc(b.title)}</h3>` : ''}${b.html ? `<div>${rw(b.html)}</div>` : ''}</div>`;
    case 'form': return demoForm({ fields: (b.fields || []).map((f) => (typeof f === 'string' ? f : f.label || f.name || '')).filter(Boolean), button: b.button || 'Submit' }) + (b.consent ? `<p class="s-small">${rw(b.consent)}</p>` : '');
    case 'embed': return b.kind === 'map' && b.src ? `<p class="s-maplink"><a class="link-arrow"${linkAttrs(String(b.src).replace(/&output=embed/, ''))}>${icon('pin', 's-maplink__ico')}Open the map${extIco()}</a></p>` : b.note ? `<p class="s-small">${esc(b.note)}</p>` : '';
    case 'table': return `<table class="s-table"><tbody>${(b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${rw(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'hours': return `<div class="glass glass--lift s-hourscard">${b.title ? `<h3 class="s-hourscard__t">${icon('clock', 's-hourscard__ico')}${esc(b.title)}</h3>` : ''}<table class="s-table s-table--hours"><tbody>${(b.rows || (b.lines || []).map((l) => [l])).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'review': return `<figure class="rcard glass"><blockquote>${esc(b.text)}</blockquote><figcaption>${esc(b.name)}${b.platform ? ', ' + esc(b.platform) : ''}</figcaption></figure>`;
    case 'video': return '';
    default: return b.html ? `<div>${rw(b.html)}</div>` : b.text ? `<p>${esc(b.text)}</p>` : '';
  }
}

// group a section's blocks into renderable pieces: FAQ runs (h3/h4 question + answer blocks) under an FAQ heading,
// step runs ("Step 1:" labels, or "How it works" headings), offer lists, tier ladders, the rest as prose.
function piecesOf(sec) {
  const bl = sec.blocks || [];
  const head = sec.heading || '';
  const faqSec = /\bfaqs?\b/i.test(head) || bl.some((b) => /^h[23]$/.test(b.type) && /\bfaqs?\b/i.test(b.text || ''));
  const stepSec = /how it works|step/i.test(head) || bl.some((b) => /^h[2-4]$|^p$/.test(b.type) && /^step\s*\d+/i.test(text(b.text || b.html)));
  const pieces = [];
  let i = 0;
  while (i < bl.length) {
    const b = bl[i];
    // a FAQ question: an h3/h4 ending in "?" followed by answer blocks
    if (faqSec && /^h[34]$/.test(b.type) && /\?\s*$/.test(b.text || '')) {
      const items = [];
      while (i < bl.length && /^h[34]$/.test(bl[i].type) && /\?\s*$/.test(bl[i].text || '')) {
        const q = bl[i].text;
        const ans = [];
        i++;
        while (i < bl.length && !/^h[2-4]$/.test(bl[i].type) && bl[i].type !== 'button') { ans.push(bl[i]); i++; }
        items.push({ q, blocks: ans });
      }
      pieces.push({ kind: 'faq', items });
      continue;
    }
    if (b.type === 'faq') { pieces.push({ kind: 'faqblock', b }); i++; continue; }
    // steps: "Step N:" label (+ title heading) + body, or (in a "how it works" section) h3/h4 title + body
    const isLabel = (x) => x && /^step\s*\d+\s*:?$/i.test(text(x.text || x.html));
    const stepStart = (k) => isLabel(bl[k]) || (bl[k] && /^h[34]$/.test(bl[k].type) && !TIER.test(text(bl[k].text))) || (bl[k] && bl[k].type === 'img' && bl[k + 1] && (isLabel(bl[k + 1]) || /^h[34]$/.test(bl[k + 1].type)));
    if (stepSec && stepStart(i)) {
      const steps = [];
      while (i < bl.length && stepStart(i)) {
        const st = { label: '', title: '', icon: null, blocks: [] };
        let j = i;
        if (bl[j].type === 'img') { st.icon = bl[j]; j++; }
        if (isLabel(bl[j])) { st.label = text(bl[j].text || bl[j].html); j++; }
        if (j < bl.length && /^h[2-4]$/.test(bl[j].type) && !isLabel(bl[j])) { st.title = bl[j].text; j++; }
        if (!st.label && !st.title) break;
        while (j < bl.length && (bl[j].type === 'p' || bl[j].type === 'ul') && !isLabel(bl[j])) { st.blocks.push(bl[j]); j++; }
        steps.push(st);
        i = j;
      }
      if (steps.length) { pieces.push({ kind: 'steps', steps }); continue; }
    }
    // reward tiers: a run of tier headings ("100 Points = $5 Off") or a list of them
    if (/^h[2-4]$/.test(b.type) && TIER.test(text(b.text))) {
      const rungs = [];
      while (i < bl.length && /^h[2-4]$/.test(bl[i].type) && TIER.test(text(bl[i].text))) { rungs.push(esc(bl[i].text)); i++; }
      pieces.push({ kind: 'ladder', rungs, tag: 'h3' });
      continue;
    }
    if (isTierList(b)) { pieces.push({ kind: 'ladder', rungs: b.items.map(itemHtml), tag: 'p' }); i++; continue; }
    if (isShortList(b)) {
      const lead = [bl[i - 1], bl[i - 2]].find((x) => x && (x.type === 'p' || /^h[2-4]$/.test(x.type)));
      const leadTxt = lead ? text(lead.text || lead.html) : '';
      if (OFFER_LEAD.test(leadTxt) || OFFER_LEAD.test(head)) { pieces.push({ kind: 'offers', b }); i++; continue; }
    }
    if (b.type === 'img') { pieces.push({ kind: 'img', b }); i++; continue; }
    if (b.type === 'button') {
      const run = [];
      while (i < bl.length && bl[i].type === 'button') { run.push(bl[i]); i++; }
      pieces.push({ kind: 'buttons', run });
      continue;
    }
    pieces.push({ kind: 'block', b });
    i++;
  }
  return pieces;
}

function piecesHtml(ctx, pieces, { night = false } = {}) {
  const faqs = [];
  const special = pieces.some((p) => /^(faq|faqblock|steps|ladder|offers)$/.test(p.kind));
  const html = pieces.map((p) => {
    if (p.kind === 'faq') {
      const items = p.items.map((it) => ({ q: it.q, html: it.blocks.map((b) => blockHtml(ctx, b)).join('') }));
      faqs.push(...items);
      return faqHtml(items);
    }
    if (p.kind === 'faqblock') {
      const items = (p.b.items || []).map((it) => ({ q: it.q, html: rw(it.a_html) }));
      faqs.push(...items);
      return faqHtml(items);
    }
    if (p.kind === 'steps') return stepsHtml(p.steps.map((s) => ({ ...s, body: (s.blocks || []).map((b) => blockHtml(ctx, b)).join('') })));
    if (p.kind === 'ladder') return ladderHtml(p.rungs, p.tag);
    if (p.kind === 'offers') return offersHtml(p.b);
    if (p.kind === 'img') return blockHtml(ctx, p.b, { icon: special });
    if (p.kind === 'buttons') return `<div class="btn-row s-btns">${p.run.map((b, i) => btn(b.href || menu(ctx), b.text, i === 0 ? 'btn btn--sun' : night ? 'btn btn--glass' : 'btn btn--deco')).join('')}</div>`;
    return blockHtml(ctx, p.b);
  }).join('\n');
  return { html, faqs };
}

// mood stills for sections without a photo of their own (never captioned as Lady L's store, staff or products)
const POOL = ['g-hf-mirror', 'g-hf-arch', 'g-edibles', 'g-prerolls', 'g-flower', 'g-vapes'];
const HERO_IMG = { 'jersey-city-weed-deals': 'g-hf-mirror', 'jersey-city-420-discounts-day': 'g-prerolls', rewards: 'g-hf-arch', 'refer-a-friend': 'g-edibles' };
const KICKER = { 'jersey-city-weed-deals': 'Deals', 'jersey-city-420-discounts-day': '420 Deals', rewards: 'Rewards', 'refer-a-friend': 'Refer a friend' };
const CUTS = { 'jersey-city-weed-deals': 'g-leaf-cut', 'jersey-city-420-discounts-day': 'g-bud-cut', rewards: 'g-moon-cut', 'refer-a-friend': 'g-pampas-cut' };

function capturedPage(ctx, slug) {
  const rec = ctx.content[slug];
  const path = rec.path || '/' + slug + '/';
  const h1 = String(rec.h1 || '').trim();
  const crumbs = [{ label: 'Home', href: '/' }, { label: pageName(rec) || h1 }];
  const secs = (rec.sections || []).map((s) => ({ ...s, blocks: (s.blocks || []).slice() }));
  // the hero takes the section that carries the H1: its leading paragraphs and buttons (Lady L's own words)
  let heroSec = secs.find((s) => String(s.heading || '').trim() === h1 || (s.blocks || []).some((b) => b.type === 'h1'));
  if (!heroSec && secs.length && !(secs[0].heading || '').trim()) heroSec = secs[0];
  const heroLine = [];
  const heroCtas = [];
  const heroSub = [];
  let heroPhoto = null;
  if (heroSec) {
    const next = secs[secs.indexOf(heroSec) + 1];
    if (next && !String(next.heading || '').trim() && next.blocks.length <= 2 && next.blocks.every((b) => b.type === 'p' || b.type === 'button')) {
      heroSec.blocks = heroSec.blocks.concat(next.blocks);
      next.blocks = [];
    }
    const rest = [];
    for (const b of heroSec.blocks) {
      if (b.type === 'h1' || (/^h[1-4]$/.test(b.type) && String(b.text || '').trim() === h1)) continue;
      if (/^h[2-4]$/.test(b.type) && !heroSub.length && !rest.length && !heroLine.length) { heroSub.push(b); continue; }
      if (b.type === 'p' && heroLine.length < 2 && !rest.length) { heroLine.push(b); continue; }
      if (b.type === 'button' && heroCtas.length < 2 && !rest.length) { heroCtas.push(b); continue; }
      if (b.type === 'img' && !heroPhoto) { heroPhoto = b; continue; }
      rest.push(b);
    }
    heroSec.blocks = rest;
    heroSec.heading = '';
  }
  const photoOf = (b, sizes, eager = false) => img({ src: b.src, alt: altOf(b), w: b.w, h: b.h }, { sizes, eager });
  const media = heroArch(heroPhoto ? photoOf(heroPhoto, '(min-width: 1024px) 440px, 76vw', true) : gimg(HERO_IMG[slug] || 'g-hf-arch', { eager: true, alt: '', sizes: '(min-width: 1024px) 440px, 76vw' }), { cut: CUTS[slug] });
  const faqs = [];
  let pool = 0;
  let side = 0;
  const body = secs.filter((s) => (s.blocks || []).length || (s.heading || '').trim()).map((s, si) => {
    const head = String(s.heading || '').trim();
    const dupHead = head && s.blocks.some((b) => /^h[1-4]$/.test(b.type) && String(b.text || '').trim() === head);
    const pieces = piecesOf(s);
    const night = si % 3 === 1;
    const ground = night ? 'band--night' : si % 2 ? 'band--linen' : 'band--cream';
    const { html, faqs: f } = piecesHtml(ctx, pieces, { night });
    faqs.push(...f);
    const kinds = new Set(pieces.map((p) => p.kind));
    const special = kinds.has('faq') || kinds.has('faqblock') || kinds.has('steps') || kinds.has('ladder') || kinds.has('offers');
    const imgs = pieces.filter((p) => p.kind === 'img');
    const prose = pieces.filter((p) => p.kind === 'block' && p.b.type === 'p').length;
    const headHtml = head && !dupHead ? `<h2 class="display s-h2">${esc(head)}</h2>` : '';
    // alternating text + arch rows for prose sections; special structures get the full width on a calm ground
    let aside = '';
    if (!special && imgs.length === 0 && prose >= 2) aside = `<figure class="arch s-row__arch" data-tilt="3"><span class="arch__img">${gimg(POOL[pool++ % POOL.length], { alt: '', sizes: '(min-width: 1024px) 420px, 80vw' })}</span></figure>`;
    const flip = aside ? (side++ % 2 ? ' s-row--flip' : '') : '';
    const id = s.id && /^[a-z][\w-]*$/i.test(s.id) ? ` id="${escA(slug + '-' + s.id)}"` : '';
    if (aside) {
      return `<section class="band ${ground} s-sec s-row${flip}"${id}>
${night ? clip('<span class="s-sec__glow"></span>') : ''}
<div class="wrap s-row__grid">
<div class="s-row__text prose" data-reveal>${headHtml}${html}</div>
<div class="s-row__media" data-reveal style="--i:1">${aside}</div>
</div>
</section>`;
    }
    return `<section class="band ${ground} s-sec${special ? ' s-sec--wide' : ''}"${id}>
${night ? clip('<span class="s-sec__glow"></span>') : ''}
<div class="wrap${special ? '' : ' wrap--narrow'} s-sec__inner">
<div class="s-sec__body prose" data-reveal>${headHtml}${html}</div>
</div>
</section>`;
  });
  // the first content band gets the overhang padding
  if (body.length) body[0] = body[0].replace('class="band ', 'class="band s-after ');
  const lineHtml = heroSub.map((b) => `<h2 class="s-hero__sub">${esc(b.text)}</h2>`).join('') + heroLine.map((b) => `<p>${rw(b.html)}</p>`).join('');
  const ctas = heroCtas.length ? heroCtas.map((b, i) => btn(b.href || menu(ctx), b.text, i ? 'btn btn--glass' : 'btn btn--sun')).join('') : '';
  const main = `${hero({ crumbs, kicker: KICKER[slug] || '', h1: esc(h1 || pageName(rec)), line: lineHtml, ctas, media, cls: 's-hero--page s-hero--' + slug })}
${body.join('\n')}`;
  const firstP = blocksOf(rec).find((b) => b.type === 'p');
  const description = rec.description || (firstP ? text(firstP.html).replace(/^(.{40,155}?[.!?])\s.*$/, '$1') : pageName(rec));
  const jsonld = faqs.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: text(f.html) } })) }] : [];
  return out(ctx, { path, title: rec.title || pageName(rec) + TAIL, description, crumbs, bodyClass: 'page-captured page-' + slug, main, jsonld });
}

export async function render(ctx) {
  candidates.cache = null;
  const all = cats(ctx);
  const pages = [productsPage(ctx), ...all.map((c) => categoryPage(ctx, c, all))];
  for (const slug of CAPTURED) if (ctx.content[slug]) pages.push(capturedPage(ctx, slug));
  return pages;
}
