# جواهری علیپور — Alipour Jewelry

Redesign of [alipourjewelry.com](https://alipourjewelry.com) — a Persian RTL luxury
jewellery site built around a scroll-driven 3D product sequence.

**Live:** https://ilyatabrizi.github.io/alipour-jewelry/

## What's here

| | |
|---|---|
| `index.html` | Homepage — hero, the serpent 3D scroll, collections, catalogue, heritage, contact |
| `products.html` | Full gallery, filterable by category |
| `css/app.css` | Design system — «شب و زر» (night & gold), RTL-first |
| `js/serpent.js` | The 3D scroll engine — canvas frame-scrub, drag-to-spin, feature tracking |
| `js/app.js` | Nav, reveals, catalogue rendering, filters |
| `assets/frames/` | 120 desktop + 60 mobile frames of the Bvlgari serpent bracelet (code 58591) |
| `data/catalog.json` | 172 products scraped from the live store |
| `data/anchors.json` | Per-frame emerald / body coordinates driving the tracking labels |

## The serpent scroll

The centrepiece. A 360° orbit of the snake bracelet was generated from the client's
own three product photographs (Higgsfield, Seedance 2.0, 1080p), extracted to a
frame sequence and scrubbed against scroll position on a `<canvas>` — the Apple
product-page technique, with three additions:

1. **Drag to spin.** Grab the jewel and rotate it by hand; momentum carries, then
   it eases back to the scroll-truth pose.
2. **Tracking annotations.** Every frame was analysed for the emerald eye and body
   positions, so the Persian callout labels follow the real features as the piece
   turns rather than sitting at fixed coordinates.
3. **Progressive load.** Every 8th frame loads first so the section is interactive
   almost immediately, then the gaps fill in.

Desktop loads 120 frames at 880px (~3.9 MB); phones get 60 at 540px (~0.96 MB).

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
