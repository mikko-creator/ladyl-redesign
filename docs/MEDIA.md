# Generated media

Every file under `assets/generated/` and `assets/media/` is AI-generated mood imagery made for this redesign pitch. None of
it is a photograph of Lady L Cannabis, its store, staff, customers, products or brands, or of any real place. Lady L's
own photos live under `assets/photos/ll/` and are not described here.

All generated files carry an AI label: the IPTC digital source type `trainedAlgorithmicMedia` in an embedded XMP packet
(JPEG and PNG), an XMP chunk (WebP posters) or the container comment and description tags (MP4). The build re-attaches the
same XMP to every WebP variant it encodes, and each `<img>` carries `data-ai="generated"`. Check with
`node tools/ai-label.mjs verify assets/generated assets/media --control`.

## Revision 1: "Paste Up Pop"

For the mixed media, pop art and bento box restyle, twelve stills were regenerated in place (same ids, file names and
aspect ratios, so no template changed): the eight category tiles, the home hero still, the guide flat lay, the paper
collage texture (`g-sunburst-wall`) and `g-haze`. They trade the old violet velvet, brass and Art Deco parlor for pop art
product photography and cut paper: flat seamless paper grounds in the brand colours, hard flash light, crisp shadows, and
torn or cut paper shapes. The four cut-outs, `g-linen` and the two Higgsfield stills are kept from the first version.

## Models and counts

| Model | Use | Shipped |
|---|---|---|
| fal `fal-ai/flux-pro/v1.1-ultra` | backdrops, category tiles, feature image, cut-out sources | 17 stills |
| fal `fal-ai/birefnet/v2` (Matting) | transparent cut-outs from 4 of the stills above | 4 PNG cut-outs |
| Higgsfield `z_image` | two interior stills | 2 stills |
| fal `fal-ai/kling-video/v2.1/pro/image-to-video` | the hero loop (made from the revision 1 `g-haze` still) | 1 loop, 2 sizes |

Each still has a sidecar `<file>.json` next to it with the model, prompt, seed or job id, request id, size, sha256, any
local edit, and the by-eye review verdict. `src/content/image-plan.json` holds every prompt, alt text and the rejection
history. Rejected attempts are kept out of the published tree.

## Stills (`assets/generated/`)

| Id | Size | Ground | What it shows |
|---|---|---|---|
| `g-hero-parlor` | 2752x1536 | light | Revision 1. Pop art collage from above: cured cannabis buds on cut and torn paper shapes (pale blue, coral, yellow, pink) with two paper rolls, on plain lilac paper. Left 45% calm. |
| `g-sunburst-wall` | 2752x1536 | light | Revision 1. Collage texture of overlapping torn paper scraps in yellow, coral, pink, pale blue and cream, with a strip of kraft tape. |
| `g-linen` | 2752x1536 | light | Draped warm cream fabric, plain centre, a leafy branch at the right edge. |
| `g-haze` | 2752x1536 | light | Revision 1. A glossy ribbon of pale lavender smoke across a flat butter yellow ground; left 40% plain. |
| `g-flower` | 2496x1664 | light | Revision 1. Three cured cannabis buds on a lilac paper circle, sunflower yellow ground. |
| `g-prerolls` | 2496x1664 | light | Revision 1. Three kraft paper cones, two showing ground cannabis, and a yellow paper circle on pale sky blue. |
| `g-infused` | 2496x1664 | light | Revision 1. Two white paper cones filled with ground cannabis and a mound of golden kief on lilac, with a coral paper circle. |
| `g-vapes` | 2496x1664 | light | Revision 1. One plain vape cartridge with amber oil on coral, in front of a pale blue paper disc. |
| `g-edibles` | 2496x1664 | light | Revision 1. Broken dark chocolate, an amber jar with a white lid and a yellow paper triangle on pale sky blue. |
| `g-tinctures` | 2496x1664 | light | Revision 1. Three plain amber dropper bottles and a cannabis leaf on a yellow floor against a lilac wall, with coral and pale blue paper circles. |
| `g-concentrates` | 2496x1664 | light | Revision 1. A pool of amber rosin on a square of parchment, lilac ground. |
| `g-accessories` | 2496x1664 | light | Revision 1. From above on coral: a glass spoon pipe and a yellow rolling tray holding a pale blue herb grinder. |
| `g-guide` | 1792x2240 | light | Revision 1. Open blank sketchbook on coral with a pressed cannabis leaf taped on with yellow tape, torn blue and lavender scraps and a pencil (generated at 3:4, cropped to 4:5). |
| `g-hf-arch` | 1536x2048 | light | Bohemian arched doorway with hanging plants and a rattan chair. |
| `g-hf-mirror` | 2048x1536 | light | Brass sunburst mirror above a violet velvet bench with pampas grass. |
| `g-leaf-cut` | 2048x2048 | transparent | Cannabis fan leaf with gold veins. |
| `g-pampas-cut` | 1792x2368 | transparent | Pampas grass plume (fringe colour cleaned, stem faded at the bottom). |
| `g-moon-cut` | 2048x2048 | transparent | Ridged brass crescent moon with two tiny stars hanging below. |
| `g-bud-cut` | 2048x2048 | transparent | Single cured cannabis bud. |

The category tiles are product mood pictures only: no brand, package or label appears in any of them.

## Motion (`assets/media/`)

`hero-haze.mp4` (1920x1074) and `hero-haze-sm.mp4` (720x1080, a 2:3 crop around the ribbon), 4.5 s, 24 fps,
108 frames, H.264 yuv420p, limited (tv) range, no audio, one keyframe per loop. Posters: `hero-haze.webp|jpg` and
`hero-haze-sm.webp|jpg` (frame 0 of each). Made in revision 1 from the new `g-haze` still (a pale lavender ribbon on a
flat sunflower yellow ground) with first and last frame set to it; the final frame (a jump back to the key frame) was
dropped, the clip retimed to constant motion and folded into a seamless loop with a 12 frame crossfade
(`tools/loop/`). Only the ribbon moves. Use it muted, looping, `playsinline`, `aria-hidden`, poster first, with a
visible pause toggle, and hidden under `prefers-reduced-motion`.

## Rights note

The outputs are AI-generated. Purely AI-generated images generally receive no copyright protection in the US, so others
could reuse them; whether to keep or replace them is the client's decision.
