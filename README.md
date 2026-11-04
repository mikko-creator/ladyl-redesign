# Lady L Cannabis: redesign concept "Paste Up Pop"

A static, platform-free redesign concept for [Lady L Cannabis](https://ladyljerseycity.com/), the woman-owned adult-use
dispensary at 547 West Side Avenue in Jersey City, NJ. It is a pitch preview, not the live site.

- **Content:** Lady L's own pages, posts, events, neighborhood pages and town delivery pages, carried word for word
  from the live site (punctuation tidied: no dashes used as dashes). Pages that are new to this structure (product
  categories, in-store pickup, education guides, reviews) use Lady L's own facts plus short neutral glue; every New
  Jersey law statement links its official source.
- **Structure:** a dispensary information architecture with a top link bar, seven-item main navigation with dropdown
  panels, product category hubs, neighborhood and delivery-area hubs, education guides, an areas band and a
  newsletter band above every footer.
- **Delivery and pickup** are first-class: both services sit in the top bar, the hero, the navigation, their own pages
  and the footer, with Lady L's published hours, zones, minimums and fees.
- **Design:** mixed media, pop art and bento box layouts, kept clean and modern: paper grounds, Lady L's lavender,
  sunflower, coral and sky as flat colour tiles, halftone dots, taped photo clippings and cut-out stickers that break
  their frames. See [docs/DESIGN.md](docs/DESIGN.md).
- **Imagery:** Lady L's own photos, plus AI-generated mood imagery and a motion loop, each labelled as AI-generated
  (IPTC digital source type `trainedAlgorithmicMedia`) and listed in [docs/MEDIA.md](docs/MEDIA.md). Generated images
  never show Lady L's store, staff, customers, products or brands.

## Build

Node 18+ with no dependencies; `cwebp` on PATH makes the WebP image variants.

```bash
node src/build.mjs            # writes dist/
node tools/serve.mjs --root dist --port 8080 --not-found 404.html
```

Forms in this preview are not connected to any service. Online ordering links go to Lady L's live menu.
