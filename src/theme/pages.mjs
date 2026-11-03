// pages.mjs - PAGES lane (Lady L redesign pitch, "Lavender Parlor"): /about-us/ /about-us/reviews/ /faq/ /community/
// /events/ /events/<slug>/ /contact-us/ /privacy-policy/ /terms-of-service/ /accessibility/ /404.html
// (/sitemap/ is sitemap.mjs). Captured pages print EVERY block of src/content/pages/<slug>.json (inline HTML as captured,
// every <a href> routed through util.rewriteLinks); the head keeps the captured title and description. New words are
// neutral glue only (labels, one-line intros, buttons, empty states). Classes: contract classes + the p- prefix.
import fs from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import * as shell from './shell.mjs';
import * as U from './util.mjs';

const { page, crumbsHtml, icon } = shell;
const { esc, escA, linkAttrs, isExternal, gimg, img, stripTags, absUrl, menu, demoForm, slugify } = U;
const rewrite = U.rewriteLinks || ((h) => String(h ?? ''));
const live = U.liveHref || U.href;
const ROOT = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '../..');
// "upcoming" = an event starting on or after this day (the pitch date)
const TODAY = '2026-11-04';

// ---------- small helpers ----------
const HOME = { href: '/', label: 'Home' };
const ABOUT = { href: '/about-us/', label: 'About Us' };
const norm = (s) => stripTags(String(s ?? '')).replace(/\s+/g, ' ').trim().toLowerCase();
const kicker = (t, cls = '') => (t ? `<p class="kicker p-kick ${cls}">${esc(t)}</p>` : '');
const extIcon = (u) => (isExternal(u) && !/^(tel|mailto):/i.test(u) ? icon('ext') : icon('arrow'));
const btn = (u, label, cls = 'btn--sun', extra = {}) => `<a class="btn ${cls}"${linkAttrs(u, extra)}>${label}</a>`;
const arrow = (u, label, cls = '') => `<a class="link-arrow ${cls}"${linkAttrs(u)}>${esc(label)}${extIcon(u)}</a>`;

// a Lady L photo: captured src (root-absolute /assets/photos/ll/..., or the live wp-content URL, mapped to the downloaded
// copy by file name); a placeholder slot when the file is not on disk yet (never throws: CAPTURE may still be writing)
function localSrc(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  if (s.startsWith('/assets/')) return s;
  const m = s.match(/\/wp-content\/uploads\/.*\/([^/?#]+)$/i);
  if (m) {
    const cand = '/assets/photos/ll/' + decodeURIComponent(m[1]);
    if (fs.existsSync(nodePath.join(ROOT, cand))) return cand;
  }
  return s;
}
const onDisk = (src) => src.startsWith('/assets/') && fs.existsSync(nodePath.join(ROOT, decodeURIComponent(src.split(/[?#]/)[0])));
function pic(ref, opts = {}) {
  const r = typeof ref === 'string' ? { src: ref } : ref || {};
  const src = localSrc(r.src || r.url || '');
  const alt = opts.alt != null ? opts.alt : r.alt || '';
  if (src && onDisk(src) && !/\.gif$/i.test(src)) return img({ src, alt, w: r.w, h: r.h }, { ...opts, alt });
  // a GIF keeps its animation: the build copies it as is (no WebP variants), served locally
  if (src && onDisk(src)) return `<img${U.attrs({ class: opts.cls, src, alt, width: r.w, height: r.h, loading: opts.eager ? 'eager' : 'lazy', decoding: 'async' })}>`;
  const remote = /^https?:/i.test(src) ? src : r.orig && /^https?:/i.test(r.orig) ? r.orig : '';
  if (remote) return `<img${U.attrs({ class: opts.cls, src: remote, alt, width: r.w, height: r.h, loading: opts.eager ? 'eager' : 'lazy', decoding: 'async' })}>`;
  return `<span class="img-slot ${opts.cls || ''}"${alt ? ` role="img" aria-label="${escA(alt)}"` : ' aria-hidden="true"'}></span>`;
}
const hasPic = (ref) => { const r = typeof ref === 'string' ? { src: ref } : ref || {}; const s = localSrc(r.src || r.url || ''); return !!s && onDisk(s); };
const absImg = (ctx, ref) => { const r = typeof ref === 'string' ? { src: ref } : ref || {}; const s = localSrc(r.src || ''); return !s ? '' : /^https?:/i.test(s) ? s : ctx.site.origin + s; };

const blocksOf = (rec) => (rec.sections || []).flatMap((s) => s.blocks || []);
function captured(ctx, slug) { return (ctx.content || {})[slug] || null; }

// ---------- generic block renderer (every captured block type; nothing is dropped) ----------
function table(rows) {
  if (!rows || !rows.length) return '';
  return `<div class="p-table"><table><tbody>${rows.map((r) => `<tr>${(Array.isArray(r) ? r : [r]).map((c) => `<td>${rewrite(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function formHtml(b, id = '') {
  const fields = (b.fields || []).map((f) => (typeof f === 'string' ? f : f.label || f.name || ''));
  let html = demoForm({ id, fields, button: b.button || 'Send', cls: 'p-form' });
  // a captured textarea field stays a textarea
  (b.fieldTypes || []).forEach((t, i) => {
    if (!t || t.type !== 'textarea') return;
    const name = slugify(fields[i] || '');
    html = html.replace(new RegExp(`<input class="demo-form__input" type="text" name="${name}"[^>]*>`), `<textarea class="demo-form__input demo-form__textarea" name="${name}" rows="5"></textarea>`);
  });
  if (b.consent) html = html.replace('<button', `<label class="demo-form__check"><input type="checkbox" name="consent"> <span>${rewrite(b.consent)}</span></label>\n<button`);
  return html;
}
function rcard(b, i = 0) {
  const n = Math.max(0, Math.min(5, Math.round(Number(b.rating) || 0)));
  return `<article class="rcard p-rcard" data-reveal style="--i:${i % 3}">
${n ? `<p class="rcard__stars p-rcard__stars" aria-label="${n} out of 5 stars">${Array.from({ length: n }, () => icon('star', 'p-star')).join('')}</p>` : ''}
<blockquote class="rcard__quote p-rcard__quote"><p>${esc(b.text)}</p></blockquote>
<p class="rcard__name p-rcard__name">${esc(b.name)}</p>
${b.platform ? `<p class="rcard__platform p-rcard__platform">${icon('google')}<span>Posted on ${esc(b.platform)}</span></p>` : ''}
</article>`;
}
function faqHtml(items, { open = -1 } = {}) {
  return `<div class="faq p-faqlist">${(items || []).map((it, j) => `<details${j === open ? ' open' : ''}><summary>${esc(it.q)}</summary><div class="p-faq__a">${rewrite(it.a_html)}</div></details>`).join('\n')}</div>`;
}
function block(b, o = {}) {
  const t = b.type;
  switch (t) {
    case 'p': return b.html || b.text ? `<p${b.role === 'kicker' ? ' class="p-capkick"' : ''}>${b.html != null ? rewrite(b.html) : esc(b.text)}</p>` : '';
    case 'h1': if (o.h1 && norm(b.text) === norm(o.h1)) return ''; return `<h2${o.ids ? ` id="${escA(o.ids(b.text))}"` : ''}>${esc(b.text)}</h2>`;
    case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const n = Math.min(6, Math.max(2, Number(t[1]) + (o.shift || 0)));
      return `<h${n}${o.ids ? ` id="${escA(o.ids(b.text))}"` : ''}>${esc(b.text)}</h${n}>`;
    }
    case 'ul': case 'ol': return `<${t}>${(b.items || []).map((it) => `<li>${typeof it === 'string' ? rewrite(it) : rewrite(it.html || esc(it.text || ''))}</li>`).join('')}</${t}>`;
    case 'img': {
      const fig = pic(b, { sizes: o.imgSizes || '(min-width: 1024px) 640px, 92vw', alt: b.alt && !/^unnamed$/i.test(b.alt) ? b.alt : '', cls: 'p-imgblock__img' });
      return b.href ? `<p class="p-imgblock"><a${linkAttrs(live(b.href))}>${fig}</a></p>` : `<figure class="p-imgblock">${fig}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'video': return b.src ? `<figure class="p-imgblock"><video src="${escA(localSrc(b.src))}"${b.poster ? ` poster="${escA(localSrc(b.poster))}"` : ''} controls muted playsinline preload="none"${b.w ? ` width="${b.w}" height="${b.h}"` : ''}></video></figure>` : '';
    case 'button': return `<p class="p-btnline">${btn(live(b.href), `${esc(b.text)}${extIcon(live(b.href))}`, o.btnCls || 'btn--glass')}</p>`;
    case 'quote': return `<blockquote class="p-quote">${b.html ? rewrite(b.html) : `<p>${esc(b.text)}</p>`}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`;
    case 'faq': return faqHtml(b.items);
    case 'review': return rcard(b);
    case 'icon-box': return `<div class="p-ibox">${b.title ? `<h3 class="p-ibox__t">${esc(b.title)}</h3>` : ''}${b.html ? `<div class="p-ibox__b">${rewrite(b.html)}</div>` : ''}</div>`;
    case 'form': return formHtml(b);
    case 'embed': return mapLink(o.ctx, b);
    case 'table': case 'hours': return table(b.rows);
    case 'card': return `<div class="p-ibox">${b.title ? `<h3 class="p-ibox__t">${esc(b.title)}</h3>` : ''}${b.html ? `<div class="p-ibox__b">${rewrite(b.html)}</div>` : b.text ? `<p>${esc(b.text)}</p>` : ''}</div>`;
    case 'loop': return '';
    default: {
      const txt = [b.title, b.text, b.html].filter(Boolean).join(' ');
      return txt ? `<p>${rewrite(txt)}</p>` : '';
    }
  }
}
const blocksHtml = (list, o = {}) => (list || []).map((b) => block(b, o)).filter(Boolean).join('\n');

// a captured map embed becomes a link (no third-party iframe): the site's map link, the captured note as its label
function mapLink(ctx, b = {}) {
  const S = (ctx && ctx.site) || {};
  const a = S.address || {};
  const u = S.mapUrl || (b.src || '').replace(/&output=embed/, '');
  return `<a class="p-maplink glass glass--cream glass--lift"${linkAttrs(u)}><span class="p-maplink__pin" aria-hidden="true">${icon('pin')}</span><span class="p-maplink__body"><span class="p-maplink__t">Open the map</span><span class="p-maplink__s">${esc(a.street || '')}, ${esc(a.city || '')}, ${esc(a.state || '')} ${esc(a.zip || '')}</span></span>${icon('ext')}</a>`;
}

// ---------- page wrapper ----------
function out(ctx, { path, title, description, crumbs, main, mod, jsonld = [], image = '', noPrefooter = false }) {
  return {
    path,
    html: page({
      ctx, path, title, description, canonical: absUrl(ctx, encodeURI(path)),
      og: { title, description, type: mod === 'event' ? 'article' : 'website', url: absUrl(ctx, encodeURI(path)), image: image || '' },
      jsonld, bodyClass: `p-page p-page--${mod}`, main, crumbs, heroCrumbs: true, noPrefooter, noTrio: noPrefooter,
    }),
  };
}

// the adopted inner-page hero: a NIGHT title band with sunburst rays (crumbs, kicker, H1, one line, CTAs) and ONE
// protrusion: the arch photo on the right overhanging the hero's bottom edge into the next band
function hero({ crumbs, kick, title, lede = '', ctas = [], media = '', mod = '', meta = '' }) {
  return `<section class="page-hero p-hero ${mod}">
<div class="band__clip p-hero__clip" aria-hidden="true" data-sunburst><span class="p-hero__glow"></span><span class="grain"></span></div>
<div class="wrap page-hero__inner p-hero__grid${media ? '' : ' page-hero__inner--solo'}">
<div class="page-hero__text p-hero__text">
${crumbsHtml(crumbs)}
${kick ? `<p class="kicker p-kick" data-reveal>${esc(kick)}</p>` : ''}
<h1 class="display p-hero__title" data-reveal style="--i:1">${title}</h1>
${meta}
${lede ? `<p class="lede p-hero__lede" data-reveal style="--i:2">${lede}</p>` : ''}
${ctas.length ? `<div class="btn-row p-hero__ctas" data-reveal style="--i:3">${ctas.join('')}</div>` : ''}
</div>
${media ? `<div class="page-hero__art p-hero__media" data-reveal style="--i:2">${media}</div>` : ''}
</div>
</section>`;
}
const heroArch = (inner, cls = '') => `<figure class="arch p-hero__arch ${cls}" data-depth="0.06"><span class="arch__img">${inner}</span></figure>`;
const heroPic = (ref, alt = '', cls = '') => heroArch(pic(ref, { alt, eager: true, sizes: '(min-width: 1024px) 420px, (min-width: 700px) 40vw, 64vw', cls: 'p-hero__img' }), cls);
const heroCut = (id, cls = '') => `<span class="cut p-hero__cut ${cls}" data-depth="0.1" aria-hidden="true">${gimg(id, { alt: '', eager: true, sizes: '(min-width: 1024px) 380px, 50vw', cls: 'p-hero__cutimg' })}</span>`;
const h1Html = (rec) => {
  const h = String(rec.h1 || '');
  const sec = (rec.sections || []).find((s) => s.headingAccent && norm(s.heading) === norm(h));
  if (sec && h.includes(sec.headingAccent)) { const i = h.indexOf(sec.headingAccent); return esc(h.slice(0, i)) + '<em>' + esc(sec.headingAccent) + '</em>' + esc(h.slice(i + sec.headingAccent.length)); }
  return esc(h);
};

// an alternating content row: text column + media (arch photo / emblem / cut-out), sides and grounds alternate
function row({ id = '', ground = 'cream', side = 'l', kick = '', heading = '', body = '', media = '', mod = '' }) {
  const hid = id ? `${id}-h` : '';
  return `<section class="band band--${ground} p-row p-row--${side} ${mod}"${id ? ` id="${escA(id)}"` : ''}${heading && hid ? ` aria-labelledby="${escA(hid)}"` : ''}>
<div class="band__clip" aria-hidden="true"><span class="grain"></span>${ground === 'night' || ground === 'plum' ? '<span class="p-row__rays"></span>' : '<span class="p-row__botanical"></span>'}</div>
<div class="wrap p-row__grid${media ? '' : ' p-row__grid--solo'}">
<div class="p-row__text" data-reveal>
${kicker(kick)}
${heading ? `<h2 class="display p-row__h"${hid ? ` id="${escA(hid)}"` : ''}>${heading}</h2>` : ''}
<div class="prose p-row__prose">${body}</div>
</div>
${media ? `<div class="p-row__media" data-reveal style="--i:1">${media}</div>` : ''}
</div>
</section>`;
}
const archFig = (ref, { alt = '', cls = '', depth = '0.05' } = {}) => `<figure class="arch p-arch ${cls}" data-depth="${depth}"><span class="arch__img">${pic(ref, { alt, sizes: '(min-width: 1024px) 460px, 80vw', cls: 'p-arch__img' })}</span></figure>`;
const emblem = (ref, alt = '') => `<figure class="p-emblem glass glass--cream" data-tilt>${pic(ref, { alt, sizes: '(min-width: 1024px) 320px, 60vw', cls: 'p-emblem__img' })}</figure>`;
const isEmblem = (b) => /logo|iconography|icon/i.test(String(b.src || '') + ' ' + String(b.orig || ''));

// the section's own heading, printed once (skipped when a block repeats it, or when it is the page H1)
function secHeading(s, rec) {
  const head = String(s.heading || '').trim();
  if (!head) return '';
  if (norm(head) === norm(rec.h1)) return '';
  if ((s.blocks || []).some((b) => [b.text, b.title].some((t) => typeof t === 'string' && norm(t) === norm(head)))) return '';
  return esc(head);
}

// ---------- /about-us/ ----------
function about(ctx) {
  const c = captured(ctx, 'about-us');
  if (!c) return null;
  const path = '/about-us/';
  const crumbs = [HOME, { href: path, label: 'About Us' }];
  const S = c.sections || [];
  const first = S[0] || { blocks: [] };
  const kick = (first.blocks.find((b) => b.role === 'kicker') || {}).html || 'About Us';
  const ledeB = first.blocks.filter((b) => b.type === 'p' && b.role !== 'kicker');
  const allImgs = blocksOf(c).filter((b) => b.type === 'img');
  const photos = allImgs.filter((b) => !isEmblem(b));
  const heroImg = photos[0] || allImgs[0];
  const used = new Set();
  const rows = [];
  let k = 0;
  const grounds = ['cream', 'night', 'linen', 'night', 'cream', 'plum', 'linen'];
  const homeRec = captured(ctx, 'home');
  // the founder and mom-and-pop story (Lady L's own words from the home page), placed after "Our Purpose"
  const homeStory = homeRec ? (homeRec.sections || []).filter((s) => /west side up|mom\s*&(amp;)?\s*pop/i.test(s.heading || '')) : [];

  const pushRow = (s, opts = {}) => {
    const imgs = (s.blocks || []).filter((b) => b.type === 'img');
    const rest = (s.blocks || []).filter((b) => b.type !== 'img' && !(opts.skip && opts.skip(b)));
    let media = '';
    if (imgs.length === 1 && isEmblem(imgs[0])) media = emblem(imgs[0]);
    else if (imgs.length) media = `<div class="p-archs p-archs--${Math.min(imgs.length, 2)}">${imgs.slice(0, 2).map((b, i) => archFig(b, { alt: b.alt && !/^unnamed$/i.test(b.alt) ? b.alt : '', cls: i ? 'p-arch--b' : 'p-arch--a', depth: i ? '-0.04' : '0.05' })).join('')}</div>${imgs.slice(2).map((b) => block(b, { ctx })).join('')}`;
    else if (opts.media) media = opts.media;
    imgs.forEach((b) => used.add(b.src));
    let body = '';
    const faqB = rest.find((b) => b.type === 'faq');
    if (faqB && opts.cards) {
      // the core values: each a glass card (title + its line), not an accordion
      body = blocksHtml(rest.filter((b) => b !== faqB), { ctx }) + `<ul class="p-values" role="list">${faqB.items.map((it, i) => `<li class="p-value glass glass--cream glass--lift" data-reveal style="--i:${i % 3}"><span class="numeral p-value__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="p-value__t">${esc(it.q)}</h3><div class="p-value__b">${rewrite(it.a_html)}</div></li>`).join('')}</ul>`;
    } else body = blocksHtml(rest, { ctx, btnCls: opts.btnCls });
    rows.push(row({ id: opts.id || s.id, ground: opts.ground || grounds[k % grounds.length], side: k % 2 ? 'r' : 'l', kick: opts.kick || '', heading: opts.heading != null ? opts.heading : secHeading(s, opts.rec || c), body, media, mod: opts.mod || '' }));
    k++;
  };

  for (let i = 1; i < S.length; i++) {
    const s = S[i];
    if (/core-values/.test(s.id)) { pushRow(s, { cards: true, mod: 'p-row--values', ground: 'linen' }); continue; }
    if (/stop-by/.test(s.id)) { pushRow(s, { ground: 'night', mod: 'p-row--visit', media: `<span class="cut p-row__cut" data-depth="0.12" aria-hidden="true">${gimg('g-moon-cut', { alt: '', sizes: '280px' })}</span>` }); continue; }
    pushRow(s, { btnCls: 'btn--sun' });
    if (/our-purpose/.test(s.id)) for (const hs of homeStory) pushRow(hs, { rec: homeRec, id: 'story-' + hs.id, kick: /west side up/i.test(hs.heading) ? 'Our founder' : 'Mom and pop', skip: (b) => b.type === 'button' });
  }
  const main = `${hero({
    crumbs, kick: stripTags(kick), title: h1Html(c),
    lede: ledeB.map((b) => rewrite(b.html)).join(' '),
    ctas: [btn(menu(ctx), `Order for Delivery${icon('ext')}`), btn(menu(ctx), `Order for Pickup${icon('ext')}`, 'btn--glass')],
    media: heroImg ? heroPic(heroImg, heroImg.alt && !/^unnamed$/i.test(heroImg.alt) ? heroImg.alt : '') : heroCut('g-pampas-cut'),
    mod: 'p-hero--about',
  })}
${rows.join('\n')}`;
  return out(ctx, { path, title: c.title, description: c.description, crumbs, main, mod: 'about', image: heroImg ? absImg(ctx, heroImg) : '' });
}

// ---------- /about-us/reviews/ (NEW, adopted Reviews slot) ----------
function reviews(ctx) {
  const h = captured(ctx, 'home');
  const path = '/about-us/reviews/';
  const crumbs = [HOME, ABOUT, { href: path, label: 'Reviews' }];
  const R = ctx.site.reviews || {};
  const sec = h ? (h.sections || []).find((s) => (s.blocks || []).some((b) => b.type === 'review')) : null;
  const list = sec ? sec.blocks.filter((b) => b.type === 'review') : [];
  const intro = sec ? sec.blocks.find((b) => b.type === 'p' && !b.role && !/^\(\d+\)$/.test(stripTags(b.html))) : null;
  const rating = R.rating ? `<p class="p-rating" data-reveal style="--i:3"><span class="p-rating__stars" aria-hidden="true">${Array.from({ length: 5 }, () => icon('star', 'p-star')).join('')}</span><span class="p-rating__num">${esc(R.rating)}</span><span class="p-rating__txt">from ${esc(R.count)} reviews on ${esc(R.platform)}, as shown on the live site</span></p>` : '';
  const main = `${hero({
    crumbs, kick: sec ? stripTags(sec.heading) : 'Reviews', title: 'Reviews',
    lede: intro ? rewrite(intro.html) : '',
    meta: rating,
    ctas: [R.url ? btn(R.url, `Write a review${icon('ext')}`) : '', btn('/contact-us/', 'Contact us', 'btn--glass')].filter(Boolean),
    media: heroCut('g-pampas-cut', 'p-hero__cut--reviews'),
    mod: 'p-hero--reviews',
  })}
<section class="band band--cream p-reviews" aria-labelledby="p-reviews-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap">
<header class="p-head" data-reveal><p class="kicker p-kick">${esc(R.platform || 'Google')}</p><h2 class="display p-head__h" id="p-reviews-h">In their <em>words</em></h2></header>
${list.length ? `<div class="p-rgrid">${list.map((b, i) => rcard(b, i)).join('\n')}</div>` : '<p class="p-empty">No reviews are captured yet.</p>'}
${R.url ? `<p class="p-reviews__more" data-reveal>${arrow(R.url, 'write a review')}</p>` : ''}
</div>
</section>`;
  return out(ctx, { path, title: 'Reviews | LADY L CANNABIS', description: `Google reviews of Lady L Cannabis, ${ctx.site.address.street}, ${ctx.site.address.city}, ${ctx.site.address.state}, as shown on the live site.`, crumbs, main, mod: 'reviews' });
}

// ---------- /faq/ ----------
function faqPage(ctx) {
  const c = captured(ctx, 'faq');
  if (!c) return null;
  const path = '/faq/';
  const crumbs = [HOME, ABOUT, { href: path, label: 'FAQs' }];
  const groups = [];
  const extra = [];
  let heroImg = null;
  for (const s of c.sections || []) {
    const head = String(s.heading || '').trim();
    const isH1 = norm(head) === norm(c.h1);
    let g = null;
    const open = (title) => { g = { title, items: [], notes: [] }; groups.push(g); };
    if (head && !isH1) open(head);
    for (const b of s.blocks || []) {
      if (b.type === 'img' && !heroImg) { heroImg = b; continue; }
      if ((b.type === 'h2' || b.type === 'h3') && norm(b.text) !== norm(head)) { open(b.text); continue; }
      if (b.type === 'faq') { if (!g) open('Questions'); g.items.push(...(b.items || [])); continue; }
      if (b.type === 'h1' && norm(b.text) === norm(c.h1)) continue;
      if (g) g.notes.push(b); else extra.push(b);
    }
  }
  const gid = (t) => 'faq-' + slugify(t);
  const n = groups.reduce((a, g) => a + g.items.length, 0);
  const groupHtml = groups.map((g, i) => `<section class="p-faq__group" id="${gid(g.title)}" aria-labelledby="${gid(g.title)}-h" data-reveal>
<h2 class="display p-faq__title" id="${gid(g.title)}-h"><span class="numeral p-faq__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${esc(g.title)}</span></h2>
${g.items.length ? faqHtml(g.items, { open: i === 0 ? 0 : -1 }) : ''}
${g.notes.length ? `<div class="p-faq__note glass glass--cream">${blocksHtml(g.notes.filter((b) => !(norm(stripTags(b.html || b.text)) === norm(g.title) && false)), { ctx })}</div>` : ''}
</section>`).join('\n');
  const main = `${hero({
    crumbs, kick: 'FAQs', title: esc(c.h1),
    lede: `${n} answers from Lady L, grouped by topic.`,
    ctas: [btn('/contact-us/', 'Contact us'), btn(ctx.site.phoneHref, `${icon('phone')}${esc(ctx.site.phone)}`, 'btn--glass')],
    media: heroImg ? `<figure class="p-hero__emblem" data-depth="0.06">${pic(heroImg, { alt: '', eager: true, sizes: '(min-width: 1024px) 360px, 50vw', cls: 'p-hero__emblem-img' })}</figure>` : heroCut('g-moon-cut'),
    mod: 'p-hero--faq',
  })}
<section class="band band--cream p-faq" aria-label="Questions by topic">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap p-faq__grid">
<nav class="p-faq__index glass glass--cream" aria-label="FAQ topics"><p class="p-faq__ih">Topics</p><ol>${groups.map((g, i) => `<li><a href="#${gid(g.title)}"><span class="numeral p-faq__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${esc(g.title)}</span></a></li>`).join('')}</ol>
<a class="btn btn--sun btn--sm p-faq__cta"${linkAttrs(menu(ctx))}><span>Order Now${icon('ext')}</span></a></nav>
<div class="p-faq__groups">
${extra.length ? `<div class="prose">${blocksHtml(extra, { ctx })}</div>` : ''}
${groupHtml}
</div>
</div>
</section>`;
  // FAQPage JSON-LD: each question once (the fuller answer when the page repeats a question)
  const seen = new Map();
  for (const g of groups) for (const it of g.items) { const a = stripTags(it.a_html).replace(/\s+/g, ' ').trim(); const q = it.q.trim(); if (!seen.has(q) || seen.get(q).length < a.length) seen.set(q, a); }
  const jsonld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [...seen].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return out(ctx, { path, title: c.title, description: c.description, crumbs, main, mod: 'faq', jsonld });
}

// ---------- /community/ ----------
function community(ctx) {
  const c = captured(ctx, 'community');
  if (!c) return null;
  const path = '/community/';
  const crumbs = [HOME, ABOUT, { href: path, label: 'Community' }];
  const S = c.sections || [];
  const first = S[0] || { blocks: [] };
  const B = first.blocks;
  const firstH = B.findIndex((b) => /^h[2-4]$/.test(b.type));
  const intro = (firstH === -1 ? B : B.slice(0, firstH)).filter((b) => b.type === 'p');
  const heroImg = (firstH === -1 ? B : B.slice(0, firstH)).find((b) => b.type === 'img');
  // the causes: each heading with the blocks under it becomes a glass card; its first outside link is the card's link
  const causes = [];
  for (const b of firstH === -1 ? [] : B.slice(firstH)) {
    if (/^h[2-4]$/.test(b.type)) { causes.push({ title: b.text, blocks: [] }); continue; }
    if (causes.length) causes[causes.length - 1].blocks.push(b);
  }
  const leftovers = (firstH === -1 ? B : B.slice(0, firstH)).filter((b) => b.type !== 'p' && b !== heroImg);
  const causeCard = (cz, i) => {
    const htmlAll = cz.blocks.map((b) => b.html || '').join(' ');
    const m = htmlAll.match(/href="(https?:\/\/[^"]+)"/i);
    const link = m ? m[1] : '';
    return `<article class="glass glass--lift p-cause" data-reveal style="--i:${i % 3}" data-spot>
<span class="p-cause__badge" aria-hidden="true">${icon('sparkle')}</span>
<h3 class="display p-cause__t">${esc(cz.title)}</h3>
<div class="prose p-cause__b">${blocksHtml(cz.blocks, { ctx })}</div>
${link ? `<p class="p-cause__go">${arrow(link, `Visit ${cz.title}`)}</p>` : ''}
</article>`;
  };
  const rest = S.slice(1).map((s, i) => {
    const imgs = (s.blocks || []).filter((b) => b.type === 'img');
    const only = (s.blocks || []).length === imgs.length;
    if (only && imgs.length) return `<section class="band band--linen p-emblemband" aria-hidden="false"><div class="wrap p-emblemband__in" data-reveal>${imgs.map((b) => emblem(b)).join('')}</div></section>`;
    const body = blocksHtml((s.blocks || []).filter((b) => b.type !== 'img'), { ctx, btnCls: 'btn--sun' });
    const media = imgs.length ? `<div class="p-archs p-archs--${Math.min(imgs.length, 2)}">${imgs.slice(0, 2).map((b, j) => archFig(b, { alt: b.alt || '', cls: j ? 'p-arch--b' : 'p-arch--a', depth: j ? '-0.04' : '0.05' })).join('')}</div>` : '';
    return row({ id: s.id, ground: i % 2 ? 'cream' : 'night', side: i % 2 ? 'l' : 'r', heading: secHeading(s, c), body, media, mod: 'p-row--areas' });
  }).join('\n');
  const main = `${hero({
    crumbs, kick: 'Community', title: esc(c.h1),
    lede: intro.map((b) => rewrite(b.html)).join(' '),
    ctas: [btn('/events/', 'See our events'), btn(menu(ctx), `Order Now${icon('ext')}`, 'btn--glass')],
    media: heroImg ? heroPic(heroImg, '') : heroCut('g-leaf-cut'),
    mod: 'p-hero--community',
  })}
${causes.length || leftovers.length ? `<section class="band band--cream p-causes" aria-labelledby="p-causes-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap">
<header class="p-head" data-reveal><p class="kicker p-kick">Causes</p><h2 class="display p-head__h" id="p-causes-h">What we <em>stand</em> with</h2></header>
<div class="p-causes__grid">${causes.map(causeCard).join('\n')}</div>
${leftovers.length ? `<div class="prose">${blocksHtml(leftovers, { ctx })}</div>` : ''}
</div>
</section>` : ''}
${rest}`;
  return out(ctx, { path, title: c.title, description: c.description, crumbs, main, mod: 'community', image: heroImg ? absImg(ctx, heroImg) : '' });
}

// ---------- /events/ and /events/<slug>/ ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// the date used for ORDER only: startISO, else a date read from the captured date text ("Sat, 8/22, 2026")
function sortDate(e) {
  if (e.startISO) return String(e.startISO).slice(0, 10);
  const t = String(e.dateText || '');
  let m = t.match(/(\d{1,2})\/(\d{1,2}),?\s*(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  const d = Date.parse(t.replace(/^[A-Za-z]+,\s*/, ''));
  if (!Number.isNaN(d)) return new Date(d).toISOString().slice(0, 10);
  return '';
}
const yearRound = (e) => /year[\s-]*round/i.test(e.dateText || '');
const kindOf = (e) => (yearRound(e) ? 'year-round' : sortDate(e) && sortDate(e) >= TODAY ? 'upcoming' : 'past');
// the page path: the decoded slug (an emoji slug becomes a UTF-8 directory, as the blog does), never the %-encoded form
const evPath = (e) => { if (e.path) { try { return decodeURI(e.path); } catch { /* fall through */ } } return `/events/${e.slug}/`; };
// every href to an event: the encoded form of the decoded path (an emoji slug stays a valid URL)
const evHref = (e) => encodeURI(evPath(e));
function evSlugOf(u) { const m = String(u || '').match(/\/events\/([^/?#]+)\/?/); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
function eventImg(e) {
  if (e.image && (e.image.src || typeof e.image === 'string')) return e.image;
  const b = blocksOf(e).find((x) => x.type === 'img');
  return b || null;
}
// the Deco date tile (from the captured date; a typographic poster when the event has no image)
function datePoster(e) {
  const d = sortDate(e);
  if (yearRound(e)) return `<span class="p-poster p-poster--yr" aria-hidden="true"><span class="p-poster__rays"></span><span class="p-poster__big">${icon('sun')}</span><span class="p-poster__mon">Year-Round</span></span>`;
  if (!d) return `<span class="p-poster" aria-hidden="true"><span class="p-poster__rays"></span><span class="p-poster__big">${icon('star')}</span></span>`;
  const [y, mo, da] = d.split('-');
  return `<span class="p-poster" aria-hidden="true"><span class="p-poster__rays"></span><span class="p-poster__mon">${MON[+mo - 1]}</span><span class="p-poster__big">${+da}</span><span class="p-poster__yr">${y}</span></span>`;
}
function ecard(e, i, { h = 'h3', title, dateText, timeText } = {}) {
  const t = title || e.h1 || stripTags(e.title).replace(/\s*\|\s*LADY L CANNABIS\s*$/i, '');
  const im = eventImg(e);
  const media = im && hasPic(im) ? pic(im, { alt: '', sizes: '(min-width: 1280px) 380px, (min-width: 700px) 45vw, 88vw', cls: 'p-ecard__img' }) : datePoster(e);
  const dt = dateText != null ? dateText : e.dateText;
  const tm = timeText != null ? timeText : e.timeText;
  const d = sortDate(e);
  return `<article class="ecard glass glass--lift p-ecard" data-reveal style="--i:${i % 3}">
<span class="ecard__media p-ecard__media">${media}${d && !yearRound(e) && im && hasPic(im) ? `<span class="ecard__date p-ecard__badge" aria-hidden="true"><span>${MON[+d.slice(5, 7) - 1]}</span><b>${+d.slice(8, 10)}</b></span>` : ''}</span>
<span class="p-ecard__body">
<span class="ecard__meta p-ecard__meta"><span class="chip chip--sun p-ecard__kind">${kindOf(e) === 'upcoming' ? 'Upcoming' : kindOf(e) === 'year-round' ? 'Year-Round' : 'Past event'}</span></span>
<${h} class="ecard__title p-ecard__title"><a${linkAttrs(evHref(e))}>${esc(t)}</a></${h}>
<span class="p-ecard__when">${dt ? `<span class="p-ecard__date">${icon('star')}${esc(dt)}</span>` : ''}${tm ? `<span class="p-ecard__time">${icon('clock')}${esc(tm)}</span>` : ''}</span>
<span class="p-ecard__more" aria-hidden="true">Details${icon('arrow')}</span>
</span>
</article>`;
}

function eventsHub(ctx) {
  const c = captured(ctx, 'events');
  const path = '/events/';
  const crumbs = [HOME, ABOUT, { href: path, label: 'Events' }];
  const evs = (ctx.events || []).slice();
  const bySlug = new Map(evs.map((e) => [e.slug, e]));
  // the events page's own listing (titles, dates and times as the page prints them), matched to each event by its link
  const loop = c ? blocksOf(c).filter((b) => b.type === 'loop').flatMap((b) => b.items || []) : [];
  const card = new Map();
  for (const it of loop) { const e = bySlug.get(evSlugOf(it.href)); if (e && !card.has(e.slug)) card.set(e.slug, it); }
  const strayLoop = loop.filter((it) => !bySlug.get(evSlugOf(it.href)));
  const up = evs.filter((e) => kindOf(e) === 'upcoming').sort((a, b) => sortDate(a).localeCompare(sortDate(b)));
  const past = evs.filter((e) => kindOf(e) === 'past').sort((a, b) => sortDate(b).localeCompare(sortDate(a)));
  const yr = evs.filter((e) => kindOf(e) === 'year-round');
  const cardOf = (e, i) => { const it = card.get(e.slug) || {}; return ecard(e, i, { title: it.title, dateText: it.dateText, timeText: it.timeText }); };
  const other = c ? blocksOf(c).filter((b) => b.type !== 'loop' && !(b.type === 'h1' && norm(b.text) === norm(c.h1))) : [];
  const group = (id, tag, label, list, empty) => `<section class="p-evgroup" id="${id}" data-filter-item data-tags="${tag}" aria-labelledby="${id}-h">
<header class="p-evgroup__head" data-reveal><h2 class="display p-evgroup__h" id="${id}-h">${label}</h2><span class="p-count">${list.length}</span></header>
${list.length ? `<div class="p-egrid">${list.map(cardOf).join('\n')}</div>` : `<div class="p-empty glass glass--cream" data-reveal><p>${empty}</p>${arrow((ctx.site.socials || [])[0] ? ctx.site.socials[0].url : '/contact-us/', (ctx.site.socials || [])[0] ? `Follow ${ctx.site.socials[0].handle} on Instagram` : 'Contact us')}</div>`}
</section>`;
  const main = `${hero({
    crumbs, kick: 'Events', title: esc(c ? c.h1 : 'Events'),
    lede: 'Pop-ups, parties, drives and celebrations, all in one place.',
    ctas: [btn('#p-ev-list', 'Browse events'), btn(menu(ctx), `Order Now${icon('ext')}`, 'btn--glass')],
    media: heroCut('g-moon-cut', 'p-hero__cut--events'),
    mod: 'p-hero--events',
  })}
<section class="band band--cream p-ev" id="p-ev-list" aria-label="All events" data-filter-scope>
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap">
<div class="p-ev__filters" data-filter-group role="group" aria-label="Filter events" data-reveal>
<button class="chip p-filter" type="button" data-filter="all" aria-pressed="true">All</button>
<button class="chip p-filter" type="button" data-filter="upcoming" aria-pressed="false">Upcoming</button>
<button class="chip p-filter" type="button" data-filter="past" aria-pressed="false">Past</button>
<button class="chip p-filter" type="button" data-filter="year-round" aria-pressed="false">Year-Round</button>
</div>
${other.length ? `<div class="prose p-ev__intro">${blocksHtml(other, { ctx })}</div>` : ''}
${group('upcoming', 'upcoming', 'Upcoming', up, 'No upcoming events are posted right now.')}
${yr.length ? group('year-round', 'year-round', 'Year-Round', yr, '') : ''}
${group('past', 'past', 'Past events', past, 'No past events are listed.')}
${strayLoop.length ? `<ul class="p-ev__stray">${strayLoop.map((it) => `<li>${arrow(live(it.href), it.title)} ${esc(it.dateText || '')} ${esc(it.timeText || '')}</li>`).join('')}</ul>` : ''}
<p class="p-empty glass glass--cream" data-filter-empty hidden>No events match this filter.</p>
</div>
</section>`;
  return out(ctx, { path, title: c ? c.title : 'Events | LADY L CANNABIS', description: c ? c.description : 'Lady L Cannabis events.', crumbs, main, mod: 'events' });
}

function eventPage(ctx, e, all) {
  const path = evPath(e);
  const t = e.h1 || stripTags(e.title).replace(/\s*\|\s*LADY L CANNABIS\s*$/i, '');
  const crumbs = [HOME, { href: '/events/', label: 'Events' }, { href: encodeURI(path), label: t }];
  const blocks = blocksOf(e);
  const im = eventImg(e);
  const imIsHero = im && hasPic(im);
  // the hero prints the captured date and time; the body keeps every other block (venue line, story, lists, images)
  const isMeta = (b) => b.type === 'p' && (b.role === 'date' || b.role === 'time');
  const back = blocks.find((b) => b.type === 'icon-box' && /href="[^"]*\/events\/?"/i.test(b.html || ''));
  const bodyBlocks = blocks.filter((b) => !isMeta(b) && b !== back && !(b.type === 'h1' && norm(b.text) === norm(t)) && !(imIsHero && b.type === 'img' && localSrc(b.src) === localSrc(im.src)));
  const dateB = blocks.find((b) => b.role === 'date');
  const timeB = blocks.find((b) => b.role === 'time');
  const dateText = dateB ? stripTags(dateB.html) : e.dateText;
  const timeText = timeB ? stripTags(timeB.html) : e.timeText;
  const backText = back ? stripTags(back.html) : 'Back to All Events';
  const meta = `<p class="p-hero__meta" data-reveal style="--i:2">${dateText ? `<span class="chip chip--sun">${icon('star')}${esc(dateText)}</span>` : ''}${timeText ? `<span class="chip">${icon('clock')}${esc(timeText)}</span>` : ''}${e.venue ? `<span class="chip">${icon('pin')}${esc(typeof e.venue === 'string' ? e.venue : e.venue.name || '')}</span>` : ''}</p>`;
  const sorted = all.slice().sort((a, b) => (sortDate(b) || '0').localeCompare(sortDate(a) || '0'));
  const idx = sorted.findIndex((x) => x.slug === e.slug);
  const more = [sorted[idx - 1], sorted[idx + 1], sorted[idx + 2], sorted[idx - 2]].filter(Boolean).slice(0, 3);
  const adj = (e.adjacent || []).map((a) => { const x = all.find((y) => y.slug === evSlugOf(a.href)); return x ? `<a class="p-pn__link glass glass--cream glass--lift"${linkAttrs(evHref(x))}><span class="p-pn__dir">${esc(a.label)}</span><span class="p-pn__title">${esc(a.title)}</span></a>` : ''; }).join('');
  const main = `${hero({
    crumbs, kick: kindOf(e) === 'upcoming' ? 'Upcoming event' : kindOf(e) === 'year-round' ? 'Year-Round' : 'Event', title: esc(t), meta,
    ctas: [btn('/events/', backText, 'btn--glass'), btn(menu(ctx), `Order Now${icon('ext')}`)],
    media: imIsHero ? heroPic(im, im.alt || '') : `<figure class="arch p-hero__arch p-hero__arch--poster" data-depth="0.06"><span class="arch__img">${datePoster(e)}</span></figure>`,
    mod: 'p-hero--event',
  })}
<section class="band band--cream p-eventbody" aria-label="Event details">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap wrap--narrow">
<div class="prose p-eventbody__text" data-reveal>${bodyBlocks.length ? blocksHtml(bodyBlocks, { ctx }) : ''}</div>
<p class="p-eventbody__back">${arrow('/events/', backText)}</p>
${adj ? `<nav class="p-pn" aria-label="Previous and next event">${adj}</nav>` : ''}
</div>
</section>
${more.length ? `<section class="band band--night p-moreev" aria-labelledby="p-moreev-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__rays"></span></div>
<div class="wrap">
<header class="p-head" data-reveal><p class="kicker p-kick">Events</p><h2 class="display p-head__h" id="p-moreev-h">More from <em>Lady L</em></h2></header>
<div class="p-egrid">${more.map((x, i) => ecard(x, i)).join('\n')}</div>
</div>
</section>` : ''}`;
  const S = ctx.site;
  const a = S.address || {};
  const jsonld = [];
  if (e.startISO) {
    jsonld.push({
      '@context': 'https://schema.org', '@type': 'Event', name: t, startDate: e.startISO, ...(e.endISO ? { endDate: e.endISO } : {}),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
      url: absUrl(ctx, path), description: e.description || undefined, ...(imIsHero ? { image: absImg(ctx, im) } : {}),
      location: e.venue ? { '@type': 'Place', name: typeof e.venue === 'string' ? e.venue : e.venue.name, address: typeof e.venue === 'string' ? e.venue : e.venue.address || e.venue.name }
        : { '@type': 'Place', name: S.name, address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.state, postalCode: a.zip, addressCountry: 'US' } },
      organizer: { '@type': 'Organization', name: S.name, url: S.origin + '/' },
    });
  }
  return out(ctx, { path, title: e.title, description: e.description || `${t}: an event at ${S.name}, Jersey City.`, crumbs, main, mod: 'event', jsonld, image: imIsHero ? absImg(ctx, im) : '' });
}

// ---------- /contact-us/ ----------
function storeBlock(ctx) {
  const S = ctx.site;
  const a = S.address || {};
  const dh = shell.deliveryHoursHtml ? shell.deliveryHoursHtml(ctx, 'p-store__hours') : `<ul class="hours p-store__hours">${(S.deliveryHours || []).map((r) => `<li><span>${esc(r.days)}</span> <span>${esc(r.open)} to ${esc(r.close)}</span></li>`).join('')}</ul>`;
  return `<div class="p-store glass glass--strong" data-reveal data-spot>
<p class="kicker p-kick">The store</p>
<h2 class="display p-store__name" id="p-store-h">${esc(S.name)}</h2>
<p class="p-store__row">${icon('pin')}<a${linkAttrs(S.mapUrl)}>${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</a></p>
<p class="p-store__row">${icon('phone')}<a${linkAttrs(S.phoneHref)}>${esc(S.phone)}</a></p>
<p class="p-store__row">${icon('mail')}<a${linkAttrs('mailto:' + S.email)}>${esc(S.email)}</a></p>
<div class="p-store__hrs">
<div class="p-store__col"><h3 class="p-store__h">${icon('bag')}Store hours</h3>${shell.hoursHtml(ctx, 'p-store__hours')}</div>
<div class="p-store__col"><h3 class="p-store__h">${icon('truck')}Delivery hours</h3>${dh}</div>
</div>
${S.lastCall ? `<p class="p-store__note">${icon('clock')}${esc(S.lastCall)}</p>` : ''}
<div class="btn-row">${btn(menu(ctx), `Order for Delivery${icon('ext')}`, 'btn--sun btn--sm')}${btn(menu(ctx), `Order for Pickup${icon('ext')}`, 'btn--glass btn--sm')}</div>
</div>`;
}
function contact(ctx) {
  const c = captured(ctx, 'contact-us');
  if (!c) return null;
  const path = '/contact-us/';
  const crumbs = [HOME, { href: path, label: 'Contact Us' }];
  const B = blocksOf(c);
  const ledeB = B.find((b) => b.type === 'p');
  const formB = B.find((b) => b.type === 'form');
  const imgB = B.find((b) => b.type === 'img');
  const rest = B.filter((b) => b !== ledeB && b !== formB && b !== imgB && !(b.type === 'h1' && norm(b.text) === norm(c.h1)));
  const S = ctx.site;
  const main = `${hero({
    crumbs, kick: 'Contact', title: esc(c.h1),
    lede: ledeB ? rewrite(ledeB.html) : '',
    ctas: [btn(S.phoneHref, `${icon('phone')}${esc(S.phone)}`), btn(S.mapUrl, `Get Directions${icon('ext')}`, 'btn--glass')],
    media: imgB ? `<figure class="p-hero__emblem" data-depth="0.06">${pic(imgB, { alt: '', eager: true, sizes: '(min-width: 1024px) 360px, 50vw', cls: 'p-hero__emblem-img' })}</figure>` : heroCut('g-leaf-cut'),
    mod: 'p-hero--contact',
  })}
<section class="band band--cream p-contact" aria-labelledby="p-store-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap p-contact__grid">
${storeBlock(ctx)}
<div class="p-contact__form glass glass--cream" data-reveal style="--i:1">
<p class="kicker p-kick">Message</p>
<h2 class="display p-contact__h">Send a <em>note</em></h2>
${formB ? formHtml(formB, 'contact-form') : ''}
${rest.length ? `<div class="prose">${blocksHtml(rest, { ctx })}</div>` : ''}
</div>
<div class="p-contact__map" data-reveal style="--i:2">${mapLink(ctx)}</div>
</div>
</section>`;
  return out(ctx, { path, title: c.title, description: c.description, crumbs, main, mod: 'contact' });
}

// ---------- /privacy-policy/ /terms-of-service/ /accessibility/ (verbatim prose, contents list when long) ----------
function legal(ctx, slug) {
  const c = captured(ctx, slug);
  if (!c) return null;
  const path = c.path || `/${slug}/`;
  const crumbs = [HOME, { href: path, label: c.h1 }];
  const blocks = blocksOf(c);
  const heads = blocks.filter((b) => /^h[2-4]$/.test(b.type));
  const used = new Map();
  const idOf = (t) => { let id = 'sec-' + (slugify(t) || 'x'); const n = used.get(id) || 0; used.set(id, n + 1); return n ? `${id}-${n + 1}` : id; };
  const ids = heads.map((b) => idOf(b.text));
  let hi = 0;
  const body = blocksHtml(blocks, { ctx, h1: c.h1, ids: () => ids[hi++] });
  // section headings that are not repeated by a block
  const secHeads = (c.sections || []).map((s) => secHeading(s, c)).filter(Boolean);
  const toc = heads.length >= 4 ? `<nav class="p-toc glass glass--cream" aria-label="Contents"><p class="p-toc__h">Contents</p><ol>${heads.map((b, i) => `<li><a href="#${ids[i]}">${esc(b.text)}</a></li>`).join('')}</ol></nav>` : '';
  const main = `${hero({ crumbs, kick: 'Legal', title: esc(c.h1), lede: '', ctas: [btn('/contact-us/', 'Contact us', 'btn--glass')], media: heroCut('g-leaf-cut', 'p-hero__cut--legal'), mod: 'p-hero--legal' })}
<section class="band band--cream p-legal" aria-label="${escA(c.h1)}">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap p-legal__grid${toc ? '' : ' p-legal__grid--solo'}">
${toc}
<div class="prose p-legal__text">${secHeads.map((h) => `<h2>${h}</h2>`).join('')}${body}</div>
</div>
</section>`;
  return out(ctx, { path, title: c.title, description: c.description, crumbs, main, mod: 'legal' });
}

// ---------- /404.html ----------
function notFound(ctx) {
  const path = '/404.html';
  const crumbs = [HOME, { href: '/404.html', label: 'Page not found' }];
  const main = `${hero({
    crumbs, kick: '404', title: 'This page took a <em>detour</em>',
    lede: 'The page you asked for is not here. These will get you back on track.',
    ctas: [btn('/', 'Home'), btn(menu(ctx), `Shop the menu${icon('ext')}`, 'btn--glass'), btn('/service/', 'Delivery', 'btn--ghost'), btn('/in-store-pickup/', 'Pickup', 'btn--ghost')],
    media: heroCut('g-moon-cut', 'p-hero__cut--404'),
    mod: 'p-hero--404',
  })}
<section class="band band--cream p-lost" aria-labelledby="p-lost-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="p-row__botanical"></span></div>
<div class="wrap">
<header class="p-head" data-reveal><p class="kicker p-kick">Popular pages</p><h2 class="display p-head__h" id="p-lost-h">Try one of <em>these</em></h2></header>
<ul class="p-lost__grid" role="list">${[['/', 'Home', 'sparkle'], [menu(ctx), 'Shop the menu', 'cart'], ['/service/', 'Weed Delivery', 'truck'], ['/in-store-pickup/', 'In-Store Pickup', 'bag'], ['/products/', 'Products', 'leaf'], ['/jersey-city-weed-deals/', 'Deals', 'tag'], ['/events/', 'Events', 'star'], ['/contact-us/', 'Contact Us', 'phone'], ['/sitemap/', 'Sitemap', 'search']].map(([u, l, ic], i) => `<li><a class="p-lost__card glass glass--cream glass--lift"${linkAttrs(u)} data-reveal style="--i:${i % 3}"><span class="p-lost__ico">${icon(ic)}</span><span class="p-lost__t">${esc(l)}</span>${extIcon(u)}</a></li>`).join('')}</ul>
</div>
</section>`;
  const r = out(ctx, { path, title: 'Page Not Found | LADY L CANNABIS', description: 'The page you were looking for is not on the Lady L Cannabis site.', crumbs, main, mod: '404' });
  r.html = r.html.replace(/<link rel="canonical"[^>]*>\n?/, '').replace('<head>', '<head>\n<meta name="robots" content="noindex">');
  return r;
}

export async function render(ctx) {
  const pages = [about(ctx), reviews(ctx), faqPage(ctx), community(ctx), eventsHub(ctx)];
  const evs = ctx.events || [];
  for (const e of evs) pages.push(eventPage(ctx, e, evs));
  pages.push(contact(ctx), legal(ctx, 'privacy-policy'), legal(ctx, 'terms-of-service'), legal(ctx, 'accessibility'), notFound(ctx));
  return pages.filter(Boolean);
}
