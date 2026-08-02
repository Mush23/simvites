// Build brand assets from the monogram.
//
// The source "Transparent LOGO SVG.svg" is 99.7% one opaque 4594x2747 PNG of a
// WHITE monogram on BLACK. Its transparency comes from the SVG wrapper: an
// feColorMatrix that maps luminance to alpha, used as a <mask>. Extract the
// raster naively and you get a black rectangle.
//
// So do what the filter does — take luminance as the alpha channel — which also
// makes the mark tintable to any colour instead of stuck as white.
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'brand-assets/monogram-source.png'
const OUT = 'public/brand'

const CORAL = { r: 0xea, g: 0x3e, b: 0x31 }
const WHITE = { r: 0xff, g: 0xff, b: 0xff }
const INK = { r: 0x19, g: 0x19, b: 0x18 }

const meta = await sharp(SRC).metadata()

/** The monogram at `width`, in `colour`, on transparency. */
async function tinted(width, colour) {
  const mask = sharp(SRC).resize({ width, kernel: 'lanczos3' }).greyscale()
  const { data, info } = await mask.raw().toBuffer({ resolveWithObject: true })
  // Luminance IS the alpha: white strokes opaque, black ground transparent.
  return sharp({ create: { width: info.width, height: info.height, channels: 3, background: colour } })
    .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** Monogram centred on a solid square — for icons, which cannot be transparent. */
async function square(size, padRatio, ground = CORAL, ink = WHITE) {
  const inner = Math.round(size * (1 - padRatio * 2))
  const mono = await tinted(inner, ink)
  const m = await sharp(mono).metadata()
  return sharp({ create: { width: size, height: size, channels: 4, background: { ...ground, alpha: 1 } } })
    .composite([{ input: mono, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

console.log(`source ${meta.width}x${meta.height}, alpha=${meta.hasAlpha} (luminance used as alpha)\n`)

const assets = [
  // 180px square is copied to app/apple-icon.png, which Next serves by convention.
  ['icon-180.png', await square(180, 0.13)],
  ['icon-512.png', await square(512, 0.13)],
  ['monogram-white-320.png', await tinted(320, WHITE)],
  ['monogram-coral-320.png', await tinted(320, CORAL)],
  ['monogram-ink-320.png', await tinted(320, INK)],
]
for (const [name, buf] of assets) {
  fs.writeFileSync(`${OUT}/${name}`, buf)
  console.log(`  ${name.padEnd(24)} ${String(buf.length).padStart(6)} bytes`)
}

// Regenerate after changing the source or the brand colour:
//   node scripts/build-brand-assets.mjs
//
// Not wired into the build: the source changes about once a rename, and a
// sharp dependency in the build path buys nothing for an asset that is
// already committed.
