// data.mjs - load every content file once.
//   ctx.site      src/content/site.json        Lady L's facts (main session; every value traced to the live site)
//   ctx.ia        src/content/ia.json          the adopted architecture mapped onto Lady L: top bar, nav, footer, page map
//   ctx.images    src/content/images.json      generated media registry (IMAGERY lane)
//   ctx.content   src/content/pages/<slug>.json     Lady L's captured pages ({ path, title, description, h1, sections, ... })
//   ctx.posts     src/content/posts/<slug>.json     Lady L's blog posts, newest first
//   ctx.events    src/content/events/<slug>.json    Lady L's events, newest first (by start date)
//   ctx.places    src/content/places/<slug>.json    Lady L's "Dispensary Near ..." pages (/new-jersey/<slug>/)
//   ctx.delivery  src/content/delivery/<slug>.json  Lady L's town delivery pages (/service/<slug>/)
//   ctx.learn     src/content/learn/<slug>.json     NEW education guides written for the adopted Education pattern
//   ctx.glue      src/content/category-glue.json    NEW short neutral product-format intros for /products/<cat>/
//   ctx.nj        src/content/nj-law.json           New Jersey law facts with official sources
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';
import { normaliseDashes } from './punct.mjs';

const readJson = (rel, fallback) => {
  const f = path.join(ROOT, rel);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback;
};
const readDir = (rel) => {
  const dir = path.join(ROOT, rel);
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) out[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return out;
};
// newest first; events carry a display date plus startISO, posts an ISO date: compare as times
const when = (x) => { const t = Date.parse(x.startISO || x.date || x.start || ''); return Number.isNaN(t) ? 0 : t; };
const byDate = (a, b) => when(b) - when(a);
const byTitle = (a, b) => String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''));

export function loadAll() {
  const site = normaliseDashes(readJson('src/content/site.json'));
  const ia = readJson('src/content/ia.json');
  const images = readJson('src/content/images.json', { photos: {}, media: {} });
  // punctuation-only dash normalisation of every copy source (src/lib/punct.mjs); words are unchanged.
  const content = normaliseDashes(readDir('src/content/pages'));
  const posts = normaliseDashes(Object.values(readDir('src/content/posts')).sort(byDate));
  const events = normaliseDashes(Object.values(readDir('src/content/events')).sort(byDate));
  // Two live event pages carry fragment descriptions ("Featuring:", "Hey Lady L Fam,"): repair any description under
  // 20 characters from the event's own captured title and date, describing Lady L, never the venue (one was held at JC
  // Pride, not at the store) (docs/OPEN-DECISIONS.md A7).
  for (const e of events) {
    if (String(e.description || '').trim().length >= 20) continue;
    const name = String(e.h1 || e.title || '').replace(/\s*\|\s*LADY L CANNABIS\s*$/i, '').trim();
    e.description = `${name}${e.dateText ? ' (' + e.dateText + ')' : ''}: an event from Lady L Cannabis, the West Side Jersey City dispensary.`;
  }
  const places = normaliseDashes(Object.values(readDir('src/content/places')).sort(byTitle));
  const delivery = normaliseDashes(Object.values(readDir('src/content/delivery')).sort(byTitle));
  // Lady L's /service/ hub lists Jersey City under no county heading (its home city); it is in Hudson County.
  const COUNTY_FIX = { 'jersey-city-weed-delivery': 'Hudson' };
  for (const d of delivery) if (!d.county && COUNTY_FIX[d.slug]) d.county = COUNTY_FIX[d.slug];
  const learn = normaliseDashes(Object.values(readDir('src/content/learn')).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
  const glue = normaliseDashes(readJson('src/content/category-glue.json', {}));
  const nj = normaliseDashes(readJson('src/content/nj-law.json', { facts: [], sources: [] }));
  return { site, ia, images, content, posts, events, places, delivery, learn, glue, nj, team: [] };
}
