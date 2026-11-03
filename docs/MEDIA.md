# Generated media

Every file under `assets/generated/` and `assets/media/` is AI-generated mood imagery made for this redesign pitch. None of
it is a photograph of Lady L Cannabis, its store, staff, customers, products or brands, or of any real place. Lady L's
own photos live under `assets/photos/ll/` and are not described here.

All generated files carry an AI label: the IPTC digital source type `trainedAlgorithmicMedia` in an embedded XMP packet
(JPEG and PNG), an XMP chunk (WebP posters) or the container comment and description tags (MP4). The build re-attaches the
same XMP to every WebP variant it encodes, and each `<img>` carries `data-ai="generated"`. Check with
`node tools/ai-label.mjs verify assets/generated assets/media --control`.

## Models and counts

| Model | Use | Shipped |
|---|---|---|
| fal `fal-ai/flux-pro/v1.1-ultra` | backdrops, category tiles, feature image, cut-out sources | 17 stills |
| fal `fal-ai/birefnet/v2` (Matting) | transparent cut-outs from 4 of the stills above | 4 PNG cut-outs |
| Higgsfield `z_image` | two interior stills | 2 stills |
| fal `fal-ai/kling-video/v2.1/pro/image-to-video` | the hero haze loop (first and last frame = the `g-haze` still) | 1 loop, 2 sizes |

Each still has a sidecar `<file>.json` next to it with the model, prompt, seed or job id, request id, size, sha256, any
local edit, and the by-eye review verdict. `src/content/image-plan.json` holds every prompt, alt text and the rejection
history. Rejected attempts are kept out of the published tree.

## Stills (`assets/generated/`)

| Id | Size | Ground | What it shows |
|---|---|---|---|
| `g-hero-parlor` | 2752x1536 | dark | Plum-violet Art Deco lounge at dusk: brass sunburst mirror, lavender armchair, lamp, pampas grass, potted palm, arched window. Left 45% calm. |
| `g-sunburst-wall` | 2752x1536 | light | Pale lavender wall with an Art Deco sunburst relief in gold lines. |
| `g-linen` | 2752x1536 | light | Draped warm cream fabric, plain centre, a leafy branch at the right edge. |
| `g-haze` | 2752x1536 | dark | Dark violet room, golden light rays through an arched window (the loop's key frame). |
| `g-flower` | 2496x1664 | mid | Cured cannabis buds in a fluted copper-gold bowl on lavender velvet. |
| `g-prerolls` | 2496x1664 | dark | Three plain paper pre-rolls on a gold tray with dried flowers. |
| `g-infused` | 2496x1664 | mid | Two kief-dusted paper rolls and a mound of kief on terrazzo. |
| `g-vapes` | 2496x1664 | light | One plain vape cartridge with amber oil on lavender glass. |
| `g-edibles` | 2496x1664 | light | Broken dark chocolate and an amber jar on cream linen. |
| `g-tinctures` | 2496x1664 | light | Two plain amber dropper bottles among leaves and dried flowers. |
| `g-concentrates` | 2496x1664 | mid | Amber rosin on parchment on a small gold tray. |
| `g-accessories` | 2496x1664 | dark | Glass spoon pipe, brass grinders, brass tray with Deco fan motifs. |
| `g-guide` | 1792x2240 | dark | Open notebook with a pressed cannabis leaf, lavender pen and ribbon (generated at 3:4, cropped to 4:5). |
| `g-hf-arch` | 1536x2048 | light | Bohemian arched doorway with hanging plants and a rattan chair. |
| `g-hf-mirror` | 2048x1536 | light | Brass sunburst mirror above a violet velvet bench with pampas grass. |
| `g-leaf-cut` | 2048x2048 | transparent | Cannabis fan leaf with gold veins. |
| `g-pampas-cut` | 1792x2368 | transparent | Pampas grass plume (fringe colour cleaned, stem faded at the bottom). |
| `g-moon-cut` | 2048x2048 | transparent | Ridged brass crescent moon with two tiny stars hanging below. |
| `g-bud-cut` | 2048x2048 | transparent | Single cured cannabis bud. |

## Motion (`assets/media/`)

`hero-haze.mp4` (1920x1074) and `hero-haze-sm.mp4` (720x1080, a 2:3 crop around the window and rays), 5 s, 24 fps,
120 frames, H.264 yuv420p, limited (tv) range, no audio, one keyframe per loop. Posters: `hero-haze.webp|jpg` and
`hero-haze-sm.webp|jpg` (frame 0 of each). Made from the `g-haze` still with first and last frame set to it; the final
frame (a jump back to the key frame) was dropped, the clip retimed to constant motion and folded into a seamless loop
with a 12-frame crossfade (`tools/loop/`). Only haze and light move. Use it muted, looping, `playsinline`,
`aria-hidden`, poster first, with a visible pause toggle, and hidden under `prefers-reduced-motion`.

## Rights note

The outputs are AI-generated. Purely AI-generated images generally receive no copyright protection in the US, so others
could reuse them; whether to keep or replace them is the client's decision.
