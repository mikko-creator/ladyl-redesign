# Paste Up Pop: the Lady L design system

Lady L Cannabis is a woman-owned, adult-use dispensary on West Side Avenue in Jersey City, with in-store pickup and
delivery. The site reads like a neighbourhood paste-up wall edited as a modern product page: Mixed Media texture, Pop Art
colour and Bento Box order, bold and electric, warm and funky, never childish. Every colour, size and duration lives in
`src/styles/tokens.css`; this note explains how they are used.

## Three ideas

1. **Bento (layout).** Every collection is a grid of rounded, opaque tiles: cards, facts, services, categories,
   reviews, posts, events, questions, footer blocks. Tiles keep one idea each, share one gap, and vary their spans so
   each grid has a featured tile. A tile is a flat surface (paper, newsprint, sunflower, coral, sky or lavender) with a
   thick ink outline and a hard offset shadow; on dark lavender grounds the shadow turns sunflower.
2. **Pop (colour, type, dots).** Flat brand blocks: lavender, sunflower yellow, coral and sky on warm white paper.
   Ben-Day halftone dots gather in corners and behind featured tiles, always faded and always light behind words.
   Headings are Bricolage Grotesque at its heaviest weight, slightly condensed and tightly set. A heading may carry one
   hand-lettered accent word in Caveat, in coral on paper or sunflower on lavender, with a marker underline. Kickers
   are label-maker tape: ink tape with paper capitals, turned a little.
3. **Mixed media (texture, depth).** Paper grounds carry a fine grain. Photos are clippings with a white paper border,
   an ink outline, a slight turn and a strip of tape. Cut-out product shots are stickers with a white edge that break
   tile and band edges. A torn paper seam joins a band or two per page, and marker doodles appear sparingly.

## Grounds

Pages alternate paper, newsprint, one colour band and brand dark lavender. Light grounds carry ink text; dark lavender
grounds carry paper text. Text never sits directly on a photo: it sits on a tile or a label. Inner pages open with a
bento hero: a lavender title tile beside a photo clipping pasted on a coral tile, over a slowly turning halftone
starburst; the clipping may cross into the next band but never covers its words.

## Components

Buttons are rounded rectangles with an ink outline and a hard shadow: they lift toward the pointer and press flat when
clicked. Chips are outlined pills. Numerals are round sunflower stickers. Questions open in paper tiles with a round
sunflower toggle. Lists use sunflower dots with an ink ring; quotes are taped notes. The header is a paper bar with an
ink edge and image menus; the footer sits on dark lavender with a large sunflower wordmark outlined in ink, crossed by
a quick paper shine.

## Motion

Sections pop into place with a small spring, without blur. Tiles lift with a growing shadow, stickers wiggle, the
halftone starburst turns slowly while on screen, and the wordmark shine loops every 2.4 seconds. Everything stops for
visitors who prefer reduced motion.

## Phones

Grids fold to one or two columns, shadows shrink to 4 pixels, turns are halved, stickers get smaller, every tap target
is at least 44 pixels, and nothing scrolls sideways at 390 or 360 pixels wide.
