// sitemap.mjs - PAGES lane: /sitemap/ (+ sitemap.xml written into the build's out dir). Rendered LAST (index.mjs
// MODULES), so ctx.pages holds every rendered page: each is listed once, grouped Shop / Services / Neighborhoods /
// Delivery Areas / Learn / Blog / Events / About / Legal (a page no rule knows lands in About, never dropped).
// Labels: ia.json labels first, then post / event / place / town / guide titles, then the page's own <h1>.
import fs from 'node:fs';
import nodePath from 'node:path';
import { esc, escA, linkAttrs, stripTags, absUrl, menu } from './util.mjs';
import { page, crumbsHtml, icon } from './shell.mjs';

const PATH = '/sitemap/';
const GROUPS = [
  { name: 'Shop', ico: 'bag' }, { name: 'Services', ico: 'truck' }, { name: 'Neighborhoods', ico: 'pin' },
  { name: 'Delivery Areas', ico: 'truck' }, { name: 'Learn', ico: 'leaf' }, { name: 'Blog', ico: 'sparkle' },
  { name: 'Events', ico: 'star' }, { name: 'About', ico: 'sun' }, { name: 'Legal', ico: 'id' },
];
const clean = (t) => stripTags(String(t || '')).replace(/\s*\|\s*LADY L CANNABIS\s*$/i, '').replace(/\s+/g, ' ').trim();

function labels(ctx) {
  const L = new Map();
  const put = (u, l) => {
    if (!u || !l || typeof u !== 'string' || !u.startsWith('/') || u.includes('#')) return;
    const p = u.replace(/[?#].*$/, '');
    const k = /\.[a-z0-9]{2,5}$/i.test(p) || p.endsWith('/') ? p : p + '/';
    if (!L.has(k)) L.set(k, clean(l));
  };
  put('/', 'Home');
  put('/service/', 'Weed Delivery');
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') { if (typeof o.href === 'string' && (o.label || o.title)) put(o.href, o.label || o.title); Object.values(o).forEach(walk); }
  };
  walk(ctx.ia && ctx.ia.nav);
  walk(ctx.ia && ctx.ia.footer);
  for (const p of ctx.posts || []) put(p.path || `/blog/${p.slug}/`, p.h1 || p.title);
  for (const e of ctx.events || []) put(`/events/${e.slug}/`, e.h1 || e.title);
  for (const p of ctx.posts || []) put(`/blog/${p.slug}/`, p.h1 || p.title);
  for (const p of ctx.places || []) put(p.path || `/new-jersey/${p.slug}/`, p.h1 || p.title);
  for (const d of ctx.delivery || []) put(d.path || `/service/${d.slug}/`, d.h1 || d.title);
  for (const g of ctx.learn || []) put(`/education/${g.slug}/`, g.title);
  put('/products/', 'Products');
  put('/about-us/reviews/', 'Reviews');
  put('/404.html', 'Page not found');
  return L;
}

function groupOf(p) {
  if (p.startsWith('/products/') || ['/jersey-city-weed-deals/', '/jersey-city-420-discounts-day/', '/rewards/', '/refer-a-friend/'].includes(p)) return 'Shop';
  if (p === '/service/' || p === '/in-store-pickup/') return 'Services';
  if (p.startsWith('/new-jersey/')) return 'Neighborhoods';
  if (p.startsWith('/service/')) return 'Delivery Areas';
  if (p.startsWith('/education/') || p === '/cannabis-guide/') return 'Learn';
  if (p.startsWith('/blog/')) return 'Blog';
  if (p.startsWith('/events/')) return 'Events';
  if (['/privacy-policy/', '/terms-of-service/', '/accessibility/', PATH].includes(p)) return 'Legal';
  return 'About';
}
// hubs first inside a group, then the rest alphabetically
const HUBS = ['/', '/products/', '/jersey-city-weed-deals/', '/jersey-city-420-discounts-day/', '/rewards/', '/refer-a-friend/', '/service/', '/in-store-pickup/', '/new-jersey/', '/education/', '/cannabis-guide/', '/blog/', '/events/', '/about-us/', '/about-us/reviews/', '/faq/', '/community/', '/contact-us/', '/privacy-policy/', '/terms-of-service/', '/accessibility/', PATH];

export async function render(ctx) {
  const L = labels(ctx);
  const h1Of = (html) => { const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || ''); return m ? clean(m[1]) : ''; };
  const all = [...ctx.pages.keys()].filter((p) => p.endsWith('/'));
  if (!all.includes(PATH)) all.push(PATH);
  const rank = (p) => { const i = HUBS.indexOf(p); return i === -1 ? HUBS.length : i; };
  const entries = all.map((p) => ({ path: p, label: L.get(p) || h1Of((ctx.pages.get(p) || {}).html) || p, group: groupOf(p) }));
  entries.sort((a, b) => rank(a.path) - rank(b.path) || a.label.localeCompare(b.label));
  // page paths are DECODED (an emoji slug is a UTF-8 directory); every href and loc is its encodeURI form
  const li = (e) => `<li><a class="p-sm__link"${linkAttrs(encodeURI(e.path), e.path === PATH ? { 'aria-current': 'page' } : {})}>${esc(e.label)}</a></li>`;
  const groups = GROUPS.map((g, gi) => {
    const items = entries.filter((e) => e.group === g.name);
    if (!items.length) return '';
    const id = 'sm-' + g.name.toLowerCase().replace(/[^a-z]+/g, '-');
    const long = items.length > 10;
    return `<section class="p-sm__group glass glass--cream glass--lift${long ? ' p-sm__group--long' : ''}" data-reveal style="--i:${gi % 3}" aria-labelledby="${id}">
<h2 class="p-sm__title" id="${id}"><span class="p-sm__ico" aria-hidden="true">${icon(g.ico)}</span><span>${esc(g.name)}</span><span class="p-count">${items.length}</span></h2>
<ul class="p-sm__list" role="list">${items.map(li).join('')}</ul>
</section>`;
  }).join('\n');

  const crumbs = [{ href: '/', label: 'Home' }, { href: PATH, label: 'Sitemap' }];
  const title = 'Sitemap | LADY L CANNABIS';
  const description = 'Every page of the Lady L Cannabis site, grouped: shop, services, neighborhoods, delivery areas, learn, blog, events, about and legal.';
  const main = `<section class="page-hero p-hero p-hero--sitemap">
<div class="band__clip p-hero__clip" aria-hidden="true" data-sunburst><span class="p-hero__glow"></span><span class="grain"></span></div>
<div class="wrap page-hero__inner page-hero__inner--solo p-hero__grid">
<div class="page-hero__text p-hero__text">
${crumbsHtml(crumbs)}
<p class="kicker p-kick" data-reveal>Sitemap</p>
<h1 class="display p-hero__title" data-reveal style="--i:1">Every <em>page</em></h1>
<p class="lede p-hero__lede" data-reveal style="--i:2">The whole site, grouped: ${entries.length} pages in all.</p>
<div class="btn-row p-hero__ctas" data-reveal style="--i:3"><a class="btn btn--sun"${linkAttrs(menu(ctx))}><span>Order Now${icon('ext')}</span></a><a class="btn btn--glass"${linkAttrs('/')}><span>Home</span></a></div>
</div>
</div>
</section>
<section class="band band--cream p-sm" aria-label="All pages">
<div class="band__clip" aria-hidden="true"><span class="grain"></span></div>
<div class="wrap"><div class="p-sm__grid">${groups}</div></div>
</section>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((p) => `  <url><loc>${escA(absUrl(ctx, encodeURI(p)))}</loc></url>`).join('\n')}
</urlset>
`;
  const pages = [{ path: PATH, html: page({ ctx, path: PATH, title, description, canonical: absUrl(ctx, PATH), og: { title, description, type: 'website' }, bodyClass: 'p-page p-page--sitemap', main, crumbs, heroCrumbs: true }) }];
  if (ctx.out) { fs.mkdirSync(ctx.out, { recursive: true }); fs.writeFileSync(nodePath.join(ctx.out, 'sitemap.xml'), xml); }
  return pages;
}
