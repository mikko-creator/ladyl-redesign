// services.mjs - SERVICES lane: /service/ (Lady L's delivery hub), /service/<town>/ (the town delivery pages),
// /in-store-pickup/ (NEW, the adopted Pickup slot), /new-jersey/ (hub) and /new-jersey/<place>/ ("Dispensary Near").
// Captured pages print every word of their JSON (src/content/{pages,delivery,places}); new words are glue labels only.
// Layout: the inner-page hero (night + rays, one protrusion), then alternating DAY / NIGHT bands built from the
// captured sections: h3 runs become glass cards, "Step N" runs Deco numerals, faq blocks accordions. Classes: v-.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as shell from './shell.mjs';
import { esc, escA, linkAttrs, isExternal, gimg, img, hasGenerated, stripTags, absUrl, menu, rewriteLinks, liveHref, directionsFrom, slugify, href } from './util.mjs';

const { page, crumbsHtml, icon, hoursHtml } = shell;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOME = { href: '/', label: 'Home' };
const SVC = { href: '/service/', label: 'Weed Delivery' };
const NJ = { href: '/new-jersey/', label: 'New Jersey Areas We Serve' };

// ---------- small helpers ----------
const norm = (s) => stripTags(String(s ?? '')).replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const isHead = (b) => b && /^h[1-6]$/.test(b.type || '');
const textOf = (b) => norm(b.text ?? b.html ?? '');
const itemHtml = (it) => (typeof it === 'string' ? it : it && (it.html || esc(it.text || '')) || '');
const photoOk = (src) => !!src && /^\/assets\//.test(String(src)) && fs.existsSync(path.join(ROOT, String(src).replace(/^\//, '').split(/[?#]/)[0]));
const gen = (ids, opts = {}) => { const list = [].concat(ids); return gimg(list.find((id) => hasGenerated(id)) || list[list.length - 1], opts); };
const isOrder = (t) => /^order\b/i.test(norm(t));
const extIco = (u) => (isExternal(u) && !/^(tel|mailto):/i.test(u) ? icon('ext') : icon('arrow'));
const county = (c) => String(c || '').replace(/\s*county\b.*$/i, '').trim();
const countyId = (c) => 'county-' + slugify(county(c));
const deliveryHours = (ctx, cls = '') => (typeof shell.deliveryHoursHtml === 'function' ? shell.deliveryHoursHtml(ctx, cls)
  : `<ul class="hours hours--delivery ${cls}">${(ctx.site.deliveryHours || []).map((r) => `<li><span class="hours__d">${esc(r.days)}</span><span class="hours__t">${esc(r.open)} to ${esc(r.close)}</span></li>`).join('')}</ul>`);
const addrLine = (s) => { const a = s.address || {}; return `${a.street}, ${a.city}, ${a.state} ${a.zip}`; };

function serviceCards(ctx, opts = {}) {
  if (typeof shell.serviceCards === 'function') return shell.serviceCards(ctx, opts);
  const s = ctx.site; const d = s.delivery || {}; const p = s.pickup || {};
  const card = (k, ico, title, facts, label, info) => `<article class="svc svc--${k} glass glass--lift" data-reveal><span class="svc__icon" aria-hidden="true">${icon(ico)}</span><h3 class="svc__title">${esc(title)}</h3><ul class="svc__facts">${facts.filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('')}</ul><div class="svc__cta btn-row"><a class="btn btn--sun btn--sm"${linkAttrs(menu(ctx))}>${esc(label)}${icon('ext')}</a><a class="link-arrow"${linkAttrs(info)}>Details${icon('arrow')}</a></div></article>`;
  return `<div class="svc-pair">${card('delivery', 'truck', 'Weed Delivery', [d.window, d.minimum, d.id, s.lastCall], 'Order for Delivery', '/service/')}${card('pickup', 'bag', 'In-Store Pickup', [p.order, s.lastCall], 'Order for Pickup', '/in-store-pickup/')}</div>`;
}

function btn(ctx, b, cls = 'btn--glass') {
  const u = isOrder(b.text) ? menu(ctx) : liveHref(b.href || '') || menu(ctx);
  return `<a class="btn ${cls}"${linkAttrs(u)}>${esc(norm(b.text))}${extIco(u)}</a>`;
}
const glueBtn = (u, label, cls = 'btn--sun') => `<a class="btn ${cls}"${linkAttrs(u)}>${esc(label)}${extIco(u)}</a>`;

function photoFig(b, cls = '') {
  if (!photoOk(b.src)) return '';
  return `<figure class="arch v-fig ${cls}" data-reveal><span class="arch__img">${img({ src: b.src, alt: norm(b.alt), w: b.w, h: b.h }, { sizes: '(min-width: 1024px) 420px, 80vw' })}</span></figure>`;
}

function faqHtml(b) {
  return `<div class="faq v-faq">${(b.items || []).map((it, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(norm(it.q))}</summary><div class="faq__a">${rewriteLinks(it.a_html || esc(it.a || ''))}</div></details>`).join('\n')}</div>`;
}

// one captured block -> html (headings shift so the section heading stays the only h2)
function block(ctx, b, st = {}) {
  switch (b.type) {
    case 'p': return `<p>${rewriteLinks(b.html ?? esc(b.text || ''))}</p>`;
    case 'h1': return `<p class="v-sub">${esc(b.text)}</p>`;
    case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': { const n = Math.min(6, Math.max(st.min || 3, Number(b.type[1]))); return `<h${n} class="v-h">${esc(b.text)}</h${n}>`; }
    case 'ul': case 'ol': {
      const items = b.items || [];
      const check = items.length > 0 && items.every((it) => /^\s*[✔✓✅]/.test(norm(itemHtml(it))));
      return `<${b.type} class="v-list${check ? ' v-list--check' : ''}">${items.map((it) => `<li>${rewriteLinks(itemHtml(it))}</li>`).join('')}</${b.type}>`;
    }
    case 'img': return photoFig(b);
    case 'button': return `<p class="btn-row">${btn(ctx, b, st.btnCls || 'btn--sun')}</p>`;
    case 'faq': return faqHtml(b);
    case 'quote': return `<blockquote class="v-quote"><p>${rewriteLinks(b.html ?? esc(b.text || ''))}</p>${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`;
    case 'icon-box': return `<div class="v-ibox">${b.title ? `<h3 class="v-h">${esc(b.title)}</h3>` : ''}${b.html ? `<div>${rewriteLinks(b.html)}</div>` : ''}</div>`;
    case 'review': return `<blockquote class="v-quote"><p>${esc(b.text)}</p><cite>${esc(b.name || '')}${b.platform ? ', ' + esc(b.platform) : ''}</cite></blockquote>`;
    case 'card': return `<div class="v-ibox">${b.title ? `<h3 class="v-h">${b.href ? `<a${linkAttrs(liveHref(b.href))}>${esc(b.title)}</a>` : esc(b.title)}</h3>` : ''}${b.html ? `<p>${rewriteLinks(b.html)}</p>` : ''}</div>`;
    case 'hours': return `<div class="v-hrs">${b.title ? `<p class="v-facts__h">${esc(b.title)}</p>` : ''}<ul class="hours v-rows">${(b.items && b.items.length ? b.items.map((t) => `<li><span class="hours__d">${rewriteLinks(itemHtml(t))}</span></li>`) : (b.rows || []).map((r) => `<li>${[].concat(r).map((c, i) => `<span class="${i ? 'hours__t' : 'hours__d'}">${esc(c)}</span>`).join('')}</li>`)).join('')}</ul></div>`;
    case 'table': return `<ul class="hours v-rows">${(b.rows || []).map((r) => `<li>${[].concat(r).map((c, i) => `<span class="${i ? 'hours__t' : 'hours__d'}">${esc(c)}</span>`).join('')}</li>`).join('')}</ul>`;
    case 'video': case 'embed': case 'form': return b.text || b.html ? `<p>${rewriteLinks(b.html ?? esc(b.text))}</p>` : '';
    default: return b.html ? `<div>${rewriteLinks(b.html)}</div>` : b.text ? `<p>${esc(b.text)}</p>` : '';
  }
}
// consecutive buttons share one row
function blocks(ctx, list, st = {}) {
  const out = [];
  let row = [];
  const flush = () => { if (row.length) out.push(`<div class="btn-row v-btns">${row.join('')}</div>`); row = []; };
  list.forEach((b, i) => {
    if (b.type === 'button') { row.push(btn(ctx, b, row.length || st.alt ? (st.btnAlt || 'btn--deco') : (st.btnCls || 'btn--sun'))); return; }
    flush();
    out.push(block(ctx, b, st));
  });
  flush();
  return out.join('\n');
}

// ---------- captured page -> hero blocks + segments ----------
function flatten(rec) {
  const h1 = key(rec.h1);
  const secs = rec.sections || [];
  let s0 = secs.findIndex((s) => key(s.heading) === h1 || (s.blocks || []).some((b) => b.type === 'h1' && key(b.text) === h1));
  if (s0 < 0 && secs[0] && !norm(secs[0].heading)) s0 = 0;
  const hero = []; const rest = [];
  secs.forEach((s, i) => {
    const head = norm(s.heading);
    const bl = s.blocks || [];
    const dup = !head || key(head) === h1 || bl.some((b) => [b.text, b.title].some((t) => typeof t === 'string' && key(t) === key(head)));
    const list = [];
    if (!dup) list.push({ type: 'h2', text: s.heading });
    for (let b of bl) {
      if (b.type === 'h1' && key(b.text) === h1) continue;
      // a paragraph that is only bold text ("<strong>Step 1: ...</strong>") is a heading on the page
      if (b.type === 'p' && /^\s*(<(strong|b)>[^<]*<\/\2>\s*)+$/i.test(String(b.html || '')) && norm(b.html).length <= 90) b = { type: 'h3', text: norm(b.html) };
      list.push(isHead(b) && key(b.text) === key(head) && i !== s0 ? { ...b, type: 'h2' } : b);
    }
    (i === s0 ? hero : rest).push(...list);
  });
  // a hero section that runs on past its intro (an h2 after a paragraph) hands the rest to the segments
  const cut = hero.findIndex((b, i) => b.type === 'h2' && hero.slice(0, i).some((x) => x.type === 'p'));
  if (cut > 0) rest.unshift(...hero.splice(cut));
  return { hero, segs: segmentize(rest) };
}
function segmentize(list) {
  const segs = []; let cur = { head: null, blocks: [] };
  for (const b of list) {
    if (b.type === 'h2') { if (cur.head || cur.blocks.length) segs.push(cur); cur = { head: b, blocks: [] }; continue; }
    cur.blocks.push(b);
  }
  if (cur.head || cur.blocks.length) segs.push(cur);
  return segs;
}
// hero blocks: headings before the first paragraph = sublines, buttons = CTAs, the first short paragraph = lede,
// everything else goes to the intro band
function heroParts(list) {
  const subs = []; const ctas = []; const intro = []; let lede = null; let pic = null; let seenP = false;
  for (const b of list) {
    if (isHead(b) && !seenP) { subs.push(b); continue; }
    if (b.type === 'button') { ctas.push(b); continue; }
    if (b.type === 'img' && !pic && photoOk(b.src)) { pic = b; continue; }
    if (b.type === 'p' && !seenP && !lede && norm(b.html).length <= 190) { lede = b; seenP = true; continue; }
    if (b.type === 'p') seenP = true;
    intro.push(b);
  }
  return { subs, ctas, intro, lede, pic };
}
// h3 runs, card blocks and small-icon + paragraph pairs -> items; trailing blocks after the last item's usual body go
// back to the section (tail)
const smallImg = (b) => b && b.type === 'img' && photoOk(b.src) && (+b.w || 0) <= 420;
const shortP = (b) => b && b.type === 'p' && norm(b.html).length <= 34 && !/[.!?]$/.test(norm(b.html));
function itemize(list) {
  const lvl = ['h3', 'h4'].find((t) => list.filter((b) => b.type === t).length >= 2) || 'h3';
  const starts = list.filter((b, i) => b.type === lvl || b.type === 'card' || (smallImg(b) && list[i + 1] && list[i + 1].type === 'p')).length;
  if (starts < 2) return null;
  const lead = []; const items = []; let cur = null; let pic = null;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.type === 'card') { cur = { card: b, head: { text: b.title || '' }, body: [] }; items.push(cur); continue; }
    if (smallImg(b) && list[i + 1] && (list[i + 1].type === lvl || list[i + 1].type === 'p')) {
      if (list[i + 1].type === lvl) { pic = b; continue; }
      if (shortP(list[i + 1])) { cur = { pic: b, head: { text: norm(list[i + 1].html) }, body: [] }; i++; } else cur = { pic: b, head: null, body: [] };
      items.push(cur); continue;
    }
    if (b.type === lvl) {
      if (cur && !cur.body.length && cur.head && /^step\s*\d+\s*:?\s*$/i.test(norm(cur.head.text))) { cur.title = b; continue; }
      cur = { head: b, body: [], pic }; pic = null; items.push(cur); continue;
    }
    if (pic) { (cur ? cur.body : lead).push(pic); pic = null; }
    if (cur) cur.body.push(b); else lead.push(b);
  }
  if (pic) (cur ? cur.body : lead).push(pic);
  let tail = [];
  if (items.length > 2) {
    const sizes = items.slice(0, -1).map((it) => it.body.filter((b) => b.type !== 'button').length).sort((a, b) => a - b);
    const med = sizes[Math.floor(sizes.length / 2)] || 1;
    const last = items[items.length - 1];
    const keepN = last.body.findIndex((b, i) => last.body.slice(0, i + 1).filter((x) => x.type !== 'button').length > med);
    if (keepN > 0) { tail = last.body.slice(keepN); last.body = last.body.slice(0, keepN); }
    while (last.body.length && last.body[last.body.length - 1].type === 'button' && !items.slice(0, -1).some((it) => it.body.some((b) => b.type === 'button'))) tail.unshift(last.body.pop());
  }
  return { lvl, lead, items, tail };
}

// ---------- category thumbnails for menu cards ----------
const CATS = [[/infused/i, 'g-infused'], [/pre-?rolls?/i, 'g-prerolls'], [/^flower|dried flower/i, 'g-flower'], [/edible|gumm/i, 'g-edibles'], [/vape|vapor/i, 'g-vapes'], [/tincture|topical/i, 'g-tinctures'], [/concentrate|rso|resin/i, 'g-concentrates'], [/accessor/i, 'g-accessories']];
const catOf = (t) => (CATS.find(([re]) => re.test(norm(t))) || [])[1] || null;

// ---------- page hero (FOUNDATION .page-hero: night ground, rays, chevron edge, overhanging art) ----------
function hero({ crumbs, kicker = '', h1, subs = '', lede = '', ctas = [], side = '', art = '', pro = '', mod = '' }) {
  return `<section class="page-hero v-hero ${mod}" data-spot data-sunburst>
<div class="band__clip" aria-hidden="true"><span class="v-hero__glow"></span><span class="grain"></span></div>
<div class="wrap page-hero__inner${side || art ? '' : ' page-hero__inner--solo'}">
<div class="page-hero__text v-hero__text" data-reveal>
${crumbsHtml(crumbs)}
${kicker ? `<p class="kicker">${kicker}</p>` : ''}
<h1 class="display v-hero__h1">${h1}</h1>
${subs}
${lede ? `<p class="page-hero__lede lede">${lede}</p>` : ''}
${ctas.length ? `<div class="btn-row v-hero__ctas">${ctas.join('')}</div>` : ''}
</div>
${side ? `<div class="v-hero__side" data-reveal style="--i:1">${side}</div>` : ''}
${art ? `<div class="page-hero__art v-hero__art" data-reveal style="--i:1">${art}</div>` : ''}
</div>
${pro}
</section>`;
}
const archArt = (inner, cls = '') => `<figure class="arch v-hero__arch ${cls}" data-depth="0.05"><span class="arch__img">${inner}</span></figure>`;
const heroImgOpts = { alt: '', eager: true, sizes: '(min-width: 1024px) 400px, 70vw' };
const subsHtml = (subs) => subs.map((b) => `<h2 class="v-hero__sub">${esc(b.text)}</h2>`).join('');

// ---------- generic segment bands ----------
const GROUNDS = ['night', 'cream', 'linen', 'plum', 'cream', 'night'];
function segHead(seg, kicker = '') {
  if (!seg.head) return '';
  return `<header class="v-head" data-reveal>${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}<h2 class="display v-head__h">${esc(seg.head.text)}</h2></header>`;
}
function stepsHtml(ctx, items, dark) {
  return `<ol class="v-steps" role="list">${items.map((it, i) => {
    const m = norm(it.head ? it.head.text : '').match(/^step\s*(\d+)/i);
    const n = m ? m[1].padStart(2, '0') : String(i + 1).padStart(2, '0');
    return `<li class="v-step glass ${dark ? '' : 'glass--cream '}glass--lift" data-reveal style="--i:${i % 3}">
<span class="numeral v-step__n" aria-hidden="true">${n}</span>
${it.head ? `<h3 class="v-step__t">${esc(it.head.text)}${it.title ? ` <span class="v-step__t2">${esc(it.title.text)}</span>` : ''}</h3>` : ''}
${it.pic ? `<span class="v-card__icon" aria-hidden="true">${img({ src: it.pic.src, alt: '', w: it.pic.w, h: it.pic.h }, { sizes: '72px' })}</span>` : ''}
<div class="v-step__b">${blocks(ctx, it.body, { min: 4, btnCls: 'btn--sun btn--sm' })}</div>
</li>`;
  }).join('\n')}</ol>`;
}
function cardsHtml(ctx, items, dark, { places = null } = {}) {
  const cats = items.filter((it) => it.head && catOf(it.head.text)).length >= Math.ceil(items.length / 2);
  return `<ul class="v-cards${cats ? ' v-cards--menu' : ''}" role="list">${items.map((it, i) => {
    const t = it.head ? norm(it.head.text) : '';
    const c = cats && !it.card && !it.pic ? catOf(t) : null;
    const pl = places && t ? places(t) : null;
    const cu = it.card && it.card.href ? liveHref(it.card.href) : '';
    const link = pl || (cu && t ? cu : '');
    const title = t ? (link ? `<a class="v-card__link"${linkAttrs(link)}>${esc(t)}</a>` : esc(t)) : '';
    const pic = (it.card && it.card.img && photoOk(it.card.img.src)) ? it.card.img : it.pic;
    const media = pic ? `<span class="v-card__icon" aria-hidden="true">${img({ src: pic.src, alt: '', w: pic.w, h: pic.h }, { sizes: '72px' })}</span>`
      : c ? `<span class="arch v-card__thumb" aria-hidden="true"><span class="arch__img">${gen(c, { alt: '', sizes: '96px' })}</span></span>`
        : `<span class="v-card__ico" aria-hidden="true">${icon(pl || places ? 'pin' : 'star')}</span>`;
    const cardBody = it.card && it.card.html ? `<p>${rewriteLinks(it.card.html)}</p>${!t && cu ? `<p><a class="link-arrow"${linkAttrs(cu)}>${/\/stores\//.test(cu) ? 'Shop the menu' : 'Visit'}${extIco(cu)}</a></p>` : ''}` : '';
    return `<li class="v-card glass ${dark ? '' : 'glass--cream '}glass--lift${link ? ' v-card--link' : ''}" data-reveal style="--i:${i % 3}">
${media}
${title ? `<h3 class="v-card__t">${title}${link ? extIco(link) : ''}</h3>` : ''}
<div class="v-card__b">${cardBody}${blocks(ctx, it.body, { min: 4, btnCls: 'btn--sun btn--sm' })}</div>
</li>`;
  }).join('\n')}</ul>`;
}
let artTurn = 0;
const ART = ['g-hf-arch', 'g-hf-mirror', 'g-guide', 'g-flower', 'g-edibles', 'g-vapes', 'g-prerolls'];
function segBand(ctx, seg, i, { ground, places = null, id = '', last = false } = {}) {
  const g = ground || (last ? 'sun' : GROUNDS[i % GROUNDS.length]);
  const dark = !/cream|linen/.test(g);
  const st = { btnCls: 'btn--sun', btnAlt: dark ? 'btn--glass' : 'btn--deco' };
  const hasFaq = seg.blocks.some((b) => b.type === 'faq');
  const it = itemize(seg.blocks);
  const steps = it && it.items.filter((x) => x.head && /^step\s*\d+/i.test(norm(x.head.text))).length >= 2;
  const hid = seg.head ? ` aria-labelledby="${escA(id || 'v-s' + i)}-h"` : '';
  const headH = seg.head ? `<header class="v-head" data-reveal><h2 class="display v-head__h" id="${escA(id || 'v-s' + i)}-h">${esc(seg.head.text)}</h2></header>` : '';
  let body;
  if (it && !hasFaq) {
    body = `${it.lead.length ? `<div class="v-lead prose" data-reveal>${blocks(ctx, it.lead, st)}</div>` : ''}
${steps ? stepsHtml(ctx, it.items, dark) : cardsHtml(ctx, it.items, dark, { places })}
${it.tail.length ? `<div class="v-tail prose" data-reveal>${blocks(ctx, it.tail, st)}</div>` : ''}`;
  } else if (hasFaq) {
    body = `<div class="v-faqwrap" data-reveal>${blocks(ctx, seg.blocks, st)}</div>`;
  } else {
    const lists = seg.blocks.filter((b) => b.type === 'ul' || b.type === 'ol');
    const words = seg.blocks.reduce((n, b) => n + norm(b.html || b.text || (b.items || []).join(' ')).length, 0);
    if (last || words < 260) {
      body = `<div class="v-solo prose" data-reveal>${blocks(ctx, seg.blocks, st)}</div>`;
    } else if (lists.length && lists.some((l) => (l.items || []).length >= 4)) {
      body = `<div class="v-split v-split--list"><div class="v-split__text prose" data-reveal>${blocks(ctx, seg.blocks.filter((b) => !lists.includes(b) || (b.items || []).length < 4), st)}</div><div class="v-split__list glass ${dark ? '' : 'glass--cream '}" data-reveal style="--i:1">${lists.filter((l) => (l.items || []).length >= 4).map((l) => block(ctx, l, st)).join('')}</div></div>`;
    } else {
      const flip = artTurn++ % 2 === 1;
      const pic = seg.blocks.find((b) => b.type === 'img' && photoOk(b.src));
      const rest = seg.blocks.filter((b) => b !== pic);
      const art = pic ? `<span class="arch__img">${img({ src: pic.src, alt: norm(pic.alt), w: pic.w, h: pic.h }, { sizes: '(min-width: 1024px) 380px, 70vw' })}</span>`
        : `<span class="arch__img">${gen(ART.slice(artTurn % ART.length).concat(ART.slice(0, artTurn % ART.length), 'g-haze'), { alt: '', sizes: '(min-width: 1024px) 380px, 70vw' })}</span>`;
      body = `<div class="v-split${flip ? ' v-split--flip' : ''}"><div class="v-split__text prose" data-reveal>${blocks(ctx, rest, st)}</div><figure class="arch v-split__art" data-reveal style="--i:1" data-depth="0.04">${art}</figure></div>`;
    }
  }
  return `<section class="band band--${g} v-sec v-sec--${hasFaq ? 'faq' : it ? (steps ? 'steps' : 'cards') : 'text'}"${id ? ` id="${escA(id)}"` : ''}${hid}${g === 'sun' ? ' data-sunburst' : ''}>
<div class="band__clip" aria-hidden="true">${g === 'sun' ? gen(['g-sunburst-wall', 'g-haze'], { alt: '', cls: 'band__bg v-bg', sizes: '100vw' }) : ''}<span class="grain"></span></div>
<div class="wrap${hasFaq || (!it && (last || g === 'sun')) ? ' wrap--narrow' : ''}">
${headH}
${body}
</div>
</section>`;
}

// intro band: the hero section's paragraphs + an aside (service cards, facts, chips)
function introBand(ctx, list, aside = '', { ground = 'cream', after = '' } = {}) {
  if (!list.length && !aside && !after) return '';
  const st = { btnCls: 'btn--sun', btnAlt: 'btn--deco' };
  return `<section class="band band--${ground} v-intro">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="v-botanical"></span></div>
<div class="wrap">
<div class="v-intro__grid${aside ? '' : ' v-intro__grid--solo'}">
${list.length ? `<div class="v-intro__text prose" data-reveal>${blocks(ctx, list, st)}</div>` : ''}
${aside ? `<aside class="v-intro__aside" data-reveal style="--i:1">${aside}</aside>` : ''}
</div>
${after}
</div>
</section>`;
}

function out(ctx, { path: p, title, description, crumbs, main, mod, jsonld = [] }) {
  return { path: p, html: page({ ctx, path: p, title, description, canonical: absUrl(ctx, p), og: { title, description, type: 'website', url: absUrl(ctx, p) }, jsonld, bodyClass: `v-page v-page--${mod}`, main, crumbs, heroCrumbs: true }) };
}
function faqLd(list) {
  const items = [];
  for (const b of list) if (b.type === 'faq') for (const it of b.items || []) if (it.q && it.a_html) items.push({ '@type': 'Question', name: norm(it.q), acceptedAnswer: { '@type': 'Answer', text: norm(it.a_html) } });
  return items.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items }] : [];
}
const allBlocks = (rec) => (rec.sections || []).flatMap((s) => s.blocks || []);

// ---------- delivery towns: names, counties, links ----------
const slugTown = (d) => norm(String(d.slug || '').replace(/-weed-delivery$/, '').replace(/-/g, ' ')).replace(/\b\w/g, (c) => c.toUpperCase());
// the live hub spells one town "Bayonnen": a name that only adds letters to the slug's town is the slug's town
const townName = (d) => { const n = d.name || d.town || ''; const s = slugTown(d); return !n || (key(n) !== key(s) && key(n).startsWith(key(s))) ? s : n; };
const townPath = (d) => href(d.path || `/service/${d.slug}/`);
function townFinder(ctx) {
  const list = (ctx.delivery || []).map((d) => ({ d, k: key(townName(d)), p: townPath(d) }));
  return (text, hrefRaw) => {
    if (hrefRaw) { const p = href(liveHref(hrefRaw)).split('#')[0]; const hit = list.find((x) => x.p === p); if (hit) return hit; }
    const k = key(text);
    if (!k) return null;
    return list.find((x) => x.k === k) || list.find((x) => k.startsWith(x.k) || x.k.startsWith(k)) || null;
  };
}
// the hub's "Areas We Serve" region -> [{ name, id, desc: [blocks], towns: [{ text, d }] }]
function parseCounties(ctx, list) {
  const find = townFinder(ctx);
  const groups = []; let g = null;
  const isLong = (b) => b.type === 'p' && norm(b.html).length > 60 && (String(b.html).match(/<a\b/gi) || []).length < 2;
  list.forEach((b, i) => {
    const next = list[i + 1];
    if (isHead(b) && (/county/i.test(b.text) || (next && isLong(next)))) { g = { name: norm(b.text), desc: [], towns: [], other: [] }; groups.push(g); return; }
    if (!g) { g = { name: '', desc: [], towns: [], other: [] }; groups.push(g); }
    const add = (txt, h) => { const t = norm(txt); if (t) g.towns.push({ text: t, d: find(t, h) }); };
    if (b.type === 'ul' || b.type === 'ol') { for (const it of b.items || []) { const h = (String(itemHtml(it)).match(/href="([^"]+)"/) || [])[1]; add(itemHtml(it), h); } return; }
    if (b.type === 'button') { add(b.text, b.href); return; }
    if (b.type === 'card') { if (b.title) add(b.title, b.href); if (b.html) g.other.push({ type: 'p', html: b.html }); return; }
    if (isHead(b) && norm(b.text).length <= 40) { add(b.text, null); return; }
    if (b.type === 'p') {
      const links = [...String(b.html).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const bare = norm(String(b.html).replace(/<a\b[\s\S]*?<\/a>/gi, ' '));
      if (links.length >= 2 && bare.length < 12) { for (const m of links) add(m[2], m[1]); if (bare) g.other.push({ type: 'p', html: esc(bare) }); return; }
      if (norm(b.html).length <= 40) { const m = links[0]; add(b.html, m && m[1]); return; }
      g.desc.push(b); return;
    }
    g.other.push(b);
  });
  return groups;
}

// ---------- /service/ hub ----------
function serviceHub(ctx, rec, counties) {
  const p = '/service/';
  const crumbs = [HOME, { href: p, label: 'Weed Delivery' }];
  const { hero: hb, segs } = rec ? flatten(rec) : { hero: [], segs: [] };
  const hp = heroParts(hb);
  const h1 = rec ? esc(rec.h1) : 'Weed Delivery';
  const ctas = hp.ctas.length ? hp.ctas.map((b, i) => btn(ctx, b, i ? 'btn--glass' : 'btn--sun')) : [glueBtn(menu(ctx), 'Order for Delivery')];
  ctas.push(`<a class="btn btn--glass"${linkAttrs('#areas')}>Delivery areas${icon('pin')}</a>`);
  // main session: Lady L's own storefront photo for the delivery hub (the generated arch doorway already fronts /blog/)
  const store = { src: '/assets/photos/ll/img_4198-scaled.webp', alt: 'The Lady L Cannabis storefront on West Side Avenue, with its purple LADY L sign', w: 1440, h: 2560 };
  const pic = hp.pic ? img({ src: hp.pic.src, alt: norm(hp.pic.alt), w: hp.pic.w, h: hp.pic.h }, heroImgOpts) : img(store, { ...heroImgOpts, alt: store.alt });
  const hoursCard = `<div class="v-hours glass glass--cream" data-reveal style="--i:2">
<div class="v-hours__col"><p class="kicker">${icon('truck')}Delivery hours</p>${deliveryHours(ctx)}</div>
<div class="v-hours__col"><p class="kicker">${icon('clock')}Store hours</p>${hoursHtml(ctx)}</div>
${ctx.site.lastCall ? `<p class="v-hours__note">${esc(ctx.site.lastCall)}</p>` : ''}
</div>`;
  let main = hero({ crumbs, kicker: 'Weed Delivery', h1, subs: subsHtml(hp.subs), lede: hp.lede ? rewriteLinks(hp.lede.html) : '', ctas, art: archArt(pic), mod: 'v-hero--hub' });
  main += introBand(ctx, hp.intro, hoursCard, { after: `<div class="v-intro__svc">${serviceCards(ctx, { h: 3 })}</div>` });
  // areas region: the "Areas We Serve" segment plus any county segments that follow it
  const ai = segs.findIndex((s) => s.head && /areas we serve/i.test(s.head.text));
  let areaSegs = [];
  if (ai >= 0) {
    let j = ai + 1;
    while (j < segs.length && segs[j].head && (/county/i.test(segs[j].head.text) || /^passaic$/i.test(norm(segs[j].head.text)))) j++;
    areaSegs = segs.splice(ai, j - ai);
  }
  const areaHead = areaSegs[0] && areaSegs[0].head;
  const areaList = areaSegs.flatMap((s, k) => (k === 0 ? s.blocks : [{ type: 'h3', text: s.head.text }, ...s.blocks]));
  const groups = parseCounties(ctx, areaList);
  // Lady L's "Important Reminder" sits inside the tips section: it becomes its own glass notice
  for (let k = 0; k < segs.length; k++) {
    const r = segs[k].blocks.findIndex((b) => isHead(b) && /important reminder/i.test(b.text));
    if (r >= 0) { const rem = segs[k].blocks.splice(r); segs.splice(k + 1, 0, { head: { type: 'h2', text: rem[0].text }, blocks: rem.slice(1) }); break; }
  }
  // delivery towns no county lists links to yet join their county (site data) or a final group
  const linked = new Set(groups.flatMap((g) => g.towns.filter((t) => t.d).map((t) => t.d.p)));
  for (const d of ctx.delivery || []) {
    if (linked.has(townPath(d))) continue;
    const c = county(d.county || (counties.get(townPath(d)) || ''));
    let g = groups.find((x) => c && county(x.name).toLowerCase() === c.toLowerCase());
    if (!g) { g = groups.find((x) => x.extra) || null; if (!g) { g = { name: '', extra: true, desc: [], towns: [], other: [] }; groups.push(g); } }
    g.towns.push({ text: townName(d), d: { d, p: townPath(d) }, added: true });
  }
  const chip = (t) => (t.d ? `<li><a class="chip v-chip"${linkAttrs(t.d.p)}>${icon('truck')}${esc(t.text)}</a></li>` : `<li><span class="chip v-chip">${esc(t.text)}</span></li>`);
  const areas = `<section class="band band--linen v-areas" id="areas" aria-labelledby="areas-hub-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="v-botanical"></span></div>
<div class="wrap">
<header class="v-head" data-reveal><p class="kicker">Delivery areas</p><h2 class="display v-head__h" id="areas-hub-h">${esc(areaHead ? areaHead.text : 'Weed Delivery Areas We Serve')}</h2>${ctx.site.delivery && ctx.site.delivery.zones ? '' : ''}</header>
<div class="v-counties">
${groups.filter((g) => g.towns.length || g.desc.length || g.name).map((g, i) => `<article class="v-county glass glass--cream glass--lift"${g.name ? ` id="${escA(countyId(g.name))}"` : ' id="county-more"'} data-reveal style="--i:${i % 2}">
<div class="v-county__text">
<p class="v-county__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
${g.name ? `<h3 class="v-county__h">${esc(g.name)}</h3>` : `<h3 class="v-county__h">More delivery towns</h3>`}
${blocks(ctx, g.desc.concat(g.other), { min: 4 })}
</div>
<ul class="v-chips" role="list">${g.towns.map(chip).join('')}</ul>
</article>`).join('\n')}
</div>
</div>
</section>`;
  let n = 0;
  const bands = segs.map((s, i) => {
    const t = s.head ? norm(s.head.text) : '';
    const last = i === segs.length - 1;
    if (/important reminder/i.test(t)) return noticeBand(ctx, s);
    if (/delivery tips/i.test(t)) return tipsBand(ctx, s);
    return segBand(ctx, s, n++, { last, ground: /how .*works/i.test(t) ? 'cream' : /menu/i.test(t) ? 'night' : null });
  });
  // the areas block sits after the law notice (before the menu band), as on Lady L's page
  const at = segs.findIndex((s) => s.head && /menu/i.test(s.head.text));
  if (at >= 0) bands.splice(at, 0, areas); else bands.splice(Math.max(0, bands.length - 1), 0, areas);
  main += bands.join('\n');
  const desc = rec ? rec.description : 'Lady L Cannabis delivery across northern New Jersey.';
  return out(ctx, { path: p, title: rec ? rec.title : 'Weed Delivery | LADY L CANNABIS', description: desc, crumbs, main, mod: 'hub', jsonld: rec ? faqLd(allBlocks(rec)) : [] });
}
function noticeBand(ctx, s) {
  const st = { btnCls: 'btn--sun', btnAlt: 'btn--glass' };
  return `<section class="band band--sun v-notice" aria-labelledby="v-notice-h" data-sunburst>
<div class="band__clip" aria-hidden="true">${gen(['g-haze', 'g-sunburst-wall'], { alt: '', cls: 'band__bg v-bg', sizes: '100vw' })}<span class="grain"></span></div>
<div class="wrap wrap--narrow">
<div class="v-notice__card glass glass--strong" data-reveal>
<span class="v-notice__ico" aria-hidden="true">${icon('id')}</span>
<h2 class="display v-notice__h" id="v-notice-h">${esc(s.head.text)}</h2>
<div class="v-notice__b prose">${blocks(ctx, s.blocks, st)}</div>
</div>
</div>
${'<span class="cut protrude v-notice__cut" aria-hidden="true" data-depth="0.12">' + gen(['g-moon-cut', 'g-pampas-cut'], { alt: '', sizes: '200px' }) + '</span>'}
</section>`;
}
function tipsBand(ctx, s) {
  const st = { btnCls: 'btn--sun', btnAlt: 'btn--deco' };
  const lists = s.blocks.filter((b) => b.type === 'ul' || b.type === 'ol');
  const rest = s.blocks.filter((b) => !lists.includes(b));
  return `<section class="band band--linen v-tips" aria-labelledby="v-tips-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap">
<header class="v-head" data-reveal><p class="kicker">Tips</p><h2 class="display v-head__h" id="v-tips-h">${esc(s.head.text)}</h2></header>
${rest.length ? `<div class="v-lead prose" data-reveal>${blocks(ctx, rest, st)}</div>` : ''}
${lists.map((l) => `<${l.type} class="v-tiplist" role="list">${(l.items || []).map((it, i) => `<li class="v-tip glass glass--cream glass--lift" data-reveal style="--i:${i % 3}"><span class="v-tip__ico" aria-hidden="true">${icon('sparkle')}</span><span>${rewriteLinks(itemHtml(it))}</span></li>`).join('')}</${l.type}>`).join('')}
</div>
</section>`;
}

// ---------- /service/<town>/ ----------
function factsCard(ctx, c) {
  const d = ctx.site.delivery || {};
  return `<div class="v-facts glass glass--strong">
<p class="kicker">${icon('truck')}Delivery facts</p>
<ul class="v-facts__list">${[d.window, d.minimum, d.id].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<p class="v-facts__h">Delivery hours</p>
${deliveryHours(ctx, 'v-facts__hours')}
${c ? `<p class="v-facts__county"><a class="chip chip--sky"${linkAttrs('/service/#' + countyId(c))}>${icon('pin')}${esc(county(c))} County</a></p>` : ''}
</div>`;
}
const CUTS = ['g-leaf-cut', 'g-pampas-cut', 'g-moon-cut', 'g-bud-cut'];
function townPage(ctx, d, i, counties) {
  const p = townPath(d);
  const name = townName(d);
  const c = county(d.county || counties.get(p) || '');
  const crumbs = [HOME, SVC, { href: p, label: name }];
  const { hero: hb, segs } = flatten(d);
  const hp = heroParts(hb);
  const ctas = hp.ctas.length ? hp.ctas.map((b, k) => btn(ctx, b, k ? 'btn--glass' : 'btn--sun')) : [glueBtn(menu(ctx), 'Order for Delivery')];
  const cut = CUTS[i % CUTS.length];
  const pro = `<span class="cut protrude v-hero__cut" aria-hidden="true" data-depth="0.1">${gen([cut, ...CUTS], { alt: '', sizes: '(min-width: 1024px) 220px, 120px', eager: true })}</span>`;
  let main = hero({ crumbs, kicker: 'Weed Delivery', h1: esc(d.h1 || name), subs: subsHtml(hp.subs), lede: hp.lede ? rewriteLinks(hp.lede.html) : '', ctas, side: factsCard(ctx, c), pro, mod: 'v-hero--town' });
  const near = (ctx.delivery || []).filter((x) => x !== d && c && county(x.county || counties.get(townPath(x)) || '').toLowerCase() === c.toLowerCase());
  const nearHtml = `<div class="v-near glass glass--cream">
<p class="kicker">${c ? `More towns in ${esc(c)} County` : 'More delivery towns'}</p>
<ul class="v-chips" role="list">${(near.length ? near : (ctx.delivery || []).filter((x) => x !== d).slice(0, 8)).map((x) => `<li><a class="chip v-chip"${linkAttrs(townPath(x))}>${icon('truck')}${esc(townName(x))}</a></li>`).join('')}</ul>
<p class="v-near__all"><a class="link-arrow"${linkAttrs('/service/#areas')}>Weed Delivery Areas We Serve${icon('arrow')}</a></p>
</div>`;
  main += introBand(ctx, hp.intro.concat(hp.pic ? [hp.pic] : []), nearHtml);
  main += segs.map((s, k) => segBand(ctx, s, k, { last: k === segs.length - 1 })).join('\n');
  if (!segs.length || !allBlocks(d).some((b) => b.type === 'button' && isOrder(b.text))) {
    main += `<section class="band band--sun v-cta" data-sunburst><div class="wrap wrap--narrow v-cta__in" data-reveal><div class="btn-row">${glueBtn(menu(ctx), 'Order for Delivery')}<a class="btn btn--glass"${linkAttrs('/in-store-pickup/')}>In-Store Pickup${icon('arrow')}</a></div></div></section>`;
  }
  return out(ctx, { path: p, title: d.title || `${name} Weed Delivery | LADY L CANNABIS`, description: d.description || `Lady L Cannabis weed delivery in ${name}, NJ.`, crumbs, main, mod: 'town', jsonld: faqLd(allBlocks(d)) });
}

// ---------- /in-store-pickup/ ----------
function findStep(home, re) {
  if (!home) return null;
  const list = allBlocks(home);
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.type === 'icon-box' && re.test(norm(b.title))) return { title: norm(b.title), html: b.html };
    if (isHead(b) && re.test(norm(b.text))) { const nx = list.slice(i + 1).find((x) => x.type === 'p'); if (nx) return { title: norm(b.text), html: nx.html }; }
  }
  for (const s of home.sections || []) if (re.test(norm(s.heading))) { const nx = (s.blocks || []).find((x) => x.type === 'p'); if (nx) return { title: norm(s.heading), html: nx.html }; }
  return null;
}
function findFaq(rec, re) {
  if (!rec) return null;
  for (const b of allBlocks(rec)) if (b.type === 'faq') for (const it of b.items || []) if (re.test(norm(it.q))) return it;
  return null;
}
function pickupPage(ctx) {
  const p = '/in-store-pickup/';
  const S = ctx.site;
  const crumbs = [HOME, { href: p, label: 'In-Store Pickup' }];
  const home = ctx.content.home;
  const faq = ctx.content.faq;
  const steps = [
    findStep(home, /^shop online$/i),
    findStep(home, /^pick ?up in store$/i) || (S.pickup && S.pickup.step ? { title: 'Pick up in Store', html: esc(S.pickup.step) } : null),
    findStep(home, /^order delivery$/i),
  ].filter(Boolean);
  const qBring = findFaq(faq, /what do i need to bring/i);
  const qOrder = findFaq(faq, /can i place an order for pickup/i);
  const photos = ['/assets/photos/ll/storefront.webp', '/assets/photos/ll/store.webp'].filter(photoOk);
  const art = archArt(photos[0] ? img({ src: photos[0], alt: '' }, heroImgOpts) : gen(['g-hf-mirror', 'g-hf-arch', 'g-guide'], heroImgOpts));
  const ctas = [glueBtn(menu(ctx), 'Order for Pickup'), `<a class="btn btn--glass"${linkAttrs(S.mapUrl)}>Get directions${icon('ext')}</a>`];
  let main = hero({ crumbs, kicker: 'In-Store Pickup', h1: 'In-Store Pickup at <em>Lady L</em>', lede: 'Lady L&#39;s own words on ordering ahead and picking up at the West Side Avenue store.', ctas, art, mod: 'v-hero--pickup' });
  main += `<section class="band band--cream v-pk" aria-labelledby="v-pk-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="v-botanical"></span></div>
<div class="wrap">
<div class="v-pk__grid">
<figure class="v-pk__quote" data-reveal>
<p class="kicker">Order ahead</p>
<blockquote class="v-bigquote"><p>${esc(S.pickup && S.pickup.order)}</p></blockquote>
<figcaption class="v-pk__src">From the <a${linkAttrs('/faq/')}>Lady L FAQ</a></figcaption>
</figure>
<div class="v-pk__steps">
<header class="v-head" data-reveal><p class="kicker">Easy Steps</p><h2 class="display v-head__h" id="v-pk-h">How pickup works</h2></header>
<ol class="v-steps v-steps--three" role="list">${steps.map((s, i) => `<li class="v-step glass glass--cream glass--lift" data-reveal style="--i:${i}">
<span class="numeral v-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
<h3 class="v-step__t">${esc(s.title)}</h3>
<div class="v-step__b"><p>${rewriteLinks(s.html)}</p></div>
</li>`).join('\n')}</ol>
</div>
</div>
</div>
</section>
<section class="band band--night v-pk-faq" aria-labelledby="v-pkf-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap">
<header class="v-head" data-reveal><p class="kicker">From the FAQ</p><h2 class="display v-head__h" id="v-pkf-h">Before you <em>visit</em></h2></header>
<div class="v-pk-faq__grid">
${[qBring, qOrder].filter(Boolean).map((q, i) => `<article class="v-qa glass glass--lift" data-reveal style="--i:${i}"><h3 class="v-qa__q">${esc(norm(q.q))}</h3><div class="v-qa__a">${rewriteLinks(q.a_html)}</div></article>`).join('\n')}
${S.lastCall ? `<article class="v-qa v-qa--note glass glass--lift" data-reveal style="--i:2"><span class="v-qa__ico" aria-hidden="true">${icon('clock')}</span><h3 class="v-qa__q">Last call</h3><p class="v-qa__a">${esc(S.lastCall)}</p></article>` : ''}
</div>
</div>
</section>
<section class="band band--linen v-visit" aria-labelledby="v-visit-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap">
<div class="v-visit__grid">
<div class="v-visit__card glass glass--cream" data-reveal>
<p class="kicker">Visit</p>
<h2 class="display v-head__h" id="v-visit-h">${esc(S.name)}</h2>
<address class="v-visit__addr">${icon('pin')}<span>${esc(addrLine(S))}</span></address>
<p class="v-visit__row"><a class="link-arrow"${linkAttrs(S.mapUrl)}>Get directions${icon('ext')}</a></p>
<p class="v-visit__row">${icon('phone')}<a${linkAttrs(S.phoneHref)}>${esc(S.phone)}</a></p>
<p class="v-facts__h">Store hours</p>
${hoursHtml(ctx, 'v-visit__hours')}
${S.lastCall ? `<p class="v-hours__note">${esc(S.lastCall)}</p>` : ''}
<div class="btn-row">${glueBtn(menu(ctx), 'Order for Pickup')}</div>
</div>
<a class="v-alt glass glass--lift" data-reveal style="--i:1"${linkAttrs('/service/')}>
<span class="v-alt__ico" aria-hidden="true">${icon('truck')}</span>
<span class="v-alt__k">Prefer delivery?</span>
<span class="v-alt__t">Weed Delivery</span>
${S.delivery && S.delivery.window ? `<span class="v-alt__l">${esc(S.delivery.window)}</span>` : ''}
<span class="link-arrow v-alt__go">Delivery details${icon('arrow')}</span>
</a>
</div>
</div>
</section>`;
  return out(ctx, { path: p, title: 'In-Store Pickup | LADY L CANNABIS', description: `In-store pickup at Lady L Cannabis, ${addrLine(S)}: ordering ahead, what to bring, store hours and directions.`, crumbs, main, mod: 'pickup' });
}

// ---------- /new-jersey/ hub + /new-jersey/<place>/ ----------
const placeName = (pl) => pl.name || norm(String(pl.h1 || pl.slug || '').replace(/^.*?near\s+/i, '').replace(/[,|].*$/, ''));
const placePath = (pl) => href(pl.path || `/new-jersey/${pl.slug}/`);
function placeFinder(ctx) {
  const list = (ctx.places || []).map((pl) => ({ k: key(placeName(pl)), s: key(pl.slug), p: placePath(pl) }));
  return (text) => { const k = key(text); const hit = list.find((x) => x.k === k) || list.find((x) => x.s.endsWith(k)) || list.find((x) => k && (x.k.startsWith(k) || k.startsWith(x.k))); return hit ? hit.p : null; };
}
function njHub(ctx, rec) {
  const p = '/new-jersey/';
  const crumbs = [HOME, { href: p, label: 'New Jersey' }];
  const { hero: hb, segs } = rec ? flatten(rec) : { hero: [], segs: [] };
  const hp = heroParts(hb);
  const ctas = hp.ctas.length ? hp.ctas.map((b, i) => btn(ctx, b, i ? 'btn--glass' : 'btn--sun')) : [glueBtn(menu(ctx), 'Order Now')];
  const pic = hp.pic ? img({ src: hp.pic.src, alt: norm(hp.pic.alt), w: hp.pic.w, h: hp.pic.h }, heroImgOpts) : gen(['g-guide', 'g-hf-arch', 'g-haze'], heroImgOpts);
  let main = hero({ crumbs, kicker: 'Neighborhoods', h1: rec ? esc(rec.h1) : 'New Jersey Areas We Serve', subs: subsHtml(hp.subs), lede: hp.lede ? rewriteLinks(hp.lede.html) : '', ctas, art: archArt(pic), mod: 'v-hero--nj' });
  main += introBand(ctx, hp.intro, serviceCards(ctx, { h: 3, compact: true }));
  const finder = placeFinder(ctx);
  const used = new Set();
  const places = (t) => { const u = finder(t); if (u) used.add(u); return u; };
  main += segs.map((s, k) => {
    const isPlaces = s.head && /areas served|cities/i.test(s.head.text);
    return segBand(ctx, s, k, { last: k === segs.length - 1, places: isPlaces ? places : null, ground: isPlaces ? 'linen' : null, id: isPlaces ? 'places' : '' });
  }).join('\n');
  const missing = (ctx.places || []).filter((pl) => !used.has(placePath(pl)));
  if (missing.length) main += `<section class="band band--cream v-sec"><div class="wrap"><ul class="v-chips" role="list">${missing.map((pl) => `<li><a class="chip v-chip"${linkAttrs(placePath(pl))}>${icon('pin')}${esc(placeName(pl))}</a></li>`).join('')}</ul></div></section>`;
  return out(ctx, { path: p, title: rec ? rec.title : 'New Jersey Areas We Serve | LADY L CANNABIS', description: rec ? rec.description : 'Lady L Cannabis, Jersey City: New Jersey areas served.', crumbs, main, mod: 'nj', jsonld: rec ? faqLd(allBlocks(rec)) : [] });
}
function placePage(ctx, pl, i) {
  const p = placePath(pl);
  const name = placeName(pl);
  const crumbs = [HOME, { href: '/new-jersey/', label: 'New Jersey' }, { href: p, label: name }];
  const { hero: hb, segs } = flatten(pl);
  const hp = heroParts(hb);
  // Lincoln Park here is the Jersey City park (Lady L's own page says so), not the Morris County borough
  const origin = /lincoln park/i.test(name) ? 'Lincoln Park, Jersey City, NJ' : `${name}, NJ`;
  const dir = directionsFrom(ctx, origin);
  const ctas = (hp.ctas.length ? hp.ctas.map((b, k) => btn(ctx, b, k ? 'btn--glass' : 'btn--sun')) : [glueBtn(menu(ctx), 'Order for Pickup')]);
  ctas.push(`<a class="btn btn--glass"${linkAttrs(dir)}>Get directions from ${esc(name)}${icon('ext')}</a>`);
  // hero quick facts: the page's own captured hours tables (Lady L's rows), else site.json
  const hrs = allBlocks(pl).filter((b) => b.type === 'hours' && (b.rows || []).length);
  const rowsUl = (rows) => `<ul class="hours">${rows.map((r) => `<li><span class="hours__d">${esc(r[0])}</span><span class="hours__t">${esc(r[1] || '')}</span></li>`).join('')}</ul>`;
  const side = `<div class="v-facts glass glass--strong">
${hrs.length ? hrs.map((b) => `<p class="v-facts__h">${icon(/deliver/i.test(b.title) ? 'truck' : 'clock')}${esc(b.title || '')}</p>${rowsUl(b.rows)}`).join('') : `<p class="v-facts__h">${icon('clock')}Store hours</p>${hoursHtml(ctx)}<p class="v-facts__h">${icon('truck')}Delivery hours</p>${deliveryHours(ctx)}`}
<p class="v-facts__county"><a class="chip chip--sky"${linkAttrs(dir)}>${icon('pin')}Get directions from ${esc(name)}</a></p>
</div>`;
  const pro = `<span class="cut protrude v-hero__cut" aria-hidden="true" data-depth="0.1">${gen([CUTS[(i + 1) % CUTS.length], ...CUTS], { alt: '', sizes: '(min-width: 1024px) 220px, 120px', eager: true })}</span>`;
  let main = hero({ crumbs, kicker: 'Dispensary near ' + esc(name), h1: esc(pl.h1 || name), subs: subsHtml(hp.subs), lede: hp.lede ? rewriteLinks(hp.lede.html) : '', ctas, side, pro, mod: 'v-hero--place' });
  main += introBand(ctx, hp.intro, '');
  main += segs.map((s, k) => {
    const ol = s.blocks.findIndex((b) => b.type === 'ol' || b.type === 'ul');
    if (s.head && /directions/i.test(s.head.text) && ol >= 0) return routeBand(ctx, s, ol, dir, name);
    return segBand(ctx, s, k, { last: k === segs.length - 1 });
  }).join('\n');
  return out(ctx, { path: p, title: pl.title || `Dispensary Near ${name} | LADY L CANNABIS`, description: pl.description || `Lady L Cannabis near ${name}.`, crumbs, main, mod: 'place', jsonld: faqLd(allBlocks(pl)) });
}
function routeBand(ctx, s, ol, dir, name) {
  const left = s.blocks.slice(0, ol);
  const list = s.blocks[ol];
  const right = s.blocks.slice(ol + 1);
  const st = { btnCls: 'btn--sun', btnAlt: 'btn--deco', min: 4 };
  return `<section class="band band--cream v-route" aria-labelledby="v-route-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="v-botanical"></span></div>
<div class="wrap">
<div class="v-route__grid">
<div class="v-route__main">
<header class="v-head" data-reveal><p class="kicker">Directions</p><h2 class="display v-head__h" id="v-route-h">${esc(s.head.text)}</h2></header>
${left.length ? `<div class="prose" data-reveal>${blocks(ctx, left, st)}</div>` : ''}
<ol class="v-route__steps" role="list">${(list.items || []).map((it, i) => `<li class="v-route__step" data-reveal style="--i:${i % 4}"><span class="v-route__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${rewriteLinks(itemHtml(it))}</span></li>`).join('')}</ol>
</div>
<aside class="v-route__card glass glass--cream" data-reveal style="--i:1">
<p class="kicker">${icon('pin')}The store</p>
<div class="v-route__store prose">${blocks(ctx, right, st)}</div>
<p class="v-route__dir"><a class="btn btn--sun btn--sm"${linkAttrs(dir)}>Get directions from ${esc(name)}${icon('ext')}</a></p>
</aside>
</div>
</div>
</section>`;
}

export async function render(ctx) {
  const out = [];
  const svc = ctx.content && (ctx.content.service || Object.values(ctx.content).find((c) => c && c.path === '/service/'));
  // county of each delivery town from the hub's county sections (for the town pages' county chip and nearby towns)
  const counties = new Map();
  if (svc) {
    const { segs } = flatten(svc);
    const ai = segs.findIndex((s) => s.head && /areas we serve/i.test(s.head.text));
    if (ai >= 0) {
      let j = ai + 1;
      while (j < segs.length && segs[j].head && (/county/i.test(segs[j].head.text) || /^passaic$/i.test(norm(segs[j].head.text)))) j++;
      const list = segs.slice(ai, j).flatMap((s, k) => (k === 0 ? s.blocks : [{ type: 'h3', text: s.head.text }, ...s.blocks]));
      for (const g of parseCounties(ctx, list)) for (const t of g.towns) if (t.d && g.name && !counties.has(t.d.p)) counties.set(t.d.p, county(g.name));
    }
  }
  artTurn = 0;
  out.push(serviceHub(ctx, svc, counties));
  (ctx.delivery || []).forEach((d, i) => { artTurn = i; out.push(townPage(ctx, d, i, counties)); });
  out.push(pickupPage(ctx));
  const nj = ctx.content && (ctx.content['new-jersey'] || Object.values(ctx.content).find((c) => c && c.path === '/new-jersey/'));
  artTurn = 0;
  out.push(njHub(ctx, nj));
  (ctx.places || []).forEach((pl, i) => { artTurn = i + 1; out.push(placePage(ctx, pl, i)); });
  return out;
}
