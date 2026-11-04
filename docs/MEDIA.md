# Generated media

Every file under `assets/generated/` and `assets/media/` is AI-generated imagery made for this redesign pitch. One of them
is drawn from a real photo: the home hero caricature (`g-hero-caricature` and its `hero-caricature` loop), which
Higgsfield made from Lady L's own campaign photo IMG_4196 and which shows the person in it. Lady L and that person should
approve it before any public use. None of the others is a photograph or likeness of Lady L Cannabis, its store, staff,
customers, products or brands, or of any real place. Lady L's own photos live under `assets/photos/ll/` and are not
described here.

All generated files carry an AI label: the IPTC digital source type `trainedAlgorithmicMedia` in an embedded XMP packet
(JPEG and PNG), an XMP chunk (WebP posters) or the container comment and description tags (MP4). The build re-attaches the
same XMP to every WebP variant it encodes, and each `<img>` carries `data-ai="generated"`. Check with
`node tools/ai-label.mjs verify assets/generated assets/media --control`.

## Revision 1: "Paste Up Pop"

For the mixed media, pop art and bento box restyle, twelve stills were regenerated in place (same ids, file names and
aspect ratios, so no template changed): the eight category tiles, the home hero still, the guide flat lay, the paper
collage texture (`g-sunburst-wall`) and `g-haze`. They trade the old violet velvet, brass and Art Deco parlor for pop art
product photography and cut paper: flat seamless paper grounds in the brand colours, hard flash light, crisp shadows, and
torn or cut paper shapes. The four cut-outs and the two Higgsfield stills are kept from the first version (the two
Higgsfield stills are printed as lavender monotone by CSS). No page uses `g-sunburst-wall` or `g-linen` any more, so
both are retired and not shipped.

## Revision 1b: the caricature hero

At the pitch author's request, the home hero background is a caricature of Lady L's own campaign photo IMG_4196 (a woman
looking back over her shoulder with the Lady L tote, outside the store). Higgsfield (`seedream_5_0_flash`, 2k, with the
photo as the image reference) redrew it as a flattering pop art comic illustration, with the woman in the right third
and a calm paper wall on the left for the copy. A first prompt that named the plant printed on the tote was stopped by
the provider's safety filter; the second, describing it as a potted green plant, went through. The motion loop was
rendered from that Higgsfield still with fal Kling 2.1 Pro image-to-video, because the Higgsfield account could not run
a video model. The `hero-haze` ribbon loop from earlier in revision 1 is retired.

## Models and counts

| Model | Use | Shipped |
|---|---|---|
| fal `fal-ai/flux-pro/v1.1-ultra` | backdrops, category tiles, feature image, cut-out sources | 15 stills |
| fal `fal-ai/birefnet/v2` (Matting) | transparent cut-outs from 4 of the stills above | 4 PNG cut-outs |
| Higgsfield `z_image` | two interior stills | 2 stills |
| Higgsfield `seedream_5_0_flash` (image reference) | the home hero caricature, from Lady L's photo IMG_4196 | 1 still |
| fal `fal-ai/kling-video/v2.1/pro/image-to-video` | the hero caricature loop (made from the Higgsfield still) | 1 loop, 2 sizes |

Each still has a sidecar `<file>.json` next to it with the model, prompt, seed or job id, request id, size, sha256, any
local edit, and the by-eye review verdict. `src/content/image-plan.json` holds every prompt, alt text and the rejection
history. Rejected attempts are kept out of the published tree.

## Stills (`assets/generated/`)

| Id | Size | Ground | What it shows |
|---|---|---|---|
| `g-hero-caricature` | 2816x1584 | light | Revision 1b. Higgsfield pop art comic caricature of Lady L's campaign photo IMG_4196: a woman with long curly hair looking back over her shoulder, carrying the cream Lady L tote, outside a pink brick building above a purple storefront ledge. Left half calm paper. |
| `g-hero-parlor` | 2752x1536 | light | Revision 1. Pop art collage from above: cured cannabis buds on cut and torn paper shapes (pale blue, coral, yellow, pink) with two paper rolls, on plain lilac paper. Left 45% calm. |
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

`hero-caricature.mp4` (1920x1080) and `hero-caricature-sm.mp4` (720x1080, a 2:3 crop around her), 4.5 s, 24 fps,
109 frames, H.264 yuv420p, limited (tv) range, no audio, one keyframe per loop. Posters: `hero-caricature.webp|jpg` and
`hero-caricature-sm.webp|jpg` (frame 0 of each). Made from the Higgsfield `g-hero-caricature` still with first and last
frame set to it; the duplicated first frame was dropped and the seam folded into a seamless loop with a 12 frame
crossfade (`tools/loop/fold.py`, no retime, so the blink keeps its natural timing). Her hair, a slow blink and a slight
head turn move; nothing is added. Use it muted, looping, `playsinline`, `aria-hidden`, poster first, with a visible pause
toggle, and hidden under `prefers-reduced-motion` (the still shows instead).

## Rights note

The outputs are AI-generated. Purely AI-generated images generally receive no copyright protection in the US, so others
could reuse them; whether to keep or replace them is the client's decision.
