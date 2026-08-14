# جواهری علیپور — Alipour Jewelry

Redesign of [alipourjewelry.com](https://alipourjewelry.com) — a Persian RTL luxury
jewellery site. «لوحه» — a deep-green board with one printed plate on it, and the serpent
living inside that plate.

**Live:** https://ilyatabrizi.github.io/alipour-jewelry/

## What's here

| | |
|---|---|
| `index.html` | Homepage — hero, the serpent 3D scroll, collections, catalogue, heritage, contact |
| `products.html` | Full gallery, filterable by category |
| `css/app.css` | Design system — deep green (#0e2d1a), RTL-first |
| `js/jewel.js` | The 3D engine — canvas frame-scrub, drag-to-spin |
| `js/app.js` | Nav, reveals, catalogue rendering, filters |
| `assets/frames/` | 120 desktop + 60 mobile frames of the Bvlgari serpent bracelet (code 58591) |
| `data/catalog.json` | 172 products scraped from the live store |


## The hero

The page opens on the piece. A 360° orbit of the snake bracelet was generated from
the client's own three product photographs (Higgsfield, Seedance 2.0, 1080p),
extracted to a frame sequence and scrubbed against scroll position on a `<canvas>`.
Drag it and it spins by hand, with momentum, then eases back to the scroll pose.

**The frames are alpha-keyed**, so the jewel floats directly on the green rather than
sitting in a black box. The render's background is pure black, so each frame is
labelled into connected dark regions: a region is background if it touches the frame
edge (the studio sweep) or is larger than an enamel scale (the ring's interior, the
gap under the head). Everything smaller stays opaque — which is what keeps the black
enamel reading as black instead of being punched through. Morphological opening was
tried first and left hard-edged patches behind the head; connected components fixed it.

Desktop loads 120 frames at 820px (~5.2 MB); phones get 60 at 500px (~1.5 MB).
Every 8th frame loads first so the hero is interactive almost immediately.

## Product tiles

The catalogue is photographed on a white sweep and **cannot be keyed safely** — too
much white gold and diamond against white; the matte eats the product. So tiles are
an honest bone-coloured vitrine panel with the caption on green beneath. Green
dominates through the space around the tiles, not by muddying the pieces.

## Typography

IRANYekanX, supplied as a variable font (`wght` 100–1000) at ~92 KB for the whole
family. **IRANYekanXFaNum** is the body face — Latin digit keystrokes render as
Persian numerals automatically, so `1,630,390,000` sets as ۱٬۶۳۰٬۳۹۰٬۰۰۰ with no
JS conversion. `IRANYekanX` (Latin figures) is scoped to `.lat` for product codes
and the wordmark.

## Local

```bash
python3 -m http.server 8061
```

Static — no build step, no dependencies.
