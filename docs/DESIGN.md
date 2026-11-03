# Lavender Parlor: the Lady L design system

Lady L Cannabis is a woman-owned, adult-use dispensary on West Side Avenue in Jersey City, with in-store pickup and
delivery. The site is styled as a parlor: glassmorphism, bohemian warmth and Art Deco order, kept clean and modern, with
real depth. Every colour, size and duration lives in `src/styles/tokens.css`; this note explains how they are used.

## Three planes

1. **The parlor (back plane).** Two grounds alternate. Night grounds (deep aubergine violet) carry heroes, feature
   bands and the footer. Day grounds (warm cream and linen) carry long text and grids. Art Deco ornament is used with
   restraint: fine gold rules, sunburst rays behind heroes and call-to-action bands, a chevron band along hero edges, a
   fan or sunrise motif, stepped corner brackets on featured frames. Bohemian warmth comes from rainbow arches (coral,
   sunflower, lavender, sky), fine-line botanical drawings with a moon and stars, a macrame fringe edge, and grain. No
   busy pattern ever sits under body text.
2. **The glass (mid plane).** Frosted panes float over photos, the hero loop and sunburst grounds: a translucent violet
   fill, a hairline border, a gold hairline along the top edge and a soft sky sheen. On hover a pane lifts, its gold
   edge runs the full width and glows, and a band of sky light sweeps across it. Cream glass is used on day grounds.
   Glass appears only where something varied sits behind it. On phones the big panes turn opaque; live blur stays on
   the header, the drawer and dialogs.
3. **The boho objects (front plane).** Arch-topped photo windows with an offset gold double outline, rainbow arches and
   botanical cut-outs break out of their frames and cross section seams. Each band keeps its backdrop layers in an
   inner clipping layer, so the band itself can let an object overhang into the next band. At most one or two
   protrusions per screen.

## Palette

| Role | Token | Use |
|---|---|---|
| Lavender (brand) | `--lavender` | brand accents, headings at large sizes on cream |
| Sunflower (brand) | `--sun` | primary buttons, Deco gold lines, focus ring on night |
| Coral (brand) | `--coral` | the italic accent word on night, warm glows, the rainbow |
| Sky (brand) | `--sky` | glass sheen, chips, links on night |
| Night grounds | `--night-0` to `--night-3` | heroes, feature bands, footer, header frost |
| Day grounds | `--cream`, `--linen`, `--sand` | long text, grids, the areas band |
| Text | `--text-on-night`, `--text-on-cream` and their secondary tones | body copy at 4.5:1 or better |

Gold on cream is decoration only (`--sun-deep`); text on cream uses the deep lavender tones.

## Type

- **Bodoni Moda** for headings: large, tight leading, slight negative tracking. One word per heading may be set in
  italic as an accent (coral on night, lavender on cream).
- **Josefin Sans** caps for the Deco voice: kickers, navigation, buttons, numerals, breadcrumbs. Kickers carry a small
  four-point star before them, never a dash. Breadcrumbs are separated by a slash.
- **Montserrat** for body text at 16px with generous leading. No visible text is smaller than 13px.

## Ornaments (`assets/brand/`)

- `grain.svg`: a noise tile, laid over grounds at low strength.
- `chevron.svg`: a fine gold chevron band, tileable horizontally, used as a mask so it can take any colour.
- `fan.svg`: the Deco fan or sunrise, used in placeholders, the age gate, the newsletter band and the loyalty card.
- `corner.svg` and `corner-deep.svg`: stepped corner brackets as a nine-slice border image (`.deco-frame`).
- `frame.svg` and `frame-deep.svg`: a full stepped outline as a nine-slice border image (`.btn--deco`, `.numeral`, event
  dates).
- `fringe.svg`: a macrame fringe edge, tileable horizontally, used as a mask in the colour of the band it hangs from.
- `botanical.svg`: a fine-line leaf sprig with a crescent moon and stars.
- `star.svg`: the kicker glyph.

## Motion

- **Reveal.** Content fades up with a slight un-blur as it enters the viewport, staggered. It is a one-shot animation
  that leaves nothing applied when it ends, so glass inside keeps its blur and hover effects keep working. Everything
  is visible after 2.5 seconds, and nothing is hidden without JavaScript.
- **Depth.** Marked objects drift slower or faster than the page while scrolling.
- **Tilt and light.** Cards can tilt toward the pointer, and a warm light can follow the cursor, on fine pointers only.
- **Sunburst.** Rays turn slowly while they are on screen; the turn is exactly one ray period, so it loops seamlessly.
- **Wordmark.** The footer carries a giant LADY L in gold between two rows of marquee bulbs. A bright band crosses the
  word every 2.4 seconds at constant speed in a seamless loop, with a soft glow; it pauses off screen.
- **Hover.** Glass lifts with a gold edge glow and a sky sheen sweep; arch photos zoom slowly; buttons get a gold shine
  sweep; links get an underline drawn from the left; category tiles lift their image out of the arch.
- All motion stops under the reduced motion setting. Video loops play only while on screen and always have a visible
  pause control.

## Components

The shared classes are listed in the build contract and live in `src/styles/components.css`. The main families:

- Grounds: `.band` with `--night`, `--plum`, `--cream`, `--linen` and `--sun` (sunburst night), plus `.band__clip`,
  `.band__bg`, `.grain`, `.fringe-edge`, `.chevron-rule`.
- Glass: `.glass`, `.glass--cream`, `.glass--strong`, `.glass--lift`.
- Actions: `.btn` with `--sun` (primary), `--glass`, `--ghost`, `--deco` (stepped outline) and `--sm`; `.btn-row`;
  `.link-arrow`.
- Type: `.kicker`, `.display`, `.display--mega`, `.lede`, `.prose`.
- Objects: `.arch` (with `.arch__img`, `--wide`, `--rainbow`), `.rainbow`, `.deco-frame`, `.cut`, `.protrude`,
  `.img-slot` (a lavender placeholder with a fine frame and the fan), `.numeral`.
- Cards: `.tile` (category arch tile), `.ecard` (event), `.acard` (article), `.rcard` (review), `.svc` (the Delivery
  and Pickup service cards), `.chip`.
- Page parts: `.page-hero` (night ground, rays, an arch that overhangs the next band), `.crumbs`, `.faq`, `.hours`,
  `.demo-form`, and the prefooter bands `.areas` and `.newsletter`.

## The chrome

A top link bar puts the two services first: Order for Delivery and Order for Pickup, each with a short fact line and
an info link to its page, then the quick links. The main bar holds the logo, the navigation with image-card dropdown
panels (category arches, a store card, a guide card, the neighborhoods and a delivery facts card), and the Order Now
button. Below 1024px the navigation moves into a drawer. Every page ends with the areas band, the newsletter band and
the footer: the store block with both store and delivery hours, link columns, socials, the loyalty card, the 21+
note, the legal row and the wordmark. A Yes or No age question opens in an arch-shaped glass dialog on the first
visit.
