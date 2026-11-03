// learn.mjs - LEARN lane ("Lavender Parlor"): /blog/ (Lady L's blog page words + the post hub), every /blog/<slug>/
// post (article template), /education/ (NEW hub), /education/<slug>/ for every ctx.learn guide, /cannabis-guide/
// (Lady L's guide, every word, its form as demoForm()). Lane classes are prefixed n-; FOUNDATION's component classes
// (.page-hero, .arch, .acard, .glass, .btn, .kicker, .prose, .band...) are used as is. No cross-lane imports.
// Paths: a post path is returned DECODED (the build writes that directory name, e.g. the emoji post); every href to
// it is percent-encoded with encodeURI so it resolves on any static host.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, escA, href, linkAttrs, gimg, img, stripTags, hasGenerated, imgUrl, rewriteLinks, liveHref, menu, demoForm } from './util.mjs';
import { page, icon, crumbsHtml } from './shell.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORG = 'Lady L Cannabis';
const SUFFIX = 'LADY L CANNABIS';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
const ymd = (iso) => String(iso || '').slice(0, 10);
const wordCount = (html) => stripTags(html).split(/\s+/).filter(Boolean).length;
const readMin = (html) => Math.max(1, Math.round(wordCount(html) / 225));
function clip(s, n = 150) {
  const t = stripTags(s).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 2);
  const i = cut.lastIndexOf(' ');
  return (i > n / 2 ? cut.slice(0, i) : cut).replace(/[\s,;:.]+$/, '') + '…';
}
const decPath = (p) => { const s = String(p || ''); try { return decodeURI(s); } catch { return s; } };
const encPath = (p) => encodeURI(decPath(p));
const abs = (ctx, p) => ctx.site.origin + encPath(href(p));
const localFile = (src) => {
  const s = String(src || '').split(/[?#]/)[0];
  if (!s.startsWith('/assets/')) return false;
  try { return fs.existsSync(path.join(ROOT, decodeURI(s).slice(1))); } catch { return false; }
};
const pickGen = (...ids) => ids.find((id) => hasGenerated(id)) || ids[ids.length - 1];
// CAPTURE's map of live upload URLs to the local copies under assets/photos/ll/ (read only)
const LIVE_RE = /^https?:\/\/(?:www\.)?ladyljerseycity\.com/i;
const ASSETS = (() => {
  const out = new Map();
  try {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts/asset-map.json'), 'utf8'));
    for (const im of m.images || []) for (const s of im.sources || []) out.set(String(s).replace(LIVE_RE, '').toLowerCase(), { src: '/' + String(im.file).replace(/^\//, ''), w: im.w, h: im.h });
  } catch { /* no map yet: live URLs fall back to generated art */ }
  return out;
})();
// a captured photo reference (string or { src, alt, w, h }) that exists under /assets/ (directly or through the asset
// map), else null
function photoOf(im) {
  if (!im) return null;
  const o = typeof im === 'string' ? { src: im } : { ...im };
  if (!o.src) return null;
  o.src = String(o.src).replace(LIVE_RE, '');
  if (localFile(o.src)) return o;
  const hit = ASSETS.get(o.src.split(/[?#]/)[0].toLowerCase());
  if (hit && localFile(hit.src)) return { ...o, src: hit.src, w: o.w || hit.w, h: o.h || hit.h };
  return null;
}
const firstImg = (html) => { const m = String(html || '').match(/<img\b[^>]*\ssrc="([^"]+)"[^>]*>/i); if (!m) return null; const alt = (m[0].match(/\salt="([^"]*)"/i) || [])[1] || ''; return { src: m[1], alt: stripTags(alt) }; };
const media = (ph, gen, opts = {}) => (ph
  ? img({ src: ph.src, alt: ph.alt || '', w: ph.w, h: ph.h }, { ...opts, alt: opts.alt != null ? opts.alt : ph.alt || '' })
  : gimg(gen, { alt: '', ...opts, alt: opts.alt != null ? opts.alt : '' }));

// ---------- trusted captured html: D4 link rule, old classes and inline styles dropped, h1 demoted, images lazy ----------
function prose(html) {
  let h = rewriteLinks(String(html || ''));
  h = h.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  h = h.replace(/\s(?:class|style)=("[^"]*"|'[^']*')/gi, '');
  h = h.replace(/<h1(\s[^>]*)?>/gi, (m, a) => `<h2${a || ''}>`).replace(/<\/h1>/gi, '</h2>');
  h = h.replace(/<img\b([^>]*?)\s*\/?>/gi, (m, a) => {
    const src = (a.match(/\ssrc="([^"]+)"/i) || [])[1];
    const alt = stripTags((a.match(/\salt="([^"]*)"/i) || [])[1] || '');
    const ph = src ? photoOf(src) : null;
    if (ph) return img({ src: ph.src, w: ph.w, h: ph.h }, { alt, sizes: '(min-width: 860px) 720px, 92vw' });
    return `<img${a}${/\salt=/i.test(a) ? '' : ' alt=""'}${/\sloading=/i.test(a) ? '' : ' loading="lazy"'}${/\sdecoding=/i.test(a) ? '' : ' decoding="async"'}>`;
  });
  h = h.replace(/<a\b([^>]*?)\shref="(https?:[^"]+)"([^>]*)>/gi, (m, pre, u, post) => (/\starget=/i.test(pre + post) ? m : `<a${pre} href="${u}"${post} target="_blank" rel="noopener">`));
  h = h.replace(/<p>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '');
  return h;
}

// ---------- small pieces ----------
const arch = (inner, mod = '') => `<figure class="arch n-arch${mod ? ' ' + mod : ''}"><span class="arch__img">${inner}</span></figure>`;

function hero({ crumbs, kicker, title, meta = '', lede = '', ctas = '', art = '', mod = '' }) {
  return `<section class="page-hero n-hero${mod ? ' ' + mod : ''}" data-sunburst aria-labelledby="n-title">
<div class="band__clip n-hero__clip" aria-hidden="true"><span class="n-hero__glow"></span><span class="grain"></span></div>
<div class="wrap page-hero__inner n-hero__inner">
<div class="page-hero__text n-hero__text">
${crumbsHtml(crumbs)}
${kicker ? `<p class="kicker n-hero__kicker">${kicker}</p>` : ''}
<h1 class="display n-hero__title" id="n-title">${title}</h1>
${meta ? `<p class="n-meta n-hero__meta">${meta}</p>` : ''}
${lede ? `<p class="page-hero__lede lede n-hero__lede">${lede}</p>` : ''}
${ctas ? `<div class="btn-row n-hero__ctas">${ctas}</div>` : ''}
</div>
${art ? `<div class="page-hero__art n-hero__art" data-tilt>${art}</div>` : ''}
</div>
</section>`;
}

function head({ kicker, title, id, line = '', mod = '' }) {
  return `<header class="n-head${mod ? ' ' + mod : ''}" data-reveal>${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h2 class="display n-head__title" id="${escA(id)}">${title}</h2>${line ? `<p class="lede n-head__line">${line}</p>` : ''}</header>`;
}
const clipOf = (mod = '') => `<div class="band__clip" aria-hidden="true">${mod ? `<span class="n-ground ${mod}"></span>` : ''}<span class="grain"></span></div>`;

// ---------- items + cards (.acard is the whole link: FOUNDATION lifts a.acard on hover) ----------
const CARD_SIZES = '(min-width: 1180px) 380px, (min-width: 700px) 45vw, 80vw';
// listed = the /blog/ page's captured loop items by decoded path (Lady L's own card image + title)
function postItem(p, listed = new Map()) {
  const dpath = decPath(href(p.pathDecoded || p.path || `/blog/${p.slug}/`));
  const hit = listed.get(dpath) || null;
  const title = stripTags(p.h1 || (hit && hit.title) || String(p.title || '').replace(/\s*\|\s*LADY L CANNABIS\s*$/i, ''));
  const ph = photoOf(p.image) || photoOf(p.ogImage) || photoOf(hit && hit.img) || photoOf(firstImg(p.html));
  if (ph && !ph.alt) ph.alt = (p.image && p.image.alt) || (hit && hit.img && hit.img.alt) || '';
  return { kind: 'post', slug: p.fileSlug || p.slug, path: dpath, link: encodeURI(dpath), title, date: p.date, dateText: p.dateText || (hit && hit.dateText) || fmtDate(p.date), excerpt: clip(p.excerpt || p.description || p.html || ''), ph, gen: 'g-haze', minutes: readMin(p.html), more: 'Read More' };
}
const GUIDE_ART = { 'cannabis-101': 'g-flower', 'recreational-cannabis': 'g-prerolls', 'medical-cannabis': 'g-tinctures' };
function guideItem(g) {
  const p = href(g.path || `/education/${g.slug}/`);
  return { kind: 'guide', slug: g.slug, path: p, link: p, title: g.title, kicker: g.kicker || 'Guide', excerpt: g.description || clip(g.lede || ''), ph: null, gen: g.image || GUIDE_ART[g.slug] || 'g-flower', minutes: g.readMinutes, more: 'Read the guide' };
}
const GUIDE_CARD = { kind: 'guide', slug: 'cannabis-guide', path: '/cannabis-guide/', link: '/cannabis-guide/', title: 'The Lady L Cannabis Guide', kicker: 'Lady L’s guide', excerpt: 'Flower fundamentals, the classic categories and alternative cannabinoids, in Lady L’s own words.', ph: null, gen: 'g-guide', minutes: 0, more: 'Read the guide' };

function metaOf(it) {
  if (it.kind === 'guide') return `<span>${esc(it.kicker)}</span>${it.minutes ? `<span>${esc(it.minutes)} min read</span>` : ''}`;
  return `<time datetime="${escA(ymd(it.date))}">${esc(it.dateText)}</time>`;
}
function card(it, { i = 0, h = 'h3', sizes = CARD_SIZES, excerpt = true } = {}) {
  return `<li class="n-grid__item" data-reveal style="--i:${i % 6}"><a class="acard n-card${it.kind === 'guide' ? ' n-card--guide' : ''}"${linkAttrs(it.link)}>
<span class="acard__media n-card__media">${media(it.ph, it.gen, { sizes, alt: '' })}</span>
<span class="acard__body n-card__body">
<span class="acard__meta n-card__meta">${metaOf(it)}</span>
<${h} class="acard__title n-card__title">${esc(it.title)}</${h}>
${excerpt && it.excerpt ? `<span class="n-card__excerpt">${esc(it.excerpt)}</span>` : ''}
<span class="acard__more link-arrow n-card__more">${esc(it.more)}${icon('arrow')}</span>
</span>
</a></li>`;
}
const grid = (items, opts = {}) => `<ul class="n-grid${opts.cols ? ' n-grid--' + opts.cols : ''}${opts.swipe === false ? '' : ' n-grid--swipe'}" role="list">${items.map((it, i) => card(it, { i, ...opts })).join('\n')}</ul>`;

// ---------- the shop band closing every post: Lady L's own service labels, both to the live menu ----------
function shopBand(ctx) {
  const a = ctx.site.address || {};
  const svc = (ctx.ia.topbar && ctx.ia.topbar.services) || [];
  const del = svc.find((s) => s.icon === 'truck') || { label: 'Order for Delivery', info: '/service/' };
  const pick = svc.find((s) => s.icon === 'bag') || { label: 'Order for Pickup', info: '/in-store-pickup/' };
  return `<section class="band band--sun n-shop" data-sunburst aria-labelledby="n-shop-title">
<div class="band__clip" aria-hidden="true"><span class="n-shop__glow"></span><span class="grain"></span></div>
<div class="wrap n-shop__wrap">
<div class="glass n-shop__box" data-reveal data-spot>
<p class="kicker">Delivery or pickup</p>
<h2 class="display n-shop__title" id="n-shop-title">Shop the Lady L <em>menu</em></h2>
<p class="n-shop__line">Order online, then choose delivery or in-store pickup at ${esc(a.streetShort || a.street)}, ${esc(a.city)}.</p>
<div class="btn-row"><a class="btn btn--sun"${linkAttrs(menu(ctx))}>${icon('truck')}${esc(del.label)}</a><a class="btn btn--glass"${linkAttrs(menu(ctx))}>${icon('bag')}${esc(pick.label)}</a></div>
<p class="n-shop__more"><a class="link-arrow"${linkAttrs(del.info || '/service/')}>About delivery${icon('arrow')}</a><a class="link-arrow"${linkAttrs(pick.info || '/in-store-pickup/')}>About pickup${icon('arrow')}</a></p>
</div>
<span class="n-shop__cut" data-depth="0.12" aria-hidden="true">${gimg('g-moon-cut', { alt: '', cls: 'cut', sizes: '(min-width: 1024px) 240px, 120px' })}</span>
</div>
</section>`;
}

const orgLd = (ctx) => ({ '@type': 'Organization', name: ORG, url: ctx.site.origin + '/' });
const titleOf = (t) => `${t} | ${SUFFIX}`;

// ---------- captured blocks (pages/<slug>.json) ----------
function capBlock(ctx, b) {
  switch (b.type) {
    case 'p': return `<p>${prose(b.html)}</p>`;
    case 'h1': case 'h2': case 'h3': case 'h4': { const t = b.type === 'h1' || b.type === 'h2' ? 'h3' : b.type === 'h3' ? 'h3' : 'h4'; return `<${t} class="n-cap__h">${esc(b.text)}</${t}>`; }
    case 'ul': case 'ol': return `<${b.type} class="n-cap__list">${(b.items || []).map((x) => `<li>${prose(typeof x === 'string' ? x : x.html || esc(x.text || ''))}</li>`).join('')}</${b.type}>`;
    case 'img': { const ph = photoOf(b); if (!ph) return ''; const im = img({ src: ph.src, alt: b.alt || '', w: b.w, h: b.h }, { sizes: '(min-width: 1024px) 360px, 60vw', alt: b.alt || '' }); return `<figure class="n-cap__img">${b.href ? `<a${linkAttrs(liveHref(b.href))}>${im}</a>` : im}</figure>`; }
    case 'button': return `<p class="n-cap__btn"><a class="btn btn--sun"${linkAttrs(liveHref(b.href || '#'))}>${esc(b.text)}${/^https?:/i.test(liveHref(b.href || '')) ? icon('ext', 'ico--ext') : icon('arrow')}</a></p>`;
    case 'quote': return `<blockquote class="n-cap__quote">${b.html ? prose(b.html) : esc(b.text || '')}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`;
    case 'faq': return `<div class="faq n-cap__faq">${(b.items || []).map((q) => `<details><summary>${esc(q.q)}</summary><div class="faq__a">${prose(q.a_html || '')}</div></details>`).join('')}</div>`;
    case 'icon-box': { const ph = photoOf(b.icon); return `<div class="n-box">${ph ? `<span class="n-box__icon">${img({ src: ph.src, alt: '' }, { alt: '', sizes: '96px' })}</span>` : ''}${b.title ? `<h3 class="n-box__title">${esc(b.title)}</h3>` : ''}${b.html ? `<div class="n-box__text">${prose(b.html)}</div>` : ''}${b.href ? `<a class="link-arrow"${linkAttrs(liveHref(b.href))}>${esc(b.button || 'Learn more')}${icon('arrow')}</a>` : ''}</div>`; }
    case 'form': {
      const fields = (b.fields || []).map((f) => (typeof f === 'string' ? f : f.label || f.name || f.placeholder || '')).filter(Boolean);
      let f = demoForm({ fields: fields.length ? fields : ['Email Address'], button: (typeof b.button === 'string' ? b.button : b.button && b.button.text) || 'Sign up', cls: 'n-cap__form' });
      if (b.consent) f = f.replace('<button', `<label class="demo-form__check"><input type="checkbox" name="consent"> <span>${esc(stripTags(b.consent))}</span></label>\n<button`);
      return f;
    }
    case 'embed': return b.note ? `<p class="n-cap__note">${esc(b.note)}</p>` : '';
    case 'table': return `<div class="n-cap__table"><table>${(b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${esc(stripTags(c))}</td>`).join('')}</tr>`).join('')}</table></div>`;
    case 'hours': return `<ul class="hours">${(b.rows || []).map((r) => `<li><span class="hours__d">${esc(r[0] || '')}</span><span class="hours__t">${esc(r.slice(1).join(' '))}</span></li>`).join('')}</ul>`;
    case 'review': return `<blockquote class="n-cap__quote"><p>${esc(b.text || '')}</p><cite>${esc(b.name || '')}</cite></blockquote>`;
    default: return b.html ? `<p>${prose(b.html)}</p>` : b.text ? `<p>${esc(b.text)}</p>` : '';
  }
}
// render a run of blocks: consecutive icon-boxes become a card grid, consecutive buttons one button row
function capBlocks(ctx, blocks) {
  const out = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === 'icon-box') {
      const run = [];
      while (i < blocks.length && blocks[i].type === 'icon-box') run.push(blocks[i++]);
      out.push(`<div class="n-boxes n-boxes--${Math.min(run.length, 4)}">${run.map((x, k) => `<div class="glass glass--cream glass--lift n-boxes__item" data-reveal style="--i:${k}">${capBlock(ctx, x)}</div>`).join('')}</div>`);
      continue;
    }
    if (b.type === 'button') {
      const run = [];
      while (i < blocks.length && blocks[i].type === 'button') run.push(blocks[i++]);
      out.push(`<div class="btn-row n-cap__btns">${run.map((x) => capBlock(ctx, x).replace(/^<p class="n-cap__btn">|<\/p>$/g, '')).join('')}</div>`);
      continue;
    }
    out.push(capBlock(ctx, b));
    i++;
  }
  return out.join('\n');
}

// ---------- /blog/ ----------
function blogHub(ctx, items) {
  const rec = (ctx.content || {}).blog || { sections: [] };
  const path = '/blog/';
  const allBlocks = (rec.sections || []).flatMap((s) => s.blocks || []);
  const h1 = rec.h1 || ((allBlocks.find((b) => /^h[1-3]$/.test(b.type)) || {}).text) || 'Our Blog';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: path }];
  const feat = items[0];
  const rest = items.slice(1);
  const art = arch(gimg(pickGen('g-hf-arch', 'g-hero-parlor'), { alt: '', sizes: '(min-width: 1024px) 380px, 46vw', eager: true }), 'n-arch--hero');
  const ctas = `${feat ? `<a class="btn btn--sun" href="#n-latest">Read the latest${icon('arrow')}</a>` : ''}<a class="btn btn--glass"${linkAttrs('/education/')}>Cannabis Education</a>`;
  const featHtml = feat ? `<section class="band band--cream n-feat-band" id="n-latest" aria-labelledby="n-feat-title">
${clipOf('n-ground--cream')}
<div class="wrap">
<article class="n-feat" data-reveal>
<a class="arch arch--wide n-feat__media"${linkAttrs(feat.link)} tabindex="-1" aria-hidden="true"><span class="arch__img">${media(feat.ph, feat.gen, { sizes: '(min-width: 1024px) 720px, 92vw', alt: '' })}</span></a>
<div class="glass glass--cream glass--lift n-feat__body">
<p class="kicker">Latest post</p>
<p class="n-meta n-feat__meta"><time datetime="${escA(ymd(feat.date))}">${esc(feat.dateText)}</time><span>${esc(feat.minutes)} min read</span></p>
<h2 class="display n-feat__title" id="n-feat-title"><a${linkAttrs(feat.link)}>${esc(feat.title)}</a></h2>
${feat.excerpt ? `<p class="n-feat__excerpt">${esc(feat.excerpt)}</p>` : ''}
<a class="btn btn--sun"${linkAttrs(feat.link)}>Read More${icon('arrow')}</a>
</div>
</article>
</div>
</section>` : '';
  const listHtml = rest.length ? `<section class="band band--linen n-list-band" aria-labelledby="n-all">
${clipOf()}
<div class="wrap">
${head({ kicker: 'Every post', title: 'More from the <em>blog</em>', id: 'n-all', line: 'Guides, neighborhood news and stories, newest first.' })}
${grid(rest, { swipe: false, cols: 3 })}
</div>
</section>` : '';
  const main = `${hero({ crumbs, kicker: 'The Lady L Blog', title: esc(h1), lede: 'Guides, neighborhood news and stories from Lady L Cannabis on the West Side of Jersey City.', ctas, art, mod: 'n-hero--blog' })}
${featHtml}
${listHtml}`;
  const title = rec.title || titleOf('Blog');
  const description = rec.description || 'The Lady L Cannabis blog: cannabis guides, neighborhood news and stories from the West Side of Jersey City, NJ.';
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: abs(ctx, path), heroCrumbs: true, crumbs,
      og: { title, description, type: 'website', url: abs(ctx, path) },
      bodyClass: 'n-page n-page--blog', main,
      jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: h1, url: abs(ctx, path), publisher: orgLd(ctx), blogPost: items.map((it) => ({ '@type': 'BlogPosting', headline: it.title, datePublished: it.date, url: abs(ctx, it.path) })) },
    }),
  };
}

// ---------- every post ----------
function postPage(ctx, p, it, items) {
  const path = it.path;
  const can = abs(ctx, path);
  // the current crumb is the post's own page name (its captured head title without the site suffix)
  const pageName = stripTags(String(p.title || '').replace(/\s*\|\s*LADY L CANNABIS\s*$/i, '')).trim() || it.title;
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: pageName, href: it.link }];
  const art = arch(media(it.ph, it.gen, { sizes: '(min-width: 1024px) 400px, 56vw', eager: true, alt: it.ph ? it.ph.alt || '' : '' }), 'n-arch--hero n-arch--post');
  const meta = `<time datetime="${escA(ymd(p.date))}">${esc(it.dateText)}</time><span>${esc(it.minutes)} min read</span><span>By ${esc(ORG)}</span>`;
  const idx = items.findIndex((x) => x.path === path);
  const keep = [...items.slice(idx + 1), ...items.slice(0, Math.max(0, idx))].filter((x) => x.path !== path).slice(0, 3);
  // Lady L's own Previous Post / Next Post links (captured as p.adjacent)
  const adj = (p.adjacent || []).filter((a) => a && a.href && a.label).map((a) => ({ ...a, link: encPath(liveHref(a.href)) }));
  const pn = adj.length ? `<nav class="n-pn" aria-label="Previous and next posts">${adj.map((a) => `<a class="glass glass--cream glass--lift n-pn__link${/next/i.test(a.label) ? ' n-pn__link--next' : ''}"${linkAttrs(a.link)}><span class="n-pn__dir">${esc(a.label)}</span><span class="n-pn__title">${esc(a.title || '')}</span></a>`).join('')}</nav>` : '';
  const main = `${hero({ crumbs, kicker: 'The Lady L Blog', title: esc(it.title), meta, art, mod: 'n-hero--article n-hero--post' })}
<section class="band band--cream n-body" aria-label="Article">
${clipOf('n-ground--cream')}
<div class="wrap n-body__wrap">
<article class="prose n-prose">
${prose(p.html)}
</article>
${pn}
<p class="n-back"><a class="link-arrow"${linkAttrs('/blog/')}>${icon('arrow', 'n-back__ico')}All posts</a></p>
</div>
</section>
${keep.length ? `<section class="band band--linen n-more-band" aria-labelledby="n-keep">
${clipOf()}
<div class="wrap">
${head({ kicker: 'More from Lady L', title: 'Keep <em>reading</em>', id: 'n-keep' })}
${grid(keep, { cols: 3 })}
</div>
</section>` : ''}
${shopBand(ctx)}`;
  const image = it.ph ? ctx.site.origin + encodeURI(it.ph.src) : hasGenerated(it.gen) ? ctx.site.origin + imgUrl(it.gen, 1440) : null;
  const title = p.title || titleOf(it.title);
  const description = p.description || clip(p.excerpt || p.html, 158);
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: can, heroCrumbs: true, crumbs,
      og: { title, description, type: 'article', url: can, ...(image ? { image } : {}) },
      bodyClass: 'n-page n-page--post', main,
      jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: it.title, description, datePublished: p.date, dateModified: p.modified || p.date, ...(image ? { image } : {}), mainEntityOfPage: can, author: orgLd(ctx), publisher: orgLd(ctx) },
    }),
  };
}

// ---------- /education/ ----------
function eduHub(ctx, guideItems, eduPosts) {
  const path = '/education/';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Education', href: path }];
  const first = guideItems[0];
  const ctas = `${first ? `<a class="btn btn--sun"${linkAttrs(first.link)}>Start with ${esc(first.title.split(':')[0])}${icon('arrow')}</a>` : ''}<a class="btn btn--glass"${linkAttrs('/cannabis-guide/')}>The Lady L Cannabis Guide</a>`;
  const art = arch(gimg(pickGen('g-hf-mirror', 'g-sunburst-wall'), { alt: '', sizes: '(min-width: 1024px) 380px, 46vw', eager: true }), 'n-arch--hero');
  const guidesHtml = guideItems.length ? `<section class="band band--cream n-guides-band" id="n-guides" aria-labelledby="n-guides-h">
${clipOf('n-ground--cream')}
<div class="wrap">
${head({ kicker: 'Guides', title: 'Learn the <em>basics</em>, then the rules', id: 'n-guides-h', line: 'Plain-language guides. Every New Jersey legal point links to its official source.' })}
<ul class="n-features" role="list">
${guideItems.map((it, i) => `<li class="n-features__item" data-reveal style="--i:${i}"><a class="glass glass--cream glass--lift n-feature"${linkAttrs(it.link)}>
<span class="arch n-feature__arch"><span class="arch__img">${gimg(it.gen, { alt: '', sizes: '(min-width: 1024px) 340px, 80vw' })}</span></span>
<span class="n-feature__body">
<span class="kicker n-feature__kicker">${esc(it.kicker)}</span>
<h3 class="display n-feature__title">${esc(it.title)}</h3>
<span class="n-feature__text">${esc(it.excerpt)}</span>
<span class="n-meta n-feature__meta">${it.minutes ? `<span>${esc(it.minutes)} min read</span>` : ''}<span>By ${esc(ORG)}</span></span>
<span class="link-arrow n-feature__more">Read the guide${icon('arrow')}</span>
</span>
</a></li>`).join('\n')}
</ul>
</div>
</section>` : '';
  const guideBand = `<section class="band band--night n-gband" aria-labelledby="n-gband-h">
${clipOf('n-ground--night')}
<div class="wrap n-gband__wrap">
<a class="arch arch--rainbow n-gband__arch"${linkAttrs('/cannabis-guide/')} tabindex="-1" aria-hidden="true" data-tilt><span class="arch__img">${gimg('g-guide', { alt: '', sizes: '(min-width: 1024px) 420px, 70vw' })}</span></a>
<div class="n-gband__text" data-reveal>
<p class="kicker">Lady L’s own guide</p>
<h2 class="display n-gband__title" id="n-gband-h">The Lady L Cannabis <em>Guide</em></h2>
<p class="lede">Flower fundamentals, the classic categories and alternative cannabinoids, in Lady L’s own words.</p>
<div class="btn-row"><a class="btn btn--sun"${linkAttrs('/cannabis-guide/')}>Read the guide${icon('arrow')}</a><a class="btn btn--glass"${linkAttrs(menu(ctx, 'flower'))}>Shop Flower${icon('ext', 'ico--ext')}</a></div>
</div>
</div>
</section>`;
  const postsHtml = eduPosts.length ? `<section class="band band--linen n-edu-posts" aria-labelledby="n-edu-posts-h">
${clipOf()}
<div class="wrap">
${head({ kicker: 'Lady L’s own posts', title: 'From the Lady L <em>blog</em>', id: 'n-edu-posts-h' })}
${grid(eduPosts, { cols: eduPosts.length >= 5 ? 5 : eduPosts.length, excerpt: false, sizes: '(min-width: 1180px) 230px, (min-width: 700px) 30vw, 80vw' })}
<p class="n-all"><a class="link-arrow"${linkAttrs('/blog/')}>All posts${icon('arrow')}</a></p>
</div>
</section>` : '';
  const main = `${hero({ crumbs, kicker: 'Education', title: 'Cannabis <em>Education</em>', lede: 'Plain-language guides from Lady L Cannabis, with the New Jersey rules linked to their official sources.', ctas, art, mod: 'n-hero--edu' })}
${guidesHtml}
${guideBand}
${postsHtml}`;
  const title = titleOf('Cannabis Education');
  const description = 'Cannabis education from Lady L Cannabis in Jersey City, NJ: a Cannabis 101 guide, New Jersey adult-use and medical cannabis guides with official sources, and Lady L’s Cannabis Guide.';
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: abs(ctx, path), heroCrumbs: true, crumbs,
      og: { title, description, type: 'website', url: abs(ctx, path) },
      bodyClass: 'n-page n-page--edu', main,
      jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Cannabis Education', url: abs(ctx, path), isPartOf: { '@type': 'WebSite', name: ORG, url: ctx.site.origin + '/' }, hasPart: guideItems.map((it) => ({ '@type': 'Article', headline: it.title, url: abs(ctx, it.path) })) },
    }),
  };
}

// ---------- /education/<slug>/ ----------
function guidePage(ctx, g, it, guideItems) {
  const path = it.path;
  const can = abs(ctx, path);
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Education', href: '/education/' }, { label: String(g.title).split(':')[0], href: path }];
  const facts = new Map(((ctx.nj && ctx.nj.facts) || []).map((f) => [f.id, f]));
  const sources = new Map(((ctx.nj && ctx.nj.sources) || []).map((s) => [s.id, s]));
  const used = new Map();
  const ids = new Set();
  const uid = (t) => { const base = String(t).toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'; let id = base; let n = 2; while (ids.has(id)) id = `${base}-${n++}`; ids.add(id); return id; };
  const factsHtml = (b) => {
    const rows = (b.ids || []).map((id) => facts.get(id)).filter(Boolean).map((f) => {
      const s = sources.get(f.sourceId);
      if (s) used.set(s.url, { label: s.title, url: s.url, publisher: s.publisher });
      return `<li class="n-facts__item"><span class="n-facts__text">${esc(f.statement)}</span>${s ? ` <a class="n-facts__src"${linkAttrs(s.url)}>${esc(s.title)}${icon('ext', 'n-facts__ico')}<span class="n-sr"> (official source, opens in a new tab)</span></a>` : ''}</li>`;
    });
    return rows.length ? `<aside class="n-facts" aria-label="From official New Jersey sources"><p class="n-facts__label">${icon('id', 'n-facts__badge')}From official New Jersey sources</p><ul class="n-facts__list" role="list">${rows.join('')}</ul></aside>` : '';
  };
  const block = (b) => {
    switch (b.type) {
      case 'p': return `<p>${prose(b.html)}</p>`;
      case 'ul': case 'ol': return `<${b.type}>${(b.items || []).map((x) => `<li>${prose(typeof x === 'string' ? x : x.html || esc(x.text || ''))}</li>`).join('')}</${b.type}>`;
      case 'callout': return `<aside class="n-callout">${b.title ? `<p class="n-callout__title">${esc(b.title)}</p>` : ''}${b.html ? `<p>${prose(b.html)}</p>` : ''}${Array.isArray(b.items) ? `<ul>${b.items.map((x) => `<li>${prose(x)}</li>`).join('')}</ul>` : ''}</aside>`;
      case 'facts': return factsHtml(b);
      case 'h3': case 'h4': return `<${b.type}>${esc(b.text)}</${b.type}>`;
      default: return b.html ? `<p>${prose(b.html)}</p>` : b.text ? `<p>${esc(b.text)}</p>` : '';
    }
  };
  const secs = (g.sections || []).filter((s) => s && (s.heading || (s.blocks || []).length)).map((s) => ({ ...s, id: uid(s.heading || 'section') }));
  const body = secs.map((s) => `<section class="n-sec" aria-labelledby="${escA(s.id)}">
${s.heading ? `<h2 id="${escA(s.id)}">${esc(s.heading)}</h2>` : ''}
${(s.blocks || []).map(block).join('\n')}
</section>`).join('\n');
  // sources: the guide's own list first, then any official page a fact block cites that the list does not name
  const srcList = [];
  const seen = new Set();
  for (const s of g.sources || []) { if (!s || !s.url || seen.has(s.url)) continue; seen.add(s.url); srcList.push({ label: s.label || s.title || s.url, url: s.url }); }
  for (const s of used.values()) { if (seen.has(s.url)) continue; seen.add(s.url); srcList.push({ label: `${s.label} (${s.publisher})`, url: s.url }); }
  const srcId = srcList.length ? uid('sources') : '';
  const srcHtml = srcList.length ? `<section class="n-sec n-sec--sources" aria-labelledby="${srcId}">
<h2 id="${srcId}">Sources</h2>
<ol class="n-sources">${srcList.map((s) => `<li><a${linkAttrs(s.url)}>${esc(s.label)}${/^https?:/i.test(s.url) ? icon('ext', 'n-facts__ico') : ''}</a></li>`).join('')}</ol>
${ctx.nj && ctx.nj.retrieved ? `<p class="n-sources__note">Official New Jersey pages checked on ${esc(fmtDate(ctx.nj.retrieved))}.</p>` : ''}
</section>` : '';
  const toc = [...secs.filter((s) => s.heading).map((s) => ({ id: s.id, text: s.heading })), ...(srcId ? [{ id: srcId, text: 'Sources' }] : [])];
  const tocHtml = toc.length >= 3 ? `<nav class="glass glass--cream n-toc" aria-labelledby="n-toc-title"><p class="n-toc__title" id="n-toc-title">In this guide</p><ol class="n-toc__list">${toc.map((t, i) => `<li><a href="#${escA(t.id)}"><span class="n-toc__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${esc(t.text)}</span></a></li>`).join('')}</ol></nav>` : '';
  const note = 'Educational content, not medical or legal advice.';
  const related = [...guideItems.filter((x) => x.path !== path), GUIDE_CARD].slice(0, 3);
  const meta = `<span>By ${esc(ORG)}</span>${g.readMinutes ? `<span>${esc(g.readMinutes)} min read</span>` : ''}`;
  const art = arch(gimg(it.gen, { alt: '', sizes: '(min-width: 1024px) 400px, 56vw', eager: true }), 'n-arch--hero');
  const main = `${hero({ crumbs, kicker: esc(g.kicker || 'Education'), title: esc(g.title), meta, lede: g.lede ? esc(stripTags(g.lede)) : '', art, mod: 'n-hero--article n-hero--guide' })}
<section class="band band--cream n-body n-body--guide${tocHtml ? ' n-body--toc' : ''}" aria-label="Guide">
${clipOf('n-ground--cream')}
<div class="wrap n-body__wrap">
${tocHtml}
<article class="prose n-prose">
<p class="n-note" role="note">${icon('id', 'n-note__ico')}<span>${esc(note)}</span></p>
${body}
${srcHtml}
</article>
</div>
</section>
${related.length ? `<section class="band band--linen n-more-band" aria-labelledby="n-rel">
${clipOf()}
<div class="wrap">
${head({ kicker: 'Keep learning', title: 'More <em>guides</em>', id: 'n-rel' })}
${grid(related, { cols: 3 })}
<p class="n-all"><a class="link-arrow"${linkAttrs('/education/')}>All education${icon('arrow')}</a></p>
</div>
</section>` : ''}`;
  const image = hasGenerated(it.gen) ? ctx.site.origin + imgUrl(it.gen, 1440) : null;
  const title = g.seoTitle || titleOf(g.title);
  const description = g.description || clip(g.lede || '', 158);
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: can, heroCrumbs: true, crumbs,
      og: { title, description, type: 'article', url: can, ...(image ? { image } : {}) },
      bodyClass: 'n-page n-page--guide', main,
      jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description, datePublished: g.date, dateModified: g.modified || g.date, ...(image ? { image } : {}), mainEntityOfPage: can, author: orgLd(ctx), publisher: orgLd(ctx) },
    }),
  };
}

// ---------- /cannabis-guide/ (Lady L's guide: every captured word, alternating DAY / NIGHT sections) ----------
function cannabisGuide(ctx, rec) {
  const path = '/cannabis-guide/';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Education', href: '/education/' }, { label: 'Cannabis Guide', href: path }];
  const secs = (rec && rec.sections) || [];
  const h1 = (rec && rec.h1) || 'The Lady L Cannabis Guide';
  const same = (a, b) => String(a || '').trim() === String(b || '').trim();
  // the H1 section carries Lady L's kicker line and her archway photo: they become the hero's kicker and art
  const top = secs.find((s) => same(s.heading, h1)) || { blocks: [] };
  const kickB = (top.blocks || []).find((b) => b.type === 'p' && b.role === 'kicker');
  const topImg = photoOf((top.blocks || []).find((b) => b.type === 'img'));
  const ctas = `<a class="btn btn--sun"${linkAttrs(menu(ctx, 'flower'))}>Shop Flower${icon('ext', 'ico--ext')}</a><a class="btn btn--glass"${linkAttrs('/education/')}>Cannabis Education</a>`;
  const art = arch(topImg ? img({ src: topImg.src, w: topImg.w, h: topImg.h }, { alt: '', sizes: '(min-width: 1024px) 380px, 46vw', eager: true }) : gimg('g-guide', { alt: '', sizes: '(min-width: 1024px) 380px, 46vw', eager: true }), 'n-arch--hero');
  const topRest = (top.blocks || []).filter((b) => b !== kickB && b.type !== 'img');
  const GROUNDS = ['band--cream', 'band--night', 'band--linen', 'band--plum'];
  // a section's blocks split at every image: the first run is the intro, each later run (image + words + button)
  // becomes one card; Lady L's round iconography sits in a medallion
  const medal = (b) => { const ph = photoOf(b); return ph ? `<span class="n-box__icon">${img({ src: ph.src, w: ph.w, h: ph.h }, { alt: '', sizes: '96px' })}</span>` : ''; };
  const cardHtml = (g, k, night) => `<div class="glass ${night ? '' : 'glass--cream '}glass--lift n-boxes__item" data-reveal style="--i:${k}"><div class="n-box">${g.img ? medal(g.img) : ''}${capBlocks(ctx, g.blocks)}</div></div>`;
  let k = 0;
  const body = secs.filter((s) => s !== top).map((s, i) => {
    const blocks = (s.blocks || []).filter((b) => !(b.type === 'h1' && same(b.text, h1)));
    if (!blocks.length && !s.heading) return '';
    const ground = GROUNDS[k++ % GROUNDS.length];
    const night = /night|plum/.test(ground);
    const id = 'n-cg-' + (i + 1);
    const groups = [];
    let cur = null;
    for (const b of blocks) {
      if (b.type === 'img') { cur = { img: b, blocks: [] }; groups.push(cur); continue; }
      if (!cur) { cur = { img: null, blocks: [] }; groups.push(cur); }
      cur.blocks.push(b);
    }
    const intro = groups[0] && (groups.length === 1 || groups[1].img) ? groups[0] : null;
    const cards = groups.slice(intro ? 1 : 0).filter((g) => g.blocks.length);
    const asCards = cards.length >= 2;
    const introBlocks = intro ? intro.blocks : [];
    // a FAQ block of short topics reads as cards too (each question stays a heading)
    const faq = introBlocks.find((b) => b.type === 'faq');
    const introHtml = capBlocks(ctx, introBlocks.filter((b) => b !== faq && !(b.type === 'embed')));
    const faqHtml = faq ? `<div class="n-boxes n-boxes--${Math.min((faq.items || []).length, 4)}">${(faq.items || []).map((q, j) => `<div class="glass ${night ? '' : 'glass--cream '}glass--lift n-boxes__item" data-reveal style="--i:${j}"><div class="n-box"><span class="n-box__num numeral" aria-hidden="true">${String(j + 1).padStart(2, '0')}</span><h3 class="n-box__title">${esc(q.q)}</h3><div class="n-box__text">${prose(q.a_html || '')}</div></div></div>`).join('')}</div>` : '';
    const embed = blocks.find((b) => b.type === 'embed' && b.kind === 'map');
    const mapLink = embed ? `<p class="n-cap__btn"><a class="btn btn--glass"${linkAttrs(ctx.site.mapUrl || '#')}>${icon('pin')}Open the map${icon('ext', 'ico--ext')}</a></p>` : '';
    const lone = !asCards && !intro ? groups.flatMap((g) => g.blocks) : [];
    const loneImg = !asCards ? (groups.find((g) => g.img) || {}).img : null;
    return `<section class="band ${ground} n-cg${asCards ? ' n-cg--cards' : ' n-cg--text'}" aria-labelledby="${id}">
${clipOf(night ? 'n-ground--night' : 'n-ground--cream')}
<div class="wrap n-cg__wrap">
<div class="n-cg__intro" data-reveal>
${(intro && intro.img) || (!asCards && loneImg) ? medal((intro && intro.img) || loneImg) : ''}
${s.heading ? `<h2 class="display n-cg__title" id="${id}">${esc(s.heading)}</h2>` : `<h2 class="n-sr" id="${id}">${esc(h1)}</h2>`}
<div class="n-cg__body">
${introHtml}
${!asCards && !intro ? capBlocks(ctx, lone.filter((b) => b.type !== 'embed')) : ''}
${!asCards && intro ? capBlocks(ctx, cards.flatMap((g) => g.blocks).filter((b) => b.type !== 'embed')) : ''}
${mapLink}
</div>
</div>
${faqHtml}
${asCards ? `<div class="n-boxes n-boxes--${Math.min(cards.length, 4)}">${cards.map((g, j) => cardHtml(g, j, night)).join('')}</div>` : ''}
</div>
</section>`;
  }).join('\n');
  const main = `${hero({ crumbs, kicker: kickB ? prose(kickB.html) : 'Education', title: esc(h1), lede: 'Flower fundamentals, the classic categories and alternative cannabinoids, in Lady L’s own words.', ctas, art, mod: 'n-hero--cg' })}
${topRest.length ? `<section class="band band--cream n-cg"><div class="wrap">${capBlocks(ctx, topRest)}</div></section>` : ''}
${body}`;
  const title = (rec && rec.title) || titleOf('Cannabis Guide');
  const description = (rec && rec.description) || 'The Lady L Cannabis Guide: flower fundamentals, Indica, Sativa and Hybrid, and alternative cannabinoids.';
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: abs(ctx, path), heroCrumbs: true, crumbs,
      og: { title, description, type: 'article', url: abs(ctx, path), ...(hasGenerated('g-guide') ? { image: ctx.site.origin + imgUrl('g-guide', 1440) } : {}) },
      bodyClass: 'n-page n-page--cg', main,
      jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: stripTags(h1), mainEntityOfPage: abs(ctx, path), author: orgLd(ctx), publisher: orgLd(ctx) },
    }),
  };
}

export async function render(ctx) {
  const posts = (ctx.posts || []).filter((p) => p && (p.path || p.slug) && (p.h1 || p.title)).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const listed = new Map();
  for (const s of (((ctx.content || {}).blog || {}).sections || [])) for (const b of s.blocks || []) if (b.type === 'loop') for (const x of b.items || []) if (x && x.href) listed.set(decPath(liveHref(x.href)), x);
  const items = posts.map((p) => postItem(p, listed));
  const guides = (ctx.learn || []).filter((g) => g && g.slug && g.title && Array.isArray(g.sections));
  const guideItems = guides.map(guideItem);
  const EDU = ['what-is-thc', 'what-are-cannabis-trichomes', 'how-to-dose-edibles', 'cannabis-glossary', 'cannabis-for-beginners-a-warm-no-pressure-guide-to-your-first-time'];
  const eduPosts = EDU.map((s) => items.find((x) => x.slug === s || x.path === `/blog/${s}/`)).filter(Boolean);

  const out = [blogHub(ctx, items)];
  posts.forEach((p, i) => out.push(postPage(ctx, p, items[i], items)));
  out.push(eduHub(ctx, guideItems, eduPosts));
  guides.forEach((g, i) => out.push(guidePage(ctx, g, guideItems[i], guideItems)));
  out.push(cannabisGuide(ctx, (ctx.content || {})['cannabis-guide']));
  return out;
}
