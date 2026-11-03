// shell.mjs - the page chrome (FOUNDATION, "LAVENDER PARLOR"): <head>, the top link bar (Delivery / Pickup service pills
// + quick links), the main bar (logo, nav with image-card dropdown panels, Order Now), the drawer below 1024px, the
// prefooter bands (areas + newsletter), the footer with the giant LADY L marquee wordmark, the 21+ gate.
// Exports and the page() signature are FIXED (every lane calls them):
//   page({ ctx, path, title, description, canonical, og, jsonld, bodyClass, main, crumbs, heroCrumbs, scripts, preload, noPrefooter })
//     main         the page's <main> INNER html (page() wraps it in <main id="main">)
//     crumbs       [{ label, href }, ...] or [[href, label], ...] (last = current page). Printed in a slim night bar under
//                  the header unless heroCrumbs is true (then the template prints crumbsHtml(crumbs) inside its own
//                  .page-hero). A BreadcrumbList JSON-LD is added from crumbs unless the template passes one.
//     og           { title, description, type, image, url } (image defaults to the g-hero-parlor still, absolute)
//     jsonld       object or array -> <script type="application/ld+json">
//     scripts      extra script file names under /assets/js/ (site.js always loads)
//     preload      [{ href, as, type, media, imagesrcset, imagesizes, fetchpriority, crossorigin }] -> <link rel="preload">
//     noPrefooter  true = skip BOTH prefooter bands; 'areas' or 'newsletter' = skip only that one (home renders its own)
//                  (noTrio, the stub's old name, is still accepted as an alias for true)
//   crumbsHtml(crumbs), icon(name, cls), hoursHtml(ctx, cls), deliveryHoursHtml(ctx, cls), serviceCards(ctx, opts),
//   serviceFacts(ctx), areasBand(ctx), newsletterBand(ctx), logoHtml(ctx, opts), CSS_ORDER, ctaTrio (stub alias: '')
// Every word in the chrome comes from ctx.site / ctx.ia (Lady L's own) except neutral glue labels (Menu, Store Hours,
// Shop all products, Delivery details, Pickup details, Get directions, Back to top, Skip to content).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/paths.mjs';
import { imageSize } from '../lib/images.mjs';
import { esc, escA, attrs, href, linkAttrs, absUrl, gimg, img, imgUrl, hasGenerated, menu, demoForm } from './util.mjs';

export const CSS_ORDER = ['fonts', 'tokens', 'base', 'components', 'motion', 'shell', 'home', 'shop', 'services', 'learn', 'pages', 'mobile', 'fix'];

const ICONS = {
  ext: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h11"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  pin: '<path d="M19 10c0 5.6-7 11-7 11s-7-5.4-7-11a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11L5.5 8Z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
  truck: '<path d="M2.5 6.5h11v9.5h-11z"/><path d="M13.5 10h4l3 3.2V16h-7"/><circle cx="6.5" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  cart: '<path d="M3 4h2.2l2.3 11h10.3L20 7.5H6.4"/><circle cx="9.2" cy="19" r="1.4"/><circle cx="16.6" cy="19" r="1.4"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m20 20-4.4-4.4"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  tag: '<path d="M12.6 2.8H4.8a2 2 0 0 0-2 2v7.8l8.6 8.6a2.2 2.2 0 0 0 3.1 0l6.7-6.7a2.2 2.2 0 0 0 0-3.1Z"/><circle cx="8" cy="8" r="1.3"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="12" rx="1"/><path d="M12 8.5v12M3.5 12.5h17"/><path d="M12 8.5c-1.6-3.6-5.5-3.8-5.5-1.3 0 1.8 3.4 1.3 5.5 1.3 2.1 0 5.5.5 5.5-1.3 0-2.5-3.9-2.3-5.5 1.3Z"/>',
  phone: '<path d="M5 3.5h3.6l1.8 4.6-2.4 1.6a11 11 0 0 0 6.3 6.3l1.6-2.4 4.6 1.8V19a1.8 1.8 0 0 1-1.9 1.8A16.5 16.5 0 0 1 3.2 5.4 1.8 1.8 0 0 1 5 3.5Z"/>',
  star: '<path d="m12 3.2 2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17l-5.38 2.85 1.03-6L3.3 9.6l6-.9Z"/>',
  leaf: '<path d="M5 20c0-8.5 5.5-14 15-15-.6 9.5-6.4 15-15 15Z"/><path d="m5 20 8.5-8.5"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  up: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.9"/>',
  facebook: '<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.6V4.3a21 21 0 0 0-2.4-.1c-2.4 0-3.9 1.4-3.9 4v2.3H8.8v3h2.6V21"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 10.5v6M8 7.6v.1"/><path d="M11.5 16.5v-6M11.5 13.2c0-1.6 1-2.7 2.5-2.7s2.3 1 2.3 2.7v3.3"/>',
  google: '<path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a4.6 4.6 0 0 1-1.9 2.9"/><path d="M14.6 16.7A7.6 7.6 0 1 1 17.3 6.6"/>',
  sparkle: '<path d="M12 3.5c.6 4.2 2.3 6 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.5 5.9-2.3 6.5-6.5Z"/><path d="M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z"/>',
  moon: '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.5 6.5 0 0 0 10.1 10.1Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  diamond: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12Z"/>',
  quote: '<path d="M9.5 7.5C6.6 8.4 5 10.6 5 13.6V17h4.6v-4.4H7.2c.1-1.8 1-3 2.8-3.6Z"/><path d="M18.5 7.5c-2.9.9-4.5 3.1-4.5 6.1V17h4.6v-4.4h-2.4c.1-1.8 1-3 2.8-3.6Z"/>',
  play: '<path d="M8 5.5v13l10-6.5Z"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13"/>',
  tiktok: '<path d="M14 3.5v11.2a3.6 3.6 0 1 1-3.6-3.6"/><path d="M14 3.5c.4 2.6 2.2 4.4 5 4.6"/>',
  yelp: '<path d="M10.8 3.4c.9-.3 2 .1 2 1.1v7.3c0 .8-1 1.1-1.5.5L6.7 6.6c-.5-.6-.3-1.4.4-1.7Z"/><path d="m13.8 14.2 5.6 1.8c.8.3 1 1.2.4 1.8l-2.2 2.4c-.6.6-1.5.4-1.8-.4l-1.9-4.7c-.2-.6.3-1.1.9-.9Z"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.arrow}</svg>`;
}

// crumbs: [{ label, href }] or [[href, label]]; the last one is the current page. Separators are drawn by CSS ("/").
const crumbParts = (c) => (Array.isArray(c) ? { href: c[0], label: c[1] } : c || {});
export function crumbsHtml(crumbs = []) {
  if (!crumbs || !crumbs.length) return '';
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((raw, i) => {
    const c = crumbParts(raw);
    return `<li>${i < crumbs.length - 1 && c.href ? `<a${linkAttrs(c.href)}>${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`}</li>`;
  }).join('')}</ol></nav>`;
}

// ---------- shared bits ----------
const pathOf = (h) => href(String(h || '')).split('#')[0].split('?')[0];
const isCur = (h, p) => !!h && !/^(https?:)?\/\//i.test(h) && !String(h).includes('#') && pathOf(h) === p;
const cur = (h, p) => (isCur(h, p) ? ' aria-current="page"' : '');
const addrLine = (s) => { const a = s.address || {}; return `${a.street}, ${a.city}, ${a.state} ${a.zip}`; };
const extIco = (u) => (/^https?:/i.test(String(u)) ? icon('ext', 'ico--ext') : '');
const socialIcon = (n) => (/instagram/i.test(n) ? 'instagram' : /linkedin/i.test(n) ? 'linkedin' : /facebook/i.test(n) ? 'facebook' : /tiktok/i.test(n) ? 'tiktok' : 'ext');
const sentence1 = (t) => (String(t || '').match(/^[^.!?]+[.!?]/) || [String(t || '')])[0].trim();
const cap = (t) => String(t || '').replace(/^\s*([a-z])/, (m, c) => c.toUpperCase());

// ---------- logo: the captured wordmark file when CAPTURE has delivered it, else a typeset fallback ----------
const BRAND_DIR = path.join(ROOT, 'assets/brand');
let LOGO;
function logoInfo() {
  if (LOGO !== undefined) return LOGO;
  LOGO = null;
  let files = [];
  try { files = fs.readdirSync(BRAND_DIR); } catch { files = []; }
  const rank = (f) => (/\.svg$/i.test(f) ? 0 : /\.png$/i.test(f) ? 1 : 2);
  const pick = (re) => files.filter((f) => re.test(f)).sort((a, b) => rank(a) - rank(b))[0] || null;
  const info = (f) => {
    if (!f) return null;
    const file = path.join(BRAND_DIR, f);
    let w = 0, h = 0;
    try {
      const buf = fs.readFileSync(file);
      if (/\.svg$/i.test(f)) {
        const t = buf.toString('utf8');
        const vb = t.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
        if (vb) { w = Math.round(+vb[1]); h = Math.round(+vb[2]); }
      } else { const s = imageSize(buf); if (s) ({ w, h } = s); }
    } catch { /* unreadable: treated as absent */ }
    return w && h ? { src: '/assets/brand/' + f, w, h } : null;
  };
  const main = info(pick(/^ladyl-logo\.(svg|png|webp)$/i) || pick(/^ladyl-(logo|wordmark)[\w-]*\.(svg|png|webp)$/i));
  const light = info(pick(/^ladyl-(logo|wordmark)-(light|white|reverse|inverse|dark-bg)\.(svg|png|webp)$/i));
  LOGO = main || light ? { main: main || light, light } : null;
  return LOGO;
}
// logoHtml(ctx, { eager, on: 'night' | 'cream', cls }) -> the brand mark (no link). On night grounds the light variant is
// used when CAPTURE ships one; otherwise the colour wordmark sits on a small cream glass chip so its purple reads.
export function logoHtml(ctx, { eager = false, on = 'night', cls = '' } = {}) {
  const L = logoInfo();
  const name = (ctx.site && ctx.site.name) || 'Lady L Cannabis';
  if (!L) {
    return `<span class="brand__type${cls ? ' ' + cls : ''}"><span class="sr-only">${esc(name)}</span><span class="brand__word" aria-hidden="true"><span class="brand__lady">Lady</span><span class="brand__l">L</span></span><span class="brand__sub" aria-hidden="true">Cannabis</span></span>`;
  }
  const useLight = on === 'night' && L.light;
  const f = useLight ? L.light : L.main;
  const chip = on === 'night' && !useLight;
  return `<span class="brand__mark${chip ? ' brand__mark--chip' : ''}${cls ? ' ' + cls : ''}"><img${attrs({ class: 'brand__logo', src: f.src, width: f.w, height: f.h, alt: name, decoding: 'async', loading: eager ? 'eager' : 'lazy', fetchpriority: eager ? 'high' : null })}></span>`;
}

// ---------- hours ----------
const hoursRows = (rows) => (rows || []).map((r) => `<li><span class="hours__d">${esc(r.days)}</span><span class="hours__t">${esc(r.open)} to ${esc(r.close)}</span></li>`).join('');
export function hoursHtml(ctx, cls = '') {
  return `<ul class="hours${cls ? ' ' + cls : ''}">${hoursRows(ctx.site && ctx.site.hours)}</ul>`;
}
export function deliveryHoursHtml(ctx, cls = '') {
  return `<ul class="hours hours--delivery${cls ? ' ' + cls : ''}">${hoursRows(ctx.site && ctx.site.deliveryHours)}</ul>`;
}

// ---------- service facts: Lady L's own sentences from site.json (short = verbatim fragments for the top bar) ----------
export function serviceFacts(ctx) {
  const s = ctx.site || {};
  const d = s.delivery || {};
  const p = s.pickup || {};
  const win = (String(d.window || '').match(/approximately\s+[^.]+/i) || [])[0];
  const free = (String(d.minimum || '').match(/free on orders of [^.,;]+/i) || [])[0];
  const lc = String(s.lastCall || '').match(/^(last call)\b.*?\bis\s+(.+?)\.?$/i);
  return {
    delivery: {
      short: win && free ? `${cap(win)}, ${free}` : sentence1(d.window),
      facts: [d.window, d.minimum, d.id].filter(Boolean),
      more: [d.zone1Fee, d.account].filter(Boolean),
    },
    pickup: {
      short: lc ? `${cap(lc[1])} ${lc[2]}` : sentence1(s.lastCall),
      facts: [sentence1(p.step), p.order].filter(Boolean),
      more: [],
    },
    lastCall: s.lastCall || '',
  };
}

// serviceCards(ctx, { h = 3, compact = false, reveal = true, cls = '' }) -> the Delivery + Pickup .svc pair
export function serviceCards(ctx, { h = 3, compact = false, reveal = true, cls = '' } = {}) {
  const F = serviceFacts(ctx);
  const svcs = (ctx.ia.topbar && ctx.ia.topbar.services) || [];
  const del = svcs.find((x) => x.icon === 'truck') || svcs[0] || {};
  const pick = svcs.find((x) => x.icon === 'bag') || svcs[1] || {};
  const cards = [
    { key: 'delivery', ico: 'truck', kicker: 'Delivery', title: 'Weed Delivery', facts: compact ? F.delivery.facts.slice(0, 2) : [...F.delivery.facts, F.lastCall], cta: del, info: del.info || '/service/', infoLabel: 'Delivery details' },
    { key: 'pickup', ico: 'bag', kicker: 'Pickup', title: 'In-Store Pickup', facts: compact ? [F.pickup.facts[0], F.lastCall] : [...F.pickup.facts, F.lastCall], cta: pick, info: pick.info || '/in-store-pickup/', infoLabel: 'Pickup details' },
  ];
  const H = `h${Math.min(6, Math.max(2, h))}`;
  return `<div class="svc-pair${cls ? ' ' + cls : ''}">
${cards.map((c, i) => `<article class="svc svc--${c.key} glass glass--lift"${reveal ? ` data-reveal style="--i:${i}"` : ''}>
<span class="svc__icon" aria-hidden="true">${icon(c.ico)}</span>
<p class="kicker svc__kicker">${esc(c.kicker)}</p>
<${H} class="svc__title">${esc(c.title)}</${H}>
<ul class="svc__facts">${c.facts.filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<div class="svc__cta btn-row"><a class="btn btn--sun btn--sm"${linkAttrs(c.cta.href || menu(ctx))}>${esc(c.cta.label || 'Order Now')}${extIco(c.cta.href || menu(ctx))}</a><a class="link-arrow"${linkAttrs(c.info)}>${esc(c.infoLabel)}${icon('arrow')}</a></div>
</article>`).join('\n')}
</div>`;
}

// ---------- media helpers ----------
const photoExists = (src) => !!src && String(src).startsWith('/assets/') && fs.existsSync(path.join(ROOT, String(src).replace(/^\//, '')));
function anyImg(ref, opts = {}) {
  if (!ref) return '';
  if (/^g-/.test(ref)) return gimg(ref, opts);
  if (photoExists(ref)) return img({ src: ref, alt: opts.alt ?? '' }, opts);
  // placeholder value (ia.json "STORE_PHOTO") or a photo CAPTURE has not delivered yet: a styled slot in lane builds,
  // a hard image error in the final build (fail closed)
  if (process.env.ALLOW_MISSING_GEN === '1') return `<span class="img-slot ${opts.cls || ''}" data-slot="${escA(ref)}" role="img" aria-label="${escA(opts.alt || '')}"></span>`;
  return img({ src: ref, alt: opts.alt ?? '' }, opts);
}

// ---------- dropdown panels ----------
function linkList(links, p, cls = '') {
  return `<ul class="mega__links${cls}">${links.map((l) => `<li><a class="mega__link"${linkAttrs(l.href)}${cur(l.href, p)}><span>${esc(l.label)}</span>${icon('arrow', 'ico--go')}</a></li>`).join('')}</ul>`;
}
function featureCard(ctx, f, sub) {
  if (!f) return '';
  return `<a class="mega__card"${linkAttrs(f.href)}>
<span class="mega__card-media">${anyImg(f.gimg || f.photo, { alt: '', sizes: '(min-width: 1024px) 300px, 120px' })}</span>
<span class="mega__card-body"><span class="mega__card-t">${esc(f.title)}</span>${sub ? `<span class="mega__card-l">${esc(sub)}</span>` : ''}<span class="mega__card-go">${icon('arrow')}</span></span>
</a>`;
}
function panelInner(ctx, it, p) {
  const s = ctx.site;
  const kids = it.children || [];
  const head = (all) => `<div class="mega__head"><p class="mega__h">${esc(it.label)}</p>${all || ''}</div>`;
  if (kids.some((k) => k.gimg)) { // Products: the 8 category arch cards
    return `${head(`<a class="mega__all link-arrow"${linkAttrs(it.href)}${cur(it.href, p)}>Shop all products${icon('arrow')}</a>`)}
<ul class="mega__tiles">${kids.map((k) => `<li><a class="mega__tile"${linkAttrs(k.href)}${cur(k.href, p)}><span class="mega__arch">${gimg(k.gimg, { alt: '', sizes: '(min-width: 1024px) 150px, 40vw' })}</span><span class="mega__tile-t">${esc(k.label)}</span></a></li>`).join('')}</ul>`;
  }
  if (kids.some((k) => k.icon)) { // Services: icon links + a delivery facts glass card
    const F = serviceFacts(ctx);
    const del = ((ctx.ia.topbar && ctx.ia.topbar.services) || []).find((x) => x.icon === 'truck') || {};
    return `<div class="mega__col">${head('')}<ul class="mega__icons">${kids.map((k) => `<li><a class="mega__icon-link"${linkAttrs(k.href)}${cur(k.href, p)}><span class="mega__icon">${icon(k.icon || 'arrow')}</span><span class="mega__icon-t">${esc(k.label)}</span>${icon('arrow', 'ico--go')}</a></li>`).join('')}</ul></div>
<div class="mega__facts glass glass--strong">
<p class="kicker">Delivery</p>
<ul class="mega__fact-list">${[...F.delivery.facts.slice(0, 2), F.lastCall].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<a class="btn btn--sun btn--sm"${linkAttrs(del.href || menu(ctx))}>${esc(del.label || 'Order Now')}${extIco(del.href || menu(ctx))}</a>
</div>`;
  }
  if (it.feature) { // About / Education: links + a feature image card
    const sub = it.feature.photo ? addrLine(s) : '';
    return `<div class="mega__col">${head('')}${linkList(kids, p, kids.length > 8 ? ' mega__links--3' : ' mega__links--2')}</div>
<div class="mega__feature">${featureCard(ctx, it.feature, sub)}</div>`;
  }
  // Neighborhoods: the areas with pins (the last child, the hub, becomes the head link)
  const hub = kids.find((k) => pathOf(k.href) === pathOf(it.href));
  const areas = kids.filter((k) => k !== hub);
  return `<div class="mega__col">${head(hub ? `<a class="mega__all link-arrow"${linkAttrs(hub.href)}${cur(hub.href, p)}>${esc(hub.label)}${icon('arrow')}</a>` : '')}
<ul class="mega__areas">${areas.map((k) => `<li><a class="mega__area"${linkAttrs(k.href)}${cur(k.href, p)}>${icon('pin')}<span>${esc(k.label)}</span></a></li>`).join('')}</ul></div>
<div class="mega__store glass glass--strong">
<span class="rainbow mega__rainbow" aria-hidden="true"></span>
<p class="kicker">${esc(s.address.neighborhood || s.address.city)}</p>
<p class="mega__store-t">${esc(s.address.street)}</p>
<p class="mega__store-l">${esc(`${s.address.city}, ${s.address.state} ${s.address.zip}`)}</p>
<a class="link-arrow"${linkAttrs(s.mapUrl)}>Get directions${icon('arrow')}</a>
</div>`;
}

function navHtml(ctx, p) {
  const s = ctx.site;
  const F = serviceFacts(ctx);
  const items = (ctx.ia.nav || []).map((it) => {
    const kids = it.children || [];
    const owns = isCur(it.href, p) || kids.some((k) => isCur(k.href, p));
    if (!kids.length) {
      return `<li class="nav__item${pathOf(it.href) === '/' ? ' nav__item--home' : ''}${owns ? ' is-current' : ''}"><div class="nav__row"><a class="nav__link"${linkAttrs(it.href)}${cur(it.href, p)}>${esc(it.label)}</a></div></li>`;
    }
    const id = 'mega-' + it.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const kind = kids.some((k) => k.gimg) ? 'tiles' : kids.some((k) => k.icon) ? 'services' : it.feature ? 'feature' : 'areas';
    return `<li class="nav__item has-panel${owns ? ' is-current' : ''}" data-mega>
<div class="nav__row"><a class="nav__link"${linkAttrs(it.href)}${cur(it.href, p)}>${esc(it.label)}</a><button class="nav__more" type="button" aria-expanded="false" aria-controls="${id}" data-dropdown-trigger>${icon('chev', 'ico--chev')}<span class="sr-only">${esc(it.label)} menu</span></button></div>
<div class="mega mega--${kind}" id="${id}" data-dropdown-panel>
<div class="mega__panel wrap wrap--wide">${panelInner(ctx, it, p)}</div>
</div>
</li>`;
  }).join('\n');
  const svcs = (ctx.ia.topbar && ctx.ia.topbar.services) || [];
  return `<nav class="nav" id="site-nav" aria-label="Main" data-nav>
<div class="nav__drawer-head"><a class="brand brand--drawer"${linkAttrs('/')}>${logoHtml(ctx)}</a><button class="nav__close" type="button" data-nav-close>${icon('close')}<span class="sr-only">Close menu</span></button></div>
<ul class="nav__list">
${items}
</ul>
<div class="nav__drawer-foot">
<div class="nav__svcs">${svcs.map((sv) => `<a class="nav__svc"${linkAttrs(sv.href)}>${icon(sv.icon || 'arrow')}<span><strong>${esc(sv.label)}</strong><small>${esc(sv.icon === 'bag' ? F.pickup.short : F.delivery.short)}</small></span></a>`).join('')}</div>
<a class="btn btn--sun nav__cta"${linkAttrs(ctx.ia.cta.href)}>${esc(ctx.ia.cta.label)}${extIco(ctx.ia.cta.href)}</a>
<ul class="nav__quick">${((ctx.ia.topbar && ctx.ia.topbar.links) || []).map((l) => `<li><a${linkAttrs(l.href)}${cur(l.href, p)}>${esc(l.label)}${extIco(l.href)}</a></li>`).join('')}</ul>
<div class="nav__store">
<a class="nav__store-row"${linkAttrs(s.mapUrl)}>${icon('pin')}<span>${esc(addrLine(s))}</span></a>
<a class="nav__store-row"${linkAttrs(s.phoneHref)}>${icon('phone')}<span>${esc(s.phone)}</span></a>
<div class="nav__store-row nav__store-hours">${icon('clock')}<div><p class="nav__store-h">Store Hours</p>${hoursHtml(ctx)}</div></div>
</div>
</div>
</nav>`;
}

function topbarHtml(ctx, p) {
  const tb = ctx.ia.topbar || {};
  const F = serviceFacts(ctx);
  const pills = (tb.services || []).map((sv) => {
    const k = sv.icon === 'bag' ? 'pickup' : 'delivery';
    return `<li class="svc-pill svc-pill--${k}"><a class="svc-pill__main"${linkAttrs(sv.href)}>${icon(sv.icon || 'arrow')}<span class="svc-pill__label">${esc(sv.label)}</span><span class="svc-pill__fact">${esc(F[k].short)}</span></a>${sv.info ? `<a class="svc-pill__info"${linkAttrs(sv.info)}${cur(sv.info, p)}>${icon('info')}<span class="sr-only">${k === 'pickup' ? 'Pickup details' : 'Delivery details'}</span></a>` : ''}</li>`;
  }).join('');
  return `<div class="topbar">
<div class="topbar__inner wrap wrap--wide">
<ul class="topbar__svcs">${pills}</ul>
<ul class="topbar__links">${(tb.links || []).map((l) => `<li><a class="topbar__link"${linkAttrs(l.href)}${cur(l.href, p)}>${esc(l.label)}${extIco(l.href)}</a></li>`).join('')}</ul>
</div>
</div>`;
}

function headerHtml(ctx, p) {
  return `${topbarHtml(ctx, p)}
<header class="site-header" data-header>
<div class="mainbar wrap wrap--wide">
<a class="brand"${linkAttrs('/')}${p === '/' ? ' aria-current="page"' : ''}>${logoHtml(ctx, { eager: true })}</a>
${navHtml(ctx, p)}
<div class="header-tools">
<a class="btn btn--sun btn--sm header-cta"${linkAttrs(ctx.ia.cta.href)}>${esc(ctx.ia.cta.label)}</a>
<button class="nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" data-nav-toggle>${icon('menu')}<span class="nav-toggle__t">Menu</span></button>
</div>
</div>
</header>
<div class="nav-scrim" data-nav-scrim hidden></div>`;
}

// ---------- prefooter: areas band (places + delivery towns grouped by county) ----------
const linkPath = (u) => { const m = String(u || '').match(/^(?:https?:\/\/(?:www\.)?ladyljerseycity\.com)?(\/[^?#"]*)/i); return m ? href(m[1]) : ''; };
const titleCase = (t) => String(t || '').replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
function countyMap(ctx) {
  // the captured /service/ page: county sections ("Hudson County ...") listing their towns as links
  const out = new Map();
  const svc = (ctx.content && (ctx.content.service || Object.values(ctx.content).find((c) => c && c.path === '/service/'))) || null;
  if (!svc) return out;
  for (const sec of svc.sections || []) {
    let county = /county/i.test(sec.heading || '') ? sec.heading : '';
    const inAreas = /areas we serve/i.test(sec.heading || '');
    for (const b of sec.blocks || []) {
      if (/^h[2-4]$/.test(b.type) && (/county/i.test(b.text || '') || (inAreas && b.type === 'h3'))) { county = b.text; continue; }
      if (!county) continue;
      if (/^h[4-6]$/.test(b.type) && b.text && !out.has('name:' + normName(b.text))) out.set('name:' + normName(b.text), { county: county.trim(), label: b.text.trim() });
      if (!/^h[1-6]$/.test(b.type) && b.href) { // "card" blocks: { href, title }
        const pth = linkPath(b.href);
        if (/^\/service\/[^/]+\/$/.test(pth) && !out.has(pth)) out.set(pth, { county: county.replace(/\s*:.*$/, '').trim(), label: String(b.title || b.text || '').trim() });
      }
      const htmls = [].concat(b.items || [], b.html || []);
      for (const h of htmls) {
        for (const m of String(h).matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
          const pth = linkPath(m[1]);
          if (/^\/service\/[^/]+\/$/.test(pth) && !out.has(pth)) out.set(pth, { county: county.replace(/\s*:.*$/, '').trim(), label: m[2].replace(/<[^>]+>/g, '').trim() });
        }
      }
    }
  }
  return out;
}
const normName = (t) => String(t || '').toLowerCase().replace(/[^a-z]+/g, '');
const countyKey = (c) => String(c || '').replace(/\bcounty\b.*$/i, '').trim();
export function areasBand(ctx) {
  const ia = ctx.ia;
  const pf = (ia.prefooter && ia.prefooter.areas) || {};
  const navAreas = ((ia.nav || []).find((n) => pathOf(n.href) === '/new-jersey/') || {}).children || [];
  const navLabel = new Map(navAreas.map((k) => [pathOf(k.href), k.label]));
  const hub = navAreas.find((k) => pathOf(k.href) === '/new-jersey/');
  const near = (ctx.places && ctx.places.length ? ctx.places.map((pl) => ({ href: pl.path || `/new-jersey/${pl.slug}/`, label: navLabel.get(href(pl.path || `/new-jersey/${pl.slug}/`)) || String(pl.h1 || pl.title || pl.slug).replace(/^.*?near\s+/i, '').replace(/\s*\|.*$/, '') }))
    : navAreas.filter((k) => k !== hub));
  // group by the record's own county (data.mjs fills it); the /service/ capture is only a fallback for a record without one
  const cmap = (ctx.delivery || []).every((d) => d.county) ? new Map() : countyMap(ctx);
  const groups = new Map();
  for (const d of ctx.delivery || []) {
    const pth = href(d.path || `/service/${d.slug}/`);
    const hit = d.county ? null : cmap.get(pth) || cmap.get('name:' + normName(d.name || d.town || ''));
    const county = countyKey(d.county || (hit && hit.county) || '');
    const label = d.name || d.town || (hit && hit.label) || String(d.h1 || '').replace(/^.*?(delivery|dispensary)\s+(in|near|to)?\s*/i, '').replace(/,?\s*(NJ|New Jersey).*$/i, '').trim() || titleCase(String(d.slug || '').replace(/-/g, ' '));
    const k = county || '';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ href: pth, label });
  }
  const order = ((ctx.site.delivery && ctx.site.delivery.counties) || []).map(countyKey);
  const keys = [...groups.keys()].sort((a, b) => { const ia2 = order.indexOf(a), ib = order.indexOf(b); return (ia2 < 0 ? 99 : ia2) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
  const chips = (list) => `<ul class="areas__chips">${list.map((l) => `<li><a class="chip"${linkAttrs(l.href)}>${esc(l.label)}</a></li>`).join('')}</ul>`;
  const zones = ctx.site.delivery && ctx.site.delivery.zones;
  return `<section class="areas band band--linen" aria-labelledby="areas-h">
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="areas__botanical"></span></div>
<div class="wrap wrap--wide">
<div class="areas__head">
<p class="kicker">Delivery and pickup</p>
<h2 class="display areas__h" id="areas-h">${esc(String(pf.heading || 'New Jersey Areas We Serve').replace(/\s+(\S+)$/, ' '))}<em>${esc(String(pf.heading || 'New Jersey Areas We Serve').split(/\s+/).pop())}</em></h2>
${zones ? `<p class="lede areas__lede">${esc(zones)}</p>` : ''}
</div>
<div class="areas__groups">
${near.length ? `<div class="areas__group areas__group--near"><h3 class="areas__county">${icon('pin')}Dispensary Near</h3>${chips(near)}</div>` : ''}
${keys.map((k) => `<div class="areas__group"><h3 class="areas__county">${icon('truck')}${k ? `<a${linkAttrs('/service/#county-' + k.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}>${esc(`${k} County`)}</a>` : esc('Weed Delivery Areas We Serve')}</h3>${chips(groups.get(k).sort((a, b) => a.label.localeCompare(b.label)))}</div>`).join('\n')}
</div>
<div class="btn-row areas__cta"><a class="btn btn--deco"${linkAttrs((hub && hub.href) || '/new-jersey/')}>${esc((hub && hub.label) || 'New Jersey Areas We Serve')}</a><a class="link-arrow"${linkAttrs('/service/#areas')}>Weed Delivery Areas We Serve${icon('arrow')}</a></div>
</div>
</section>`;
}

// ---------- prefooter: newsletter band (Lady L's own sign-up words, a demo form) ----------
export function newsletterBand(ctx) {
  const nl = (ctx.ia.prefooter && ctx.ia.prefooter.newsletter) || {};
  const consent = nl.consent ? esc(nl.consent).replace(/privacy policy/i, (m) => `<a${linkAttrs('/privacy-policy/')}>${m}</a>`) : '';
  let form = demoForm({ id: 'newsletter-form', fields: nl.fields || ['Email'], button: nl.button || 'Sign up', cls: 'demo-form--inline newsletter__form' });
  form = form.replace(/btn--lime/g, 'btn--sun');
  if (consent) form = form.replace(/<button /, `<label class="demo-form__check"><input type="checkbox" name="consent" value="yes"><span>${consent}</span></label>\n<button `);
  return `<section class="newsletter band band--sun" aria-labelledby="newsletter-h" data-sunburst>
<span class="fringe-edge fringe-edge--linen" aria-hidden="true"></span>
<div class="band__clip" aria-hidden="true"><span class="grain"></span><span class="newsletter__fan"></span></div>
<div class="wrap newsletter__inner">
<div class="newsletter__copy" data-reveal>
<p class="kicker">Sign up</p>
<h2 class="display newsletter__h" id="newsletter-h">Get the latest <em>updates</em></h2>
${ctx.site.loyaltyLine ? `<p class="newsletter__line">${esc(ctx.site.loyaltyLine)}</p>` : ''}
</div>
<div class="newsletter__panel glass" data-reveal style="--i:1">${form}</div>
</div>
</section>`;
}

// ---------- footer ----------
function footerHtml(ctx, p) {
  const s = ctx.site;
  const f = ctx.ia.footer || {};
  const col = (c) => `<div class="footer__col"><h2 class="footer__h">${esc(c.title)}</h2><ul class="footer__links">${(c.links || []).map((l) => `<li><a${linkAttrs(l.href)}${cur(l.href, p)}>${esc(l.label)}</a></li>`).join('')}</ul></div>`;
  const loy = f.loyalty || {};
  return `<footer class="site-footer">
<div class="band__clip" aria-hidden="true"><span class="footer__rays"></span><span class="grain"></span></div>
<div class="chevron-rule" aria-hidden="true"></div>
<div class="wrap wrap--wide footer__inner">
<div class="footer__grid">
<section class="footer__store" aria-labelledby="footer-store-h">
<a class="brand brand--footer"${linkAttrs('/')}>${logoHtml(ctx)}</a>
${s.tagline ? `<p class="footer__tagline">${esc(s.tagline)}</p>` : ''}
<h2 class="footer__h" id="footer-store-h">${esc(f.getInTouch || s.name)}</h2>
<address class="footer__addr"><a${linkAttrs(s.mapUrl)}>${icon('pin')}<span>${esc(addrLine(s))}</span></a></address>
<ul class="footer__contact">
<li><a${linkAttrs(s.phoneHref)}>${icon('phone')}<span>${esc(s.phone)}</span></a></li>
${s.email ? `<li><a${linkAttrs('mailto:' + s.email)}>${icon('mail')}<span>${esc(s.email)}</span></a></li>` : ''}
</ul>
<ul class="footer__socials">${(s.socials || []).map((x) => `<li><a class="footer__social"${linkAttrs(x.url)}>${icon(socialIcon(x.name))}<span>${esc(x.name)}</span></a></li>`).join('')}</ul>
</section>
<div class="footer__hours">
<div class="footer__hours-box"><p class="footer__sub">${icon('clock')}<span>Store Hours</span></p>${hoursHtml(ctx)}</div>
<div class="footer__hours-box"><p class="footer__sub">${icon('truck')}<span>Delivery Hours</span></p>${deliveryHoursHtml(ctx)}</div>
${s.lastCall ? `<p class="footer__lastcall">${esc(s.lastCall)}</p>` : ''}
</div>
<nav class="footer__cols" aria-label="Footer">
${(f.columns || []).map(col).join('\n')}
</nav>
</div>
<div class="footer__loyalty glass">
<span class="footer__loyalty-fan" aria-hidden="true"></span>
<p class="footer__loyalty-line">${esc(loy.line || s.loyaltyLine || '')}</p>
<a class="btn btn--sun"${linkAttrs(s.loyaltySignup)}>${esc(loy.label || 'Sign Up For Loyalty')}${extIco(s.loyaltySignup)}</a>
</div>
${s.disclaimer ? `<p class="footer__disclaimer">${esc(s.disclaimer)}</p>` : ''}
<div class="footer__legal">
<p class="footer__copy">${esc(s.copyright || '')}</p>
<ul class="footer__legal-links">${(f.legal || []).map((l) => `<li><a${linkAttrs(l.href)}${cur(l.href, p)}>${esc(l.label)}</a></li>`).join('')}</ul>
<a class="footer__top" href="#top" data-to-top>Back to top${icon('up')}</a>
</div>
</div>
<div class="footer__mark" aria-hidden="true" data-footer-mark>
<div class="footer__mark-in">
<span class="footer__bulbs"></span>
<span class="footer__word">LADY L</span>
<span class="footer__word footer__word--lit">LADY L</span>
<span class="footer__bulbs footer__bulbs--b"></span>
</div>
</div>
</footer>`;
}

// ---------- 21+ gate (D7): neutral words from site.json ageGate. Hidden by default; site.js opens it unless
// localStorage ladyl-age-ok = 1, so it never blocks the page without JS. ----------
function gateHtml(ctx) {
  const g = ctx.site.ageGate || {};
  return `<div class="age-gate" data-age-gate data-age-key="ladyl-age-ok" hidden>
<div class="age-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="age-gate-q">
<span class="age-gate__fan" aria-hidden="true"></span>
<div class="age-gate__logo">${logoHtml(ctx)}</div>
<h2 class="age-gate__q" id="age-gate-q">${esc(g.question || 'Are you 21 or older?')}</h2>
<div class="btn-row age-gate__actions"><button class="btn btn--sun" type="button" data-age-yes>${esc(g.yes || 'Yes')}</button><button class="btn btn--ghost" type="button" data-age-no>${esc(g.no || 'No')}</button></div>
<p class="age-gate__no" data-age-refusal role="alert" hidden>${esc(g.denied || '')}</p>
</div>
</div>`;
}

function ogImage(ctx, og) {
  let u = og.image;
  if (!u && hasGenerated('g-hero-parlor')) u = imgUrl('g-hero-parlor', 1440);
  if (!u) return '';
  return /^https?:/i.test(u) ? u : (ctx.site.origin || '') + u;
}

function storeLd(ctx) {
  const s = ctx.site;
  const a = s.address || {};
  return {
    '@context': 'https://schema.org', '@type': 'Store', name: s.name, url: s.origin + '/',
    telephone: s.phoneHref ? s.phoneHref.replace(/^tel:/, '') : s.phone, email: s.email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city, addressRegion: a.state, postalCode: a.zip, addressCountry: 'US' },
    openingHoursSpecification: (s.hoursSchema || []).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.dayOfWeek, opens: h.opens, closes: h.closes })),
    hasMap: s.mapUrl || undefined,
    sameAs: (s.socials || []).map((x) => x.url),
  };
}

const brandHref = (re) => { try { const f = fs.readdirSync(BRAND_DIR).find((x) => re.test(x)); return f ? '/assets/brand/' + f : ''; } catch { return ''; } };

// kept for lanes written against the stub: the old CTA trio no longer exists in this design
export function ctaTrio() { return ''; }

export function page({ ctx, path: p, title, description, canonical, og = {}, jsonld = [], bodyClass = '', main = '', crumbs = [], heroCrumbs = false, scripts = [], preload = [], noPrefooter = false, noTrio = false }) {
  const can = canonical || absUrl(ctx, p);
  const css = (ctx.cssFiles || []).map((f) => `<link rel="stylesheet" href="/assets/css/${f}.css">`).join('\n');
  const lds = [].concat(jsonld || []).filter(Boolean);
  const types = lds.map((o) => o['@type']);
  if (crumbs && crumbs.length > 1 && !types.includes('BreadcrumbList')) {
    lds.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((raw, i) => { const c = crumbParts(raw); return { '@type': 'ListItem', position: i + 1, name: c.label, item: absUrl(ctx, c.href || p) }; }) });
  }
  if (p === '/' && !types.some((t) => /Store|LocalBusiness|Organization/.test(String(t)))) lds.push(storeLd(ctx));
  const ld = lds.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  const pre = (preload || []).filter(Boolean).map((x) => `<link rel="preload"${attrs(x)}>`).join('\n');
  const js = [...new Set(['site.js', ...(scripts || [])])];
  const ogi = ogImage(ctx, og || {});
  const fav = fs.existsSync(path.join(BRAND_DIR, 'favicon-32.png')) ? '/favicon-32.png' : brandHref(/^favicon[\w-]*\.(png|svg|ico)$/i);
  const touch = fs.existsSync(path.join(BRAND_DIR, 'apple-touch-icon.png')) ? '/apple-touch-icon.png' : '';
  const skip = noPrefooter === true || noTrio === true;
  const showAreas = !skip && noPrefooter !== 'areas';
  const showNews = !skip && noPrefooter !== 'newsletter';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${escA(description)}">
<link rel="canonical" href="${escA(can)}">
<meta property="og:site_name" content="${escA(ctx.site.name)}">
<meta property="og:title" content="${escA(og.title || title)}">
<meta property="og:description" content="${escA(og.description || description)}">
<meta property="og:url" content="${escA(og.url || can)}">
<meta property="og:type" content="${escA(og.type || 'website')}">
${ogi ? `<meta property="og:image" content="${escA(ogi)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#120f24">
${fav ? `<link rel="icon" href="${escA(fav)}">` : ''}
${touch ? `<link rel="apple-touch-icon" href="${escA(touch)}">` : ''}
<link rel="preload" href="/assets/fonts/bodoni-moda-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/josefin-sans-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/montserrat-normal.woff2" as="font" type="font/woff2" crossorigin>
${pre}
${css}
<script>document.documentElement.classList.add('js');</script>
${ld}
</head>
<body id="top"${attrs({ class: bodyClass })}>
<a class="skip" href="#main">Skip to content</a>
<div class="site">
${headerHtml(ctx, p)}
${crumbs && crumbs.length && !heroCrumbs ? `<div class="crumbs-bar"><div class="wrap wrap--wide">${crumbsHtml(crumbs)}</div></div>` : ''}
<main id="main">
${main}
</main>
${showAreas ? areasBand(ctx) : ''}
${showNews ? newsletterBand(ctx) : ''}
${footerHtml(ctx, p)}
<a class="to-top" href="#top" data-to-top data-to-top-float>${icon('up')}<span class="sr-only">Back to top</span></a>
</div>
${gateHtml(ctx)}
${js.map((f) => `<script src="/assets/js/${escA(f)}" defer></script>`).join('\n')}
</body>
</html>`;
}
