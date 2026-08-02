# Brand assets

Generated from `brand-assets/monogram-source.png` by
`node scripts/build-brand-assets.mjs`. Do not hand-edit — regenerate.

| File | Used by |
|---|---|
| `monogram-ink-320.png` | login header, light theme |
| `monogram-white-320.png` | login header, dark theme |
| `monogram-coral-320.png` | spare palette variant, unused today |
| `icon-512.png` | spare, for a PWA manifest or social card |

`app/apple-icon.png` is the 180px square, copied out of this script's output
so Next picks it up by convention.

## Why the 32px favicon is a letter, not this mark

`app/icon.tsx` renders `BRAND_NAME[0]` on coral rather than the monogram. That
is measured, not taste: the mark was rendered at 32, 48 and 64px and inspected
magnified. It is a high-contrast serif, and below roughly **30px of height** its
hairlines and swash break into an unreadable smudge. It is clean by 64px.

Height is the constraint, not width — the mark is 1.67:1, so a 32px square with
padding leaves it only ~16px tall. Anywhere it gets 30px+ of height, use it.

## The source is a raster, not vector

`Transparent LOGO SVG.svg` is 99.7% one opaque 4594×2747 PNG of a white
monogram on black. Its transparency comes from the SVG wrapper — an
`feColorMatrix` mapping luminance to alpha, used as a `<mask>`. The generator
does the same thing, taking luminance as the alpha channel, which is also what
makes the mark tintable to any colour.

If a true vector version ever exists, prefer it: it would scale cleanly, drop
these files to a couple of KB, and could be inlined into `icon.tsx` so even the
favicon could carry the real mark.
