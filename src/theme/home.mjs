// home.mjs - the home page "/" (HOME lane, revision 1 "PASTE UP POP" bento). Section order = the adopted home order
// (docs/BUILD-CONTRACT.md section 6 HOME). Every captured word of src/content/pages/home.json is rendered
// (tools/words-check.mjs --only home): each captured section is CLAIMED by a heading matcher and laid out by its own
// renderer; every block a renderer does not place itself is printed by the generic block renderer at the end of that
// section, and a section no matcher claims is printed generically right after the claimed section it followed live.
// Facts come from ctx.site (verbatim); new words are neutral glue only (kickers, tab and button labels).
// No inline JS; root-absolute URLs only in HTML attributes (D6).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.mjs';
import * as shell from './shell.mjs';
import { esc, escA, linkAttrs, gimg, img, menu, demoForm, rewriteLinks, liveHref, stripTags } from './util.mjs';

const ico = (n, c) => (typeof shell.icon === 'function' ? shell.icon(n, c) : '');
const norm = (s) => stripTags(String(s ?? '')).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();
const textOf = (b) => String((b && (b.text ?? b.title ?? b.html)) || '');
const isHead = (b) => b && /^h[1-4]$/.test(b.type);
const MISSING_OK = process.env.ALLOW_MISSING_GEN === '1';
const pad2 = (n) => String(n).padStart(2, '0');

// wrap the first match of `re` in the escaped text in <em> (one italic accent per heading)
const accent = (t, re) => { const e = esc(t); if (!re) return e; let done = false; return e.replace(re, (m) => (done ? m : ((done = true), `<em>${m}</em>`))); };
// captured inline HTML: links routed through the D4 rule (rewriteLinks); external ones open in a new tab
const rich = (html) => rewriteLinks(String(html ?? '')).replace(/<a\b([^>]*?)\shref="(https?:\/\/[^"]+)"([^>]*)>/gi, (m, a, u, b) => (/\btarget=/.test(m) ? m : `<a${a} href="${u}"${b} target="_blank" rel="noopener">`));
const htmlOf = (b) => (b.html != null ? rich(b.html) : esc(b.text || b.title || ''));

// ---------- Lady L's photos: the captured live URL resolved to its local copy under assets/photos/ ----------
let MAP = null;
function assetMap() {
  if (MAP) return MAP;
  MAP = new Map();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts/asset-map.json'), 'utf8'));
    for (const e of j.images || []) {
      const live = e.src || e.url || e.live;
      const loc = e.local || e.file || e.path || e.dst || e.out;
      if (live && loc) MAP.set(String(live).split('?')[0], '/' + String(loc).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^(?!assets\/)/, 'assets/photos/'));
    }
  } catch { /* no map yet */ }
  return MAP;
}
const exists = (rel) => fs.existsSync(path.join(ROOT, String(rel).replace(/^\//, '').split(/[?#]/)[0]));
function localSrc(src) {
  const s = String(src || '');
  if (/^\/assets\//.test(s)) return exists(s) ? s : '';
  const hit = assetMap().get(s.split('?')[0]);
  if (hit && exists(hit)) return hit;
  const base = decodeURIComponent(s.split('?')[0].split('/').pop() || '');
  if (!base) return '';
  const stem = base.replace(/\.\w+$/, '');
  for (const f of [base, stem + '.webp', stem + '.jpg', stem + '.png', stem + '.svg']) if (exists('/assets/photos/ll/' + f)) return '/assets/photos/ll/' + f;
  return '';
}
const hasPhoto = (b) => !!(b && localSrc(b.src));
function pic(b, opts = {}) {
  const src = b && localSrc(b.src);
  if (src) return /\.svg$/i.test(src) ? `<img class="${escA(opts.cls || '')}" src="${escA(src)}" alt="${escA(opts.alt != null ? opts.alt : '')}" loading="lazy" decoding="async">` : img({ src, alt: opts.alt != null ? opts.alt : '', w: b.w, h: b.h }, opts);
  if (MISSING_OK) return `<span class="img-slot ${opts.cls || ''}" role="img" aria-label="${escA(opts.alt || '')}"></span>`;
  return img({ src: '/assets/photos/ll/' + String((b && b.src) || 'missing').split('/').pop() }, opts); // fail closed: records a missing image
}

// ---------- the generic block renderer (every block shape of contract section 4, plus the capture's `card`) ----------
const btnHref = (ctx, b, fallback) => (b.href ? liveHref(b.href) : fallback || menu(ctx));
const extIco = (u) => (/^https?:/i.test(String(u)) ? ico('ext', 'ico--ext') : '');
const IBOX = { pin: 'pin', phone: 'phone', mail: 'mail', email: 'mail', clock: 'clock', map: 'pin', envelope: 'mail' };
function hoursList(b, cls = '') {
  const rows = (b.rows || []).map((r) => (Array.isArray(r) ? r : typeof r === 'object' ? Object.values(r) : [r]));
  return `<div class="h-hours${cls ? ' ' + cls : ''}">${b.title ? `<h3 class="h-hours__t">${ico(/deliver/i.test(b.title) ? 'truck' : 'clock')}<span>${esc(b.title)}</span></h3>` : ''}<ul class="hours">${rows.map((c) => `<li><span class="hours__d">${esc(c[0])}</span><span class="hours__t">${esc(c.slice(1).join(' '))}</span></li>`).join('')}</ul></div>`;
}
function stars(n) {
  const k = Math.max(1, Math.min(5, Math.round(Number(n) || 5)));
  return `<span class="rcard__stars" role="img" aria-label="${k} out of 5 stars">${Array.from({ length: k }, () => ico('star')).join('')}</span>`;
}
function rcard(r, i) {
  const plat = r.platform || 'Google';
  return `<li class="h-reviews__item" data-reveal style="--i:${i % 4}"><figure class="rcard h-rcard" data-spot>
<div class="h-rcard__top">${stars(r.rating)}<span class="h-rcard__g" aria-hidden="true">${ico('google')}</span></div>
<blockquote class="rcard__quote h-rcard__quote"><p>${r.html != null ? rich(r.html) : esc(r.text || '')}</p></blockquote>
<figcaption class="h-rcard__by"><span class="rcard__name">${esc(r.name || '')}</span><span class="rcard__platform">Posted on ${esc(plat)}</span></figcaption>
</figure></li>`;
}
function faqItems(items, startOpen = true) {
  return `<div class="faq h-faq__list">${items.map((it, i) => `<details class="h-faq__item"${i === 0 && startOpen ? ' open' : ''} data-reveal style="--i:${i % 4}"><summary><h3 class="h-faq__q">${esc(it.q)}</h3></summary><div class="h-faq__a prose">${rich(it.a_html || esc(it.a || ''))}</div></details>`).join('\n')}</div>`;
}
function formHtml(b, id) {
  const fields = (b.fields || []).map((f) => (typeof f === 'string' ? f : f.label || f.name || f.placeholder || '')).filter(Boolean);
  let form = demoForm({ id, fields: fields.length ? fields : ['Email'], button: (b.button && (b.button.text || b.button)) || 'Submit', cls: 'h-form' }).replace(/btn--lime/g, 'btn--sun');
  const consent = b.consent && (typeof b.consent === 'string' ? b.consent : b.consent.text || b.consent.html);
  if (consent) {
    const c = /<a\b/i.test(consent) ? rich(consent) : esc(consent).replace(/privacy policy/i, (m) => `<a${linkAttrs('/privacy-policy/')}>${m}</a>`);
    form = form.replace(/<button /, `<label class="demo-form__check"><input type="checkbox" name="consent" value="yes"><span>${c}</span></label>\n<button `);
  }
  return form;
}
function block(ctx, b) {
  switch (b.type) {
    case 'p': return `<p>${htmlOf(b)}</p>`;
    case 'h1': case 'h2': case 'h3': case 'h4': { const t = b.type === 'h1' || b.type === 'h2' ? 'h3' : b.type; return `<${t} class="h-sub">${b.html != null ? rich(b.html) : esc(b.text)}</${t}>`; }
    case 'ul': case 'ol': return `<${b.type} class="h-list">${(b.items || []).map((it) => `<li>${typeof it === 'string' ? rich(it) : htmlOf(it)}</li>`).join('')}</${b.type}>`;
    case 'img': { const im = pic(b, { cls: 'h-fig__img', sizes: '(max-width: 720px) 92vw, 480px' }); return `<figure class="h-fig">${b.href ? `<a${linkAttrs(liveHref(b.href))}>${im}</a>` : im}</figure>`; }
    case 'video': return '';
    case 'button': { const u = btnHref(ctx, b); return `<p class="btn-row h-btns"><a class="btn btn--deco"${linkAttrs(u)}>${esc(b.text)}${extIco(u)}</a></p>`; }
    case 'quote': return `<blockquote class="h-quote">${htmlOf(b)}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`;
    case 'faq': return faqItems(b.items || [], false);
    case 'review': return `<ul class="h-reviews__grid" role="list">${rcard(b, 0)}</ul>`;
    case 'icon-box': return `<p class="h-ibox">${ico(IBOX[b.icon] || 'sparkle')}<span>${b.title ? `<strong>${esc(b.title)}</strong> ` : ''}${rich(b.html || '')}</span></p>`;
    case 'form': return `<div class="h-formbox glass">${formHtml(b, 'home-form')}</div>`;
    case 'embed': return b.kind === 'map' ? `<p class="h-ibox h-ibox--map">${ico('pin')}<a${linkAttrs(ctx.site.mapUrl)}>${esc(b.note || 'Map')}${extIco(ctx.site.mapUrl)}</a></p>` : b.src && /^https?:/i.test(b.src) ? `<p class="h-ibox">${ico('ext')}<a${linkAttrs(b.src)}>${esc(b.shown || b.note || 'Open')}</a></p>` : '';
    case 'table': return `<table class="h-table"><tbody>${(b.rows || []).map((r) => `<tr>${(Array.isArray(r) ? r : Object.values(r)).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'hours': return hoursList(b);
    case 'card': { const u = b.href ? liveHref(b.href) : ''; return `<div class="h-card">${b.title ? `<h3 class="h-sub">${u ? `<a${linkAttrs(u)}>${esc(b.title)}</a>` : esc(b.title)}</h3>` : ''}${b.html ? `<p>${rich(b.html)}</p>` : ''}</div>`; }
    default: return b.html ? `<div>${rich(b.html)}</div>` : b.text ? `<p>${esc(b.text)}</p>` : '';
  }
}
const blocksHtml = (ctx, list) => list.map((b) => block(ctx, b)).filter(Boolean).join('\n');

// ---------- section bookkeeping ----------
function makeSec(s) {
  const used = new Set();
  const blocks = (s && s.blocks) || [];
  const heading = String((s && s.heading) || '').trim();
  for (const b of blocks) if (heading && isHead(b) && norm(b.text) === norm(heading)) used.add(b); // repeats the heading
  return {
    s, heading, blocks,
    take(pred) { const b = blocks.find((x) => !used.has(x) && pred(x)); if (b) used.add(b); return b || null; },
    takeAll(pred) { const out = blocks.filter((x) => !used.has(x) && pred(x)); out.forEach((x) => used.add(x)); return out; },
    use(b) { if (b) used.add(b); return b; },
    rest() { return blocks.filter((x) => !used.has(x)); },
    head() { if (heading) return heading; const b = this.take((x) => /^h[1-3]$/.test(x.type)); return b ? b.text : ''; },
  };
}
const leftovers = (ctx, S) => { const r = S ? S.rest() : []; return r.length ? `<div class="h-extra prose">${blocksHtml(ctx, r)}</div>` : ''; };
const sectionLabel = (s) => norm([s.heading, ...((s.blocks || []).filter(isHead).map((b) => b.text))].join(' | '));
// split a block list into groups that each start at a heading (h3/h4) or an icon box: steps, FAQ pairs
function groups(list, startPred = (b) => b.type === 'h3' || b.type === 'h4' || b.type === 'icon-box') {
  const intro = [];
  const out = [];
  let pending = [];
  for (const b of list) {
    if (startPred(b)) { out.push({ head: b, body: [], pre: pending }); pending = []; continue; }
    // an icon image right before a step heading belongs to that step
    if (b.type === 'img') { pending.push(b); continue; }
    if (out.length) out[out.length - 1].body.push(...pending, b); else intro.push(...pending, b);
    pending = [];
  }
  if (pending.length) { if (out.length) out[out.length - 1].body.push(...pending); else intro.push(...pending); }
  return { intro, items: out };
}
const kicker = (t, extra = '') => `<p class="kicker${extra ? ' ' + extra : ''}">${esc(t)}</p>`;

export async function render(ctx) {
  const site = ctx.site;
  const home = (ctx.content && ctx.content.home) || null;
  if (!home) console.warn('warning: home: src/content/pages/home.json not captured yet, rendering the site.json skeleton');
  const secs = (home && home.sections) || [];
  const claimed = new Map(); // section -> key
  const claim = (key, re) => { const s = secs.find((x) => !claimed.has(x) && re.test(sectionLabel(x))); if (s) claimed.set(s, key); return s ? makeSec(s) : null; };
  const addr = site.address || {};
  const addrLine = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  const tb = (ctx.ia.topbar && ctx.ia.topbar.services) || [];
  const cats = ((ctx.ia.nav || []).find((n) => n.href === '/products/') || {}).children || [];
  const haze = ((ctx.images && ctx.images.media) || {})['hero-haze'];
  // revision 1b: the hero background is the Higgsfield caricature of Lady L's own campaign photo, moving (fal Kling loop)
  const heroLoop = ((ctx.images && ctx.images.media) || {})['hero-caricature'] || haze;
  const insta = (site.socials || []).find((x) => /instagram/i.test(x.name)) || {};
  const igUrl = insta.url || 'https://www.instagram.com/';
  const html = {};

  // ---------- claim the captured sections (most specific first) ----------
  const h1Text = String((home && home.h1) || site.tagline || site.name).trim();
  const S = {};
  S.hero = claim('hero', new RegExp(norm(h1Text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) || claim('hero', /made for you|bold/);
  S.faq = claim('faq', /\bfaq\b|frequently/);
  S.cats = claim('cats', /shop by category/);
  S.steps = claim('steps', /easy steps/);
  S.visit = claim('visit', /location|& hours/);
  S.high = claim('high', /^be your higher self/);
  S.story = claim('story', /west side\s*up|built from/);
  S.mom = claim('mom', /mom & pop|fun & funky/);
  S.why = claim('why', /why\s*choose/);
  S.deals = claim('deals', /deals|discount/);
  S.brand = claim('brand', /shop by\s*brand/);
  S.spots = claim('spots', /after you visit|got more for you/);
  S.reviews = claim('reviews', /customers are saying|reviews?\b/);
  S.join = claim('join', /latest updates|sign up/);
  S.insta = claim('insta', /instagram/);
  S.stop = claim('stop', /stop by|stay high/);
  const byType = (key, type) => { if (S[key]) return; const s = secs.find((x) => !claimed.has(x) && (x.blocks || []).some((b) => b.type === type)); if (s) { claimed.set(s, key); S[key] = makeSec(s); } };
  byType('reviews', 'review');
  byType('faq', 'faq');
  byType('join', 'form');
  if (!S.hero && secs[0] && !claimed.has(secs[0])) { claimed.set(secs[0], 'hero'); S.hero = makeSec(secs[0]); }

  // ---------- 1. hero: bento tiles over the caricature background (Higgsfield still + its motion loop) ----------
  {
    const H = S.hero;
    if (H) H.take((b) => isHead(b) && norm(b.text) === norm(h1Text));
    // the short line right under the heading ("A West Side Jersey City Dispensary Made For You")
    const sub = H && H.take((b) => (b.type === 'p' || /^h[2-4]$/.test(b.type)) && stripTags(textOf(b)).length < 90 && !/<a\b/i.test(b.html || ''));
    const ledes = H ? H.takeAll((b) => b.type === 'p') : [];
    const btns = H ? H.takeAll((b) => b.type === 'button') : [];
    const del = btns.find((b) => /deliver/i.test(b.text)) || { text: (tb[0] || {}).label || 'Order for Delivery' };
    const pick = btns.find((b) => /pick/i.test(b.text)) || { text: (tb[1] || {}).label || 'Order for Pickup' };
    const other = btns.filter((b) => b !== del && b !== pick);
    // Phone pass: no autoplay and preload="none" (an autoplay video downloads in full at parse time, whatever preload
    // says); site.js plays data-inview-play videos while on screen and, with data-after-load, only after window load.
    // No poster: the still underneath shows until the first frame, and on phones that still IS the phone crop's frame 0.
    const loop = heroLoop && heroLoop.mp4
      ? `<video class="h-hero__loop" id="h-hero-loop" data-inview-play data-after-load muted loop playsinline preload="none" width="${escA(heroLoop.w || 1920)}" height="${escA(heroLoop.h || 1080)}" aria-hidden="true" tabindex="-1">${heroLoop.mp4Small ? `<source src="${escA(heroLoop.mp4Small)}" type="video/mp4" media="(max-width: 720px)">` : ''}<source src="${escA(heroLoop.mp4)}" type="video/mp4"></video>`
      : '';
    const stillSm = heroLoop && heroLoop.posterSmall ? `<source media="(max-width: 720px)" srcset="${escA(heroLoop.posterSmall)}" width="${escA(heroLoop.wSmall || 720)}" height="${escA(heroLoop.hSmall || 1080)}">` : '';
    const pair = typeof shell.serviceCards === 'function' ? shell.serviceCards(ctx, { h: 2, compact: true, reveal: true, cls: 'h-hero__pair' }) : '';
    // PASTE UP POP bento over a full-bleed background: the Higgsfield caricature still (shown under reduced motion and
    // before the video plays) and its motion loop fill the hero; the copy tile and the Delivery and Pickup tiles sit on
    // the calm paper half on the left, so the illustrated woman with the Lady L tote stays clear on the right
    html.hero = `<section class="h-hero h-hero--bg band band--paper" id="h-hero" aria-labelledby="h-hero-h1">
<div class="band__clip h-hero__clip" aria-hidden="true">
<picture class="h-hero__bgpic">${stillSm}${gimg('g-hero-caricature', { alt: '', eager: true, cls: 'h-hero__bgimg', sizes: '100vw', attrs: { fetchpriority: 'high' } })}</picture>
${loop}
</div>
<div class="wrap wrap--wide h-hero__inner h-hero__bento">
<div class="h-hero__copy">
<span class="h-dots h-hero__copydots" aria-hidden="true"></span>
<p class="kicker h-hero__kicker" data-reveal>${esc(addr.neighborhood || addr.city)}, ${esc(addr.city)}</p>
<h1 id="h-hero-h1" class="display h-hero__h1" data-reveal style="--i:1">${accent(h1Text, /electric/i)}</h1>
${sub ? `<p class="h-hero__sub" data-reveal style="--i:2">${accent(stripTags(textOf(sub)), /made for you/i)}</p>` : ''}
<div class="btn-row h-hero__ctas" data-reveal style="--i:3">
<a class="btn btn--sun h-hero__cta"${linkAttrs(menu(ctx))}>${ico('truck')}${esc(del.text)}</a>
<a class="btn btn--glass h-hero__cta"${linkAttrs(menu(ctx))}>${ico('bag')}${esc(pick.text)}</a>
</div>
${ledes.map((b, i) => `<p class="h-hero__lede" data-reveal style="--i:${4 + i}">${htmlOf(b)}</p>`).join('\n')}
${other.length ? `<p class="btn-row h-hero__more">${other.map((b) => `<a class="link-arrow"${linkAttrs(btnHref(ctx, b))}>${esc(b.text)}${ico('arrow')}</a>`).join('')}</p>` : ''}
${leftovers(ctx, H)}
</div>
${pair}
<div class="h-hero__cut" aria-hidden="true"><div class="h-hero__cut-in" data-depth="0.06">${gimg('g-bud-cut', { alt: '', cls: 'cut h-hero__cut-img', sizes: '(max-width: 720px) 96px, 180px' })}</div></div>
</div>
${loop ? `<div class="h-hero__ctrl"><button class="btn btn--glass btn--sm h-hero__toggle" type="button" data-video-toggle aria-controls="h-hero-loop" aria-pressed="false">${ico('pause')}<span class="video-toggle__label">Pause motion</span></button></div>` : ''}
</section>`;
  }

  // ---------- 2. shop by category: the 8 arch tiles from ia.nav Products ----------
  {
    const C = S.cats;
    const labels = new Set(cats.map((c) => norm(c.label)));
    if (C) { C.takeAll((b) => labels.has(norm(textOf(b)))); C.takeAll((b) => b.type === 'img'); }
    const head = C ? C.head() : 'shop by category';
    const intro = C ? C.takeAll((b) => b.type === 'p') : [];
    html.cats = `<section class="h-cats band band--newsprint" id="h-cats" aria-labelledby="h-cats-h">
<div class="band__clip" aria-hidden="true"><span class="h-cats__wash"></span><span class="grain"></span></div>
<div class="wrap wrap--wide">
<div class="h-head h-head--split">
<div data-reveal>${kicker('Shop')}<h2 class="display h-head__h" id="h-cats-h">${accent(head, /category/i)}</h2></div>
${intro.map((b, i) => `<p class="lede h-head__lede" data-reveal style="--i:${i + 1}">${htmlOf(b)}</p>`).join('')}
</div>
<ul class="h-cats__grid" role="list">
${cats.map((c, i) => `<li class="h-cats__item" data-reveal style="--i:${i % 4}"><a class="tile h-tile"${linkAttrs(c.href)} data-tilt><span class="tile__media h-tile__media">${gimg(c.gimg, { alt: '', sizes: '(max-width: 720px) 56vw, (max-width: 1100px) 24vw, 300px' })}</span><span class="tile__title h-tile__title">${esc(c.label)}</span><span class="tile__cta link-arrow h-tile__cta">Shop${ico('arrow')}</span></a></li>`).join('\n')}
</ul>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 3. Easy Steps: three Deco-numbered glass steps ("Be your higher self" moves to its own band) ----------
  let highGroup = null;
  if (S.steps) {
    const C = S.steps;
    const head = C.head();
    const { intro, items: all } = groups(C.rest());
    [...intro, ...all.flatMap((g) => [...g.pre, g.head, ...g.body])].forEach((b) => C.use(b));
    highGroup = S.high ? null : all.find((g) => /higher self/i.test(textOf(g.head)));
    const items = all.filter((g) => g !== highGroup);
    const STEP = [[/online|shop/i, 'cart', menu(ctx), 'Order online'], [/pick/i, 'bag', '/in-store-pickup/', 'Pickup details'], [/deliver/i, 'truck', '/service/', 'Delivery details']];
    const step = (g, i) => {
      const t = g.head.title || g.head.text || '';
      const hit = STEP.find((x) => x[0].test(t)) || [null, 'sparkle', '', ''];
      const btn = g.body.find((b) => b.type === 'button');
      const iconImg = g.pre.find(hasPhoto);
      return `<li class="h-step glass glass--lift" data-reveal data-spot style="--i:${i}">
<span class="numeral h-step__n" aria-hidden="true">${pad2(i + 1)}</span>
<span class="h-step__ico" aria-hidden="true">${iconImg ? pic(iconImg, { sizes: '64px', cls: 'h-step__img' }) : ico(hit[1])}</span>
<h3 class="h-step__t">${esc(t)}</h3>
${g.head.type === 'icon-box' && g.head.html ? `<div class="h-step__p">${rich(g.head.html)}</div>` : ''}
${blocksHtml(ctx, g.body.filter((b) => b !== btn && b.type !== 'img')).replace(/<p>/g, '<p class="h-step__p">')}
${btn ? `<a class="link-arrow h-step__go"${linkAttrs(btnHref(ctx, btn))}>${esc(btn.text)}${ico('arrow')}</a>` : hit[2] ? `<a class="link-arrow h-step__go"${linkAttrs(hit[2])}>${esc(hit[3])}${ico('arrow')}</a>` : ''}
</li>`;
    };
    html.steps = `<section class="h-steps band band--plum" id="h-steps" aria-labelledby="h-steps-h">
<div class="band__clip" aria-hidden="true"><span class="h-steps__fan"></span><span class="grain"></span></div>
<div class="wrap wrap--wide">
<div class="h-head h-head--center" data-reveal>${kicker('How it works')}<h2 class="display h-head__h" id="h-steps-h">${accent(head, /easy steps/i)}</h2>${intro.filter((b) => b.type !== 'img').length ? `<div class="lede h-head__lede">${blocksHtml(ctx, intro.filter((b) => b.type !== 'img'))}</div>` : ''}</div>
<ol class="h-steps__list" role="list">
${items.map(step).join('\n')}
</ol>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 4. Location & Hours: store + delivery hours as captured, contact, directions; the arch crosses the seam
  {
    const C = S.visit;
    const head = C ? C.head() : 'Location & Hours';
    const photoB = C && C.take((b) => b.type === 'img');
    const dirBtn = C && C.take((b) => b.type === 'button');
    const mapB = C && C.take((b) => b.type === 'embed' && b.kind === 'map');
    const hours = C ? C.takeAll((b) => b.type === 'hours') : [];
    const lines = C ? C.rest() : [];
    if (C) C.takeAll(() => true);
    const pool = [S.story, S.mom, S.why].filter(Boolean).flatMap((x) => x.blocks.filter((b) => b.type === 'img')).filter(hasPhoto);
    const archB = photoB && hasPhoto(photoB) ? photoB : pool[2] || null;
    const media = archB ? pic(archB, { sizes: '(max-width: 720px) 70vw, 440px' }) : gimg('g-hf-arch', { alt: '', sizes: '(max-width: 720px) 70vw, 440px' });
    html.visit = `<section class="h-visit band band--paper" id="location" aria-labelledby="h-visit-h">
<div class="band__clip" aria-hidden="true"><span class="h-visit__botanical"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-visit__grid">
<div class="h-visit__copy">
<div class="h-head" data-reveal>${kicker(addr.neighborhood ? `${addr.neighborhood}, ${addr.city}` : 'Visit')}<h2 class="display h-head__h" id="h-visit-h">${accent(head, /hours/i)}</h2></div>
<div class="h-visit__card glass glass--cream" data-reveal style="--i:1">
<div class="h-visit__hours">${hours.length ? hours.map((b) => hoursList(b)).join('') : hoursList({ title: 'Store Hours', rows: (site.hours || []).map((r) => [r.days, `${r.open} to ${r.close}`]) }) + hoursList({ title: 'Delivery Hours', rows: (site.deliveryHours || []).map((r) => [r.days, `${r.open} to ${r.close}`]) })}</div>
<div class="h-visit__lines">${blocksHtml(ctx, lines)}${mapB ? block(ctx, mapB) : ''}</div>
<div class="btn-row h-visit__ctas"><a class="btn btn--sun"${linkAttrs(site.mapUrl)}>${ico('pin')}${esc(dirBtn ? dirBtn.text : 'Get directions')}</a><a class="btn btn--deco"${linkAttrs('/in-store-pickup/')}>${ico('bag')}Pickup details</a></div>
</div>
</div>
<div class="h-visit__side protrude-wrap"><figure class="h-visit__arch arch arch--rainbow" data-reveal style="--i:2"><span class="arch__img">${media}</span></figure></div>
</div>
</section>`;
  }

  // ---------- 5. Be your higher self: feature band on the haze ----------
  if (S.high || highGroup) {
    const C = S.high;
    const head = C ? C.head() : textOf(highGroup.head);
    const body = C ? C.rest() : highGroup.body.filter((b) => b.type !== 'img');
    const ps = body.filter((b) => b.type === 'p');
    const btn = body.find((b) => b.type === 'button');
    const rest = body.filter((b) => !ps.includes(b) && b !== btn);
    if (C) C.takeAll(() => true);
    html.high = `<section class="h-high band band--yellow" id="h-high" aria-labelledby="h-high-h" data-sunburst>
<div class="band__clip" aria-hidden="true"><span class="h-dots h-high__dots"></span><span class="sunburst h-high__rays"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-high__bento">
<div class="h-high__inner">
${kicker('Feel good', 'h-high__kicker')}
<h2 class="display display--mega h-high__h" id="h-high-h" data-reveal>${accent(head, /higher self/i)}</h2>
${ps.map((b, i) => `<p class="lede h-high__p" data-reveal style="--i:${i + 1}">${htmlOf(b)}</p>`).join('')}
${btn ? `<p class="btn-row h-high__ctas" data-reveal style="--i:3"><a class="btn btn--sun"${linkAttrs(btnHref(ctx, btn))}>${esc(btn.text)}${extIco(btnHref(ctx, btn))}</a></p>` : ''}
${rest.length ? `<div class="h-extra prose">${blocksHtml(ctx, rest)}</div>` : ''}
</div>
<figure class="h-high__shot" aria-hidden="true" data-reveal style="--i:2"><span class="h-high__media">${gimg('g-haze', { alt: '', cls: 'h-high__bg', sizes: '(max-width: 720px) 88vw, 480px' })}</span><span class="h-tape h-tape--top"></span></figure>
<div class="h-high__moon" aria-hidden="true"><div data-depth="0.1">${gimg('g-moon-cut', { alt: '', cls: 'cut h-high__moon-img', sizes: '(max-width: 720px) 80px, 150px' })}</div></div>
</div>
</section>`;
  }

  // ---------- 6. the story tabs: Built From the West Side Up / mom & pop / Why Choose Us ----------
  {
    const tabs = [['story', 'Our Story', /west side\s*up/i], ['mom', 'Mom & Pop', /mom &amp; pop/i], ['why', 'Why Choose Us', /choose us/i]].filter(([k]) => S[k]);
    if (tabs.length) {
      const panels = tabs.map(([k, , re], i) => {
        const C = S[k];
        const head = C.head();
        const imgs = C.takeAll((b) => b.type === 'img');
        const btns = C.takeAll((b) => b.type === 'button');
        const body = blocksHtml(ctx, C.rest());
        C.takeAll(() => true);
        return { k, imgs, html: `<div class="h-tabs__panel" role="tabpanel" id="h-panel-${k}" aria-labelledby="h-tab-${k}" tabindex="0"${i ? ' hidden' : ''}>
<h2 class="display h-tabs__h">${accent(head, re)}</h2>
<div class="prose h-tabs__body">${body}</div>
${btns.length ? `<p class="btn-row h-tabs__ctas">${btns.map((b, j) => `<a class="btn ${j ? 'btn--deco' : 'btn--sun'}"${linkAttrs(btnHref(ctx, b))}>${esc(b.text)}${extIco(btnHref(ctx, b))}</a>`).join('')}</p>` : ''}
</div>` };
      });
      const photos = panels.flatMap((p) => p.imgs).filter(hasPhoto);
      const main = photos[0] ? pic(photos[0], { sizes: '(max-width: 720px) 80vw, 480px' }) : gimg('g-hf-mirror', { alt: '', sizes: '(max-width: 720px) 80vw, 480px' });
      const second = photos[1] ? pic(photos[1], { sizes: '(max-width: 720px) 40vw, 220px' }) : gimg('g-hf-arch', { alt: '', sizes: '(max-width: 720px) 40vw, 220px' });
      html.story = `<section class="h-story band band--newsprint" id="h-story" aria-label="About Lady L">
<div class="band__clip" aria-hidden="true"><span class="h-story__botanical"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-story__grid">
<div class="h-story__media" data-reveal>
<figure class="arch arch--rainbow h-story__arch"><span class="arch__img">${main}</span></figure>
<figure class="arch h-story__arch2" data-depth="0.08"><span class="arch__img">${second}</span></figure>
<span class="h-story__badge glass" aria-hidden="true">${ico('sparkle')}</span>
</div>
<div class="h-story__tabs" data-tabs data-reveal style="--i:1">
${kicker('About Lady L')}
<div class="h-tabs__list" role="tablist" aria-label="About Lady L">
${tabs.map(([k, label], i) => `<button class="h-tabs__tab" type="button" role="tab" id="h-tab-${k}" aria-controls="h-panel-${k}" aria-selected="${i ? 'false' : 'true'}"${i ? ' tabindex="-1"' : ''}>${esc(label)}</button>`).join('')}
</div>
${panels.map((p) => p.html).join('\n')}
</div>
</div>
</section>`;
    }
  }

  // ---------- 7. Deals & Discounts: the discount types as Deco chips, CTA /rewards/ ----------
  if (S.deals) {
    const C = S.deals;
    const head = C.head();
    C.takeAll((b) => b.type === 'img'); // the repeated decorative frame icon
    const lists = C.takeAll((b) => b.type === 'ul' || b.type === 'ol');
    const shorties = C.takeAll((b) => (b.type === 'p' || /^h[3-4]$/.test(b.type)) && stripTags(textOf(b)).length < 48 && !/[.!?]$/.test(stripTags(textOf(b)).trim()));
    const chips = [...lists.flatMap((l) => (l.items || []).map((it) => (typeof it === 'string' ? rich(it) : htmlOf(it)))), ...shorties.map(htmlOf)];
    const ps = C.takeAll((b) => b.type === 'p');
    const btns = C.takeAll((b) => b.type === 'button');
    html.deals = `<section class="h-deals band band--night" id="h-deals" aria-labelledby="h-deals-h" data-sunburst>
<span class="h-torn h-torn--deals" aria-hidden="true"></span>
<div class="band__clip" aria-hidden="true"><span class="sunburst h-deals__rays"></span><span class="h-deals__glow"></span><span class="grain"></span></div>
<div class="h-deals__bud protrude" aria-hidden="true"><div data-depth="0.14">${gimg('g-bud-cut', { alt: '', cls: 'cut h-deals__bud-img', sizes: '(max-width: 720px) 100px, 200px' })}</div></div>
<div class="wrap wrap--wide h-deals__grid">
<div class="h-deals__copy">
<div class="h-head" data-reveal>${kicker('Deals')}<h2 class="display h-head__h" id="h-deals-h">${accent(head, /discounts/i)}</h2></div>
<div class="prose h-deals__prose" data-reveal style="--i:1">${ps.map((b) => `<p>${htmlOf(b)}</p>`).join('')}</div>
</div>
<div class="h-deals__panel glass" data-reveal style="--i:2" data-spot>
<ul class="h-deals__chips" role="list">${chips.map((c) => `<li class="h-chip"><span class="h-chip__ico" aria-hidden="true">${ico('diamond')}</span><span class="h-chip__t">${c}</span></li>`).join('')}</ul>
<div class="btn-row h-deals__ctas"><a class="btn btn--sun"${linkAttrs('/rewards/')}>${ico('gift')}Rewards</a><a class="btn btn--deco"${linkAttrs('/jersey-city-weed-deals/')}>Deals${ico('arrow')}</a>${btns.map((b) => `<a class="link-arrow"${linkAttrs(btnHref(ctx, b))}>${esc(b.text)}${ico('arrow')}</a>`).join('')}</div>
</div>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 8. shop by brand: the captured brand logos (de-duplicated) on a marquee of glass chips + Shop Now ----------
  if (S.brand) {
    const C = S.brand;
    const head = C.head();
    const seen = new Set();
    const logos = C.takeAll((b) => b.type === 'img').filter((b) => (seen.has(b.src) ? false : seen.add(b.src)));
    const btns = C.takeAll((b) => b.type === 'button');
    const shown = logos.filter(hasPhoto);
    const chip = (b) => `<li class="h-brand__logo glass glass--cream">${pic(b, { sizes: '160px', cls: 'h-brand__img', alt: '' })}</li>`;
    html.brand = `<section class="h-brand band band--paper" id="h-brand" aria-labelledby="h-brand-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap wrap--wide h-brand__row">
<div class="h-head" data-reveal>${kicker('Brands')}<h2 class="display h-head__h" id="h-brand-h">${accent(head, /brand/i)}</h2></div>
<p class="btn-row h-brand__ctas" data-reveal style="--i:1">${btns.map((b) => `<a class="btn btn--sun"${linkAttrs(btnHref(ctx, b))}>${esc(b.text)}${extIco(btnHref(ctx, b))}</a>`).join('')}</p>
</div>
${shown.length || MISSING_OK ? `<div class="marquee h-brand__marquee" data-marquee aria-label="Brands on the menu" role="region"><div class="marquee__track h-brand__track"><ul class="h-brand__logos" role="list">${(shown.length ? shown : logos).map(chip).join('')}</ul><ul class="h-brand__logos" role="list" aria-hidden="true">${(shown.length ? shown : logos).map(chip).join('')}</ul></div></div>` : ''}
${leftovers(ctx, C)}
</section>`;
  }

  // ---------- 9. After You Visit: six spot cards with their outbound links ----------
  if (S.spots) {
    const C = S.spots;
    const head = C.head();
    const cards = C.takeAll((b) => b.type === 'card');
    const intro = C.takeAll((b) => b.type === 'p');
    const card = (b, i) => {
      const u = b.href ? liveHref(b.href) : '';
      const im = b.img && hasPhoto(b.img) ? b.img : null;
      return `<li class="h-spot glass glass--cream glass--lift" data-reveal data-spot data-tilt style="--i:${i % 3}">
${im ? `<span class="h-spot__media">${pic(im, { sizes: '(max-width: 720px) 80vw, 380px' })}</span>` : ''}
<span class="h-spot__n numeral" aria-hidden="true">${pad2(i + 1)}</span>
<h3 class="h-spot__t">${u ? `<a class="h-spot__link"${linkAttrs(u)}>${esc(b.title || '')}${extIco(u)}</a>` : esc(b.title || '')}</h3>
${b.html ? `<p class="h-spot__p">${rich(b.html)}</p>` : ''}
</li>`;
    };
    html.spots = `<section class="h-spots band band--newsprint" id="h-spots" aria-labelledby="h-spots-h">
<div class="band__clip" aria-hidden="true"><span class="h-spots__rainbow"></span><span class="grain"></span></div>
<div class="wrap wrap--wide">
<div class="h-head h-head--split"><div data-reveal>${kicker('The West Side')}<h2 class="display h-head__h" id="h-spots-h">${accent(head, /more for you/i)}</h2></div>${intro.length ? `<div class="lede h-head__lede prose" data-reveal style="--i:1">${intro.map((b) => `<p>${htmlOf(b)}</p>`).join('')}</div>` : ''}</div>
<ul class="h-spots__grid" role="list">
${cards.map(card).join('\n')}
</ul>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 10. reviews: verbatim .rcards + the rating line ----------
  const R = site.reviews || {};
  if (S.reviews) {
    const C = S.reviews;
    const head = C.head();
    const revs = C.takeAll((b) => b.type === 'review');
    const ratingB = C.take((b) => norm(textOf(b)) === String(R.rating || '5.0'));
    const countB = C.take((b) => norm(textOf(b)) === `(${R.count})`);
    const writeB = C.take((b) => /write a review/i.test(textOf(b)));
    const badge = C.take((b) => b.type === 'img');
    const intro = C.takeAll((b) => b.type === 'p');
    html.reviews = `<section class="h-reviews band band--paper" id="h-reviews" aria-labelledby="h-reviews-h">
<div class="band__clip" aria-hidden="true"><span class="h-reviews__fan"></span><span class="grain"></span></div>
<div class="wrap wrap--wide">
<div class="h-head h-head--split">
<div data-reveal>${kicker('Reviews')}<h2 class="display h-head__h" id="h-reviews-h">${accent(head, /saying/i)}</h2>${intro.map((b) => `<p class="lede h-head__lede">${htmlOf(b)}</p>`).join('')}</div>
<div class="h-rating glass glass--cream" data-reveal style="--i:1">
<span class="h-rating__num">${esc(ratingB ? textOf(ratingB) : R.rating)}</span>
<span class="h-rating__mid">${stars(5)}<span class="h-rating__meta"><span class="h-rating__count">${esc(countB ? textOf(countB) : `(${R.count})`)}</span><span class="h-rating__g">${ico('google')}${esc(R.platform || 'Google')}</span></span></span>
<a class="btn btn--deco btn--sm h-rating__write"${linkAttrs(writeB && writeB.href ? liveHref(writeB.href) : R.url)}>${esc(writeB ? textOf(writeB) : 'write a review')}${ico('ext', 'ico--ext')}</a>
</div>
</div>
<ul class="h-reviews__grid" role="list">
${revs.map((r, i) => rcard(r, i)).join('\n')}
</ul>
<p class="h-reviews__more" data-reveal><a class="link-arrow"${linkAttrs('/about-us/reviews/')}>All reviews${ico('arrow')}</a></p>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- the captured sign-up block (home's own newsletter form, a demo form) ----------
  if (S.join) {
    const C = S.join;
    const head = C.head();
    const form = C.take((b) => b.type === 'form');
    const hours = C.takeAll((b) => b.type === 'hours');
    const info = blocksHtml(ctx, C.rest());
    C.takeAll(() => true);
    html.join = `<section class="h-join band band--sun" id="h-join" aria-labelledby="h-join-h" data-sunburst>
<span class="fringe-edge fringe-edge--linen" aria-hidden="true"></span>
<div class="band__clip" aria-hidden="true"><span class="sunburst h-join__rays"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-join__grid">
<div class="h-join__copy" data-reveal>${kicker('Sign up')}<h2 class="display h-head__h" id="h-join-h">${accent(head, /updates/i)}</h2>
<div class="h-join__info">${info}</div>
<div class="h-join__hours">${hours.map((b) => hoursList(b)).join('')}</div>
</div>
<div class="h-join__panel glass" data-reveal style="--i:1">${form ? formHtml(form, 'home-signup') : ''}</div>
</div>
</section>`;
  }

  // ---------- 11. Instagram: the captured posts as cards linking out (no embed scripts) ----------
  if (S.insta) {
    const C = S.insta;
    const head = C.head();
    const posts = C.takeAll((b) => b.type === 'embed' || (b.type === 'img' && b.href));
    const btns = C.takeAll((b) => b.type === 'button');
    const intro = C.takeAll((b) => b.type === 'p');
    const post = (b, i) => {
      const u = b.src && /instagram\.com/i.test(b.src) ? b.src : b.href ? liveHref(b.href) : igUrl;
      const cap = String(b.note || b.shown || '').trim();
      const reel = /\/reel\//.test(u) || b.media === 'video';
      return `<li class="h-insta__item" data-reveal style="--i:${i % 4}"><a class="h-post glass glass--lift"${linkAttrs(u)} data-tilt data-spot>
<span class="h-post__top"><span class="h-post__ico">${ico('instagram')}</span><span class="h-post__kind">${reel ? 'Reel' : 'Post'}</span>${ico('ext', 'ico--ext')}</span>
${cap ? `<span class="h-post__cap">${esc(cap)}</span>` : `<span class="h-post__cap">${esc(insta.handle || 'Instagram')}</span>`}
<span class="h-post__go">View on Instagram${ico('arrow')}</span>
<span class="h-post__deco h-post__deco--${i % 4}" aria-hidden="true"></span>
</a></li>`;
    };
    html.insta = `<section class="h-insta band band--newsprint" id="h-insta" aria-labelledby="h-insta-h">
<div class="band__clip" aria-hidden="true"><span class="h-insta__glow"></span><span class="grain"></span></div>
<div class="wrap wrap--wide">
<div class="h-head h-head--split"><div data-reveal>${kicker(insta.handle || 'Instagram')}<h2 class="display h-head__h" id="h-insta-h">${accent(head, /instagram/i)}</h2>${intro.map((b) => `<p class="lede h-head__lede">${htmlOf(b)}</p>`).join('')}</div>
<p class="btn-row" data-reveal style="--i:1">${btns.map((b) => `<a class="btn btn--sun"${linkAttrs(btnHref(ctx, b, igUrl))}>${ico('instagram')}${esc(b.text)}${extIco(btnHref(ctx, b, igUrl))}</a>`).join('')}</p></div>
<ul class="h-insta__grid" role="list">
${posts.map(post).join('\n')}
</ul>
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 12. FAQ: every Q&A as .faq accordions + FAQPage JSON-LD ----------
  let faqLd = null;
  if (S.faq) {
    const C = S.faq;
    const head = C.head();
    let items = C.takeAll((b) => b.type === 'faq').flatMap((b) => b.items || []);
    if (!items.length) {
      const { items: g } = groups(C.rest(), (b) => isHead(b) && /\?\s*$/.test(textOf(b)));
      g.forEach((x) => { C.use(x.head); [...x.pre, ...x.body].forEach((b) => C.use(b)); });
      items = g.map((x) => ({ q: x.head.text, a_html: x.body.map((b) => block(ctx, b)).join('') }));
    }
    const intro = C.takeAll((b) => b.type === 'p');
    const ldText = (h) => stripTags(String(h || '').replace(/<\/(p|li|h\d)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ')).replace(/\s+/g, ' ').trim();
    faqLd = items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: ldText(it.a_html) } })) } : null;
    html.faq = `<section class="h-faq band band--paper" id="faq" aria-labelledby="h-faq-h">
<div class="band__clip" aria-hidden="true"><span class="h-faq__botanical"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-faq__grid">
<div class="h-faq__side">
<div class="h-head" data-reveal>${kicker('Questions')}<h2 class="display h-head__h" id="h-faq-h">${accent(head, /faq/i)}</h2>${intro.map((b) => `<p class="lede">${htmlOf(b)}</p>`).join('')}</div>
<p class="btn-row" data-reveal style="--i:1"><a class="btn btn--deco"${linkAttrs('/faq/')}>All FAQs${ico('arrow')}</a><a class="link-arrow"${linkAttrs('/contact-us/')}>Contact Us${ico('arrow')}</a></p>
<div class="h-faq__leaf" aria-hidden="true"><div>${gimg('g-leaf-cut', { alt: '', cls: 'cut h-faq__leaf-img', sizes: '(max-width: 720px) 120px, 240px' })}</div></div>
</div>
${faqItems(items)}
${leftovers(ctx, C)}
</div>
</section>`;
  }

  // ---------- 13. Stop By, Stay High: the directions band ----------
  if (S.stop) {
    const C = S.stop;
    const head = C.head();
    const lead = C.take((b) => b.type === 'p' && stripTags(textOf(b)).length > 120);
    const btns = C.takeAll((b) => b.type === 'button');
    const hours = C.takeAll((b) => b.type === 'hours');
    const info = blocksHtml(ctx, C.rest());
    C.takeAll(() => true);
    html.stop = `<section class="h-stop band band--night" id="h-stop" aria-labelledby="h-stop-h">
<div class="band__clip" aria-hidden="true"><span class="h-dots h-stop__dots"></span><span class="grain"></span></div>
<div class="wrap wrap--wide h-stop__grid">
<div class="h-stop__copy" data-reveal>${kicker('Directions')}<h2 class="display h-head__h" id="h-stop-h">${accent(head, /stay high/i)}</h2>${lead ? `<p class="lede">${htmlOf(lead)}</p>` : ''}
<p class="btn-row h-stop__ctas"><a class="btn btn--sun"${linkAttrs(site.mapUrl)}>${ico('pin')}Get directions${ico('ext', 'ico--ext')}</a>${btns.map((b) => `<a class="btn btn--glass"${linkAttrs(btnHref(ctx, b))}>${esc(b.text)}${extIco(btnHref(ctx, b))}</a>`).join('')}</p></div>
<div class="h-stop__card glass" data-reveal style="--i:1" data-spot>
<div class="h-stop__hours">${hours.map((b) => hoursList(b)).join('')}</div>
<div class="h-stop__info">${info}</div>
</div>
</div>
</section>`;
  }

  // ---------- assemble in the adopted order; unclaimed sections follow the claimed one they followed live ----------
  const ORDER = ['hero', 'cats', 'steps', 'visit', 'high', 'story', 'deals', 'brand', 'spots', 'reviews', 'join', 'insta', 'faq', 'stop'];
  const KEY_OF = { mom: 'story', why: 'story' };
  const after = new Map();
  let prev = 'hero';
  for (const s of secs) {
    if (claimed.has(s)) { prev = KEY_OF[claimed.get(s)] || claimed.get(s); continue; }
    const S2 = makeSec(s);
    const head = S2.head();
    const out = `<section class="h-misc band band--paper"${head ? ` aria-label="${escA(head)}"` : ''}><div class="wrap wrap--narrow prose">${head ? `<h2 class="display h-head__h">${esc(head)}</h2>` : ''}${blocksHtml(ctx, S2.rest())}</div></section>`;
    after.set(prev, (after.get(prev) || '') + out);
  }
  const main = ORDER.map((k) => (html[k] || '') + (after.get(k) || '')).filter(Boolean).join('\n');

  // ---------- head: captured title + description verbatim; LocalBusiness + FAQPage JSON-LD ----------
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    url: site.origin,
    telephone: site.phone,
    email: site.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: addr.street, addressLocality: addr.city, addressRegion: addr.state, postalCode: addr.zip, addressCountry: 'US' },
    openingHoursSpecification: (site.hoursSchema || []).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.dayOfWeek, opens: h.opens, closes: h.closes })),
    hasMap: site.mapUrl || undefined,
    sameAs: (site.socials || []).map((x) => x.url),
  };
  const title = (home && home.title) || `${site.name} | ${(site.altNames || [])[0] || site.name}`;
  const description = (home && home.description) || `${site.name}, ${addrLine}.`;
  const out = shell.page({
    ctx,
    path: '/',
    title,
    description,
    og: { title, description, type: 'website' },
    jsonld: [ld, faqLd].filter(Boolean),
    bodyClass: 'h-page',
    main,
    crumbs: [],
    noPrefooter: S.join ? 'newsletter' : false,
    preload: [], // the hero still is an eager <img fetchpriority=high> (a <source> on phones) found by the preload scanner
  });
  return [{ path: '/', html: out }];
}
