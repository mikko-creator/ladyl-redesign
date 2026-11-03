// _demo.mjs - FOUNDATION's lane-private components gallery (/_demo/) and a sample inner page (/_demo/inner/).
// Built only with MODULES_EXTRA=_demo (never in the default MODULES, never in dist/). Sample words here are neutral
// placeholders for the gallery, not site copy.
import { page, crumbsHtml, icon, hoursHtml, deliveryHoursHtml, serviceCards } from './shell.mjs';
import { esc, linkAttrs, gimg, demoForm, menu } from './util.mjs';

const cats = (ctx) => ((ctx.ia.nav || []).find((n) => n.href === '/products/') || {}).children || [];

function hero(ctx, { kicker, title, lede, art = true, crumbs }) {
  return `<section class="page-hero" data-sunburst>
<div class="wrap page-hero__inner${art ? '' : ' page-hero__inner--solo'}">
<div class="page-hero__text">
${crumbs ? crumbsHtml(crumbs) : ''}
<p class="kicker">${esc(kicker)}</p>
<h1 class="display">${title}</h1>
<p class="page-hero__lede">${esc(lede)}</p>
<div class="btn-row"><a class="btn btn--sun"${linkAttrs(menu(ctx))}>Order for Delivery${icon('ext', 'ico--ext')}</a><a class="btn btn--glass"${linkAttrs(menu(ctx))}>Order for Pickup${icon('ext', 'ico--ext')}</a></div>
</div>
${art ? `<div class="page-hero__art"><figure class="arch arch--rainbow" data-depth="0.08"><span class="arch__img">${gimg('g-hf-arch', { alt: '', sizes: '400px', eager: true })}</span></figure></div>` : ''}
</div>
</section>`;
}

function gallery(ctx) {
  const tiles = cats(ctx).map((k, i) => `<a class="tile"${linkAttrs(k.href)} data-reveal style="--i:${i % 4}"><span class="tile__media">${gimg(k.gimg, { alt: '', sizes: '(min-width: 1024px) 260px, 45vw' })}</span><span class="tile__title">${esc(k.label)}</span><span class="tile__cta link-arrow">Shop${icon('arrow')}</span></a>`).join('');
  return `${hero(ctx, { kicker: 'Components', title: 'The Lavender <em>Parlor</em>', lede: 'A gallery of every shared component: grounds, glass, buttons, arches, cards, forms and motion hooks.', crumbs: [['/', 'Home'], ['/_demo/', 'Components']] })}

<section class="band band--cream">
<div class="wrap">
<p class="kicker">Buttons and links</p>
<h2 class="display">Buttons on the <em>day</em> ground</h2>
<div class="btn-row" style="margin-top:24px"><a class="btn btn--sun" href="#">Order Now</a><a class="btn btn--deco" href="#">Deco outline</a><a class="btn btn--ghost" href="#">Ghost</a><a class="btn btn--sun btn--sm" href="#">Small</a><a class="link-arrow" href="#">Link arrow${icon('arrow')}</a></div>
<div class="btn-row" style="margin-top:24px"><span class="chip">Chip</span><span class="chip chip--sun">${icon('tag')}Sun chip</span><span class="chip chip--sky">Sky chip</span><a class="chip" href="#">${icon('pin')}Link chip</a></div>
<p style="margin-top:24px;max-width:60ch">Body text with an <a href="#">inline link whose underline draws from the left</a>, set in Montserrat at 16px.</p>
<div style="display:flex;gap:18px;margin-top:24px;align-items:center"><span class="numeral">1</span><span class="numeral">2</span><span class="numeral">3</span></div>
</div>
</section>

<section class="band band--night" data-spot>
<div class="wrap">
<p class="kicker">Buttons on night</p>
<h2 class="display">Glass over the <em>night</em> ground</h2>
<div class="btn-row" style="margin-top:24px"><a class="btn btn--sun" href="#">Order Now</a><a class="btn btn--glass" href="#">Glass</a><a class="btn btn--deco" href="#">Deco outline</a><a class="btn btn--ghost" href="#">Ghost</a></div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:32px">
<div class="glass glass--lift" style="padding:28px" data-tilt="5"><p class="kicker">Glass</p><h3>Frosted pane</h3><p style="margin-top:8px">Hover: lift, gold edge glow and a sky sheen sweep.</p></div>
<div class="glass glass--strong glass--lift" style="padding:28px"><p class="kicker">Glass strong</p><h3>Strong pane</h3><p style="margin-top:8px">A darker fill for busy backdrops.</p></div>
<div class="rcard glass"><span class="rcard__stars">${icon('star')}${icon('star')}${icon('star')}${icon('star')}${icon('star')}</span><p class="rcard__quote">Sample review text for the component gallery.</p><p class="rcard__name">Sample name</p><p class="rcard__platform">${icon('google')}Platform</p></div>
</div>
</div>
</section>

<section class="band band--linen">
<div class="wrap">
<p class="kicker">Service cards</p>
<h2 class="display">Delivery and <em>pickup</em></h2>
<div class="glass--cream" style="margin-top:28px"></div>
</div>
<div class="wrap" style="margin-top:28px">${serviceCards(ctx)}</div>
</section>

<section class="band band--sun" data-sunburst>
<div class="wrap">
<p class="kicker">Category tiles</p>
<h2 class="display">Shop by <em>category</em></h2>
<div class="swipe-row" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:36px 28px;margin-top:36px">${tiles}</div>
</div>
</section>

<section class="band band--cream">
<div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start">
<figure class="arch arch--rainbow" style="max-width:340px;margin-top:40px"><span class="arch__img">${gimg('g-hf-mirror', { alt: '', sizes: '340px' })}</span></figure>
<div class="deco-frame" style="padding:28px"><p class="kicker">Deco frame</p><h3>Stepped corners</h3><p style="margin-top:8px">For featured frames on either ground.</p><hr class="chevron-rule" style="margin-top:22px"></div>
<figure class="arch arch--wide" style="max-width:420px"><span class="arch__img">${gimg('g-linen', { alt: '', sizes: '420px' })}</span></figure>
</div>
</section>

<section class="band band--night">
<div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px">
<a class="ecard" href="#"><span class="ecard__media">${gimg('g-sunburst-wall', { alt: '', sizes: '400px' })}</span><span class="ecard__date"><b>12</b>Nov</span><span class="ecard__body"><span class="ecard__meta">Event</span><span class="ecard__title">Event card title</span></span></a>
<a class="acard" href="#"><span class="acard__media">${gimg('g-guide', { alt: '', sizes: '400px' })}</span><span class="acard__body"><span class="acard__meta">Article</span><span class="acard__title">Article card title</span><span class="acard__more link-arrow">Read more${icon('arrow')}</span></span></a>
<div class="glass" style="padding:26px"><p class="kicker">Hours</p><h3 style="margin-bottom:10px">Store Hours</h3>${hoursHtml(ctx)}<h3 style="margin:18px 0 10px">Delivery Hours</h3>${deliveryHoursHtml(ctx)}</div>
</div>
</section>

<section class="band band--linen">
<div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:48px;align-items:start">
<div><p class="kicker">FAQ</p><h2 class="display" style="margin-bottom:18px">Questions</h2>
<div class="faq"><details open><summary>An open question</summary><div class="faq__a"><p>The answer sits here in the body face.</p></div></details><details><summary>A closed question</summary><div class="faq__a"><p>Another answer.</p></div></details></div></div>
<div data-tabs><p class="kicker">Tabs</p><div role="tablist" aria-label="Sample tabs"><button role="tab" id="t1" aria-controls="p1" aria-selected="true">First</button><button role="tab" id="t2" aria-controls="p2" aria-selected="false">Second</button><button role="tab" id="t3" aria-controls="p3" aria-selected="false">Third</button></div>
<div role="tabpanel" id="p1" aria-labelledby="t1"><p>First panel.</p></div><div role="tabpanel" id="p2" aria-labelledby="t2" hidden><p>Second panel.</p></div><div role="tabpanel" id="p3" aria-labelledby="t3" hidden><p>Third panel.</p></div></div>
</div>
</section>

<section class="band band--plum">
<div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px">
<div><p class="kicker">Demo form</p>${demoForm({ fields: ['Full Name', 'Email'], button: 'Send' })}</div>
<div data-filter-scope><p class="kicker">Filter chips</p><div class="btn-row" data-filter-group><button class="chip" data-filter="all">All</button><button class="chip" data-filter="a">A</button><button class="chip" data-filter="b">B</button></div>
<ul style="margin-top:16px;display:grid;gap:8px"><li data-filter-item data-tags="a">Item tagged A</li><li data-filter-item data-tags="b">Item tagged B</li><li data-filter-item data-tags="a b">Item tagged A and B</li></ul></div>
<div data-rotator="4000" data-rotator-label="sample"><p class="kicker">Rotator</p><div><div data-slide class="glass" style="padding:24px"><h3>Slide one</h3></div><div data-slide class="glass" style="padding:24px"><h3>Slide two</h3></div><div data-slide class="glass" style="padding:24px"><h3>Slide three</h3></div></div></div>
</div>
<div data-marquee style="margin-top:40px;--marquee-gap:28px"><span class="chip chip--sun">Marquee</span><span class="chip">Flower</span><span class="chip">Pre-Rolls</span><span class="chip chip--sky">Vapes</span><span class="chip">Edibles</span><span class="chip">Tinctures</span></div>
</section>`;
}

function inner(ctx) {
  return `${hero(ctx, { kicker: 'Sample inner page', title: 'An inner page <em>hero</em>', lede: 'Night ground, turning sunburst rays, and an arch window that overhangs into the next band.', crumbs: [['/', 'Home'], ['/_demo/', 'Components'], ['/_demo/inner/', 'Inner page']] })}
<section class="band band--cream">
<div class="wrap" style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr);gap:56px;align-items:center">
<div class="prose"><h2>A text column</h2><p>Alternating content sections put a text column beside an arch image or a glass card, with the sides alternating.</p><ul><li>Diamond bullets, never dashes</li><li>Montserrat body at 16px</li></ul></div>
<figure class="arch" data-reveal><span class="arch__img">${gimg('g-hf-mirror', { alt: '', sizes: '420px' })}</span></figure>
</div>
</section>
<section class="band band--night">
<div class="wrap" style="display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:56px;align-items:center">
<div class="glass" style="padding:32px" data-reveal><p class="kicker">Glass card</p><h3>On the night ground</h3><p style="margin-top:10px">The night band alternates with the day band, with restraint.</p></div>
<div class="prose"><h2>The second row</h2><p>Sides alternate, grounds alternate.</p></div>
</div>
</section>`;
}

export async function render(ctx) {
  return [
    { path: '/_demo/', html: page({ ctx, path: '/_demo/', title: 'Components | LADY L CANNABIS', description: 'Component gallery (lane-private).', heroCrumbs: true, main: gallery(ctx) }) },
    { path: '/_demo/inner/', html: page({ ctx, path: '/_demo/inner/', title: 'Inner page | LADY L CANNABIS', description: 'Sample inner page (lane-private).', heroCrumbs: true, main: inner(ctx) }) },
  ];
}
