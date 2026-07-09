import {
  Cormorant_Garamond, Jost, Fraunces, Inter,
  Marcellus, Playfair_Display, DM_Serif_Display, Italiana, Libre_Bodoni, Spectral,
  Cinzel, Prata, Great_Vibes, Lora, Poppins,
} from 'next/font/google'

// Shared template font pool — used by the public site layout AND the editor
// canvas so previews are true WYSIWYG. Each template's vars pick a display
// face; couples can also mix any display + body face in the Style panel.
// All latin-subset, display: swap loads.
const cormorant = Cormorant_Garamond({
  variable: '--f-cormorant', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap',
})
const jost = Jost({ variable: '--f-jost', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const fraunces = Fraunces({ variable: '--f-fraunces', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const inter = Inter({ variable: '--f-inter', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

// Overhaul templates 4a–4j display faces.
const marcellus = Marcellus({ variable: '--f-marcellus', subsets: ['latin'], weight: ['400'], display: 'swap' })
const playfair = Playfair_Display({ variable: '--f-playfair', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const dmserif = DM_Serif_Display({ variable: '--f-dmserif', subsets: ['latin'], weight: ['400'], display: 'swap' })
const italiana = Italiana({ variable: '--f-italiana', subsets: ['latin'], weight: ['400'], display: 'swap' })
const librebodoni = Libre_Bodoni({ variable: '--f-librebodoni', subsets: ['latin'], weight: ['400', '500'], display: 'swap' })
const spectral = Spectral({ variable: '--f-spectral', subsets: ['latin'], weight: ['300', '400'], display: 'swap' })

// D2/D3 additions: a roman-caps face, a Didone, a wedding script and two
// versatile body faces, so the Style panel offers real typographic range.
const cinzel = Cinzel({ variable: '--f-cinzel', subsets: ['latin'], weight: ['400', '500'], display: 'swap' })
const prata = Prata({ variable: '--f-prata', subsets: ['latin'], weight: ['400'], display: 'swap' })
const greatvibes = Great_Vibes({ variable: '--f-greatvibes', subsets: ['latin'], weight: ['400'], display: 'swap' })
const lora = Lora({ variable: '--f-lora', subsets: ['latin'], weight: ['400', '500'], display: 'swap' })
const poppins = Poppins({ variable: '--f-poppins', subsets: ['latin'], weight: ['400', '500'], display: 'swap' })

export const templateFontClasses =
  `${cormorant.variable} ${jost.variable} ${fraunces.variable} ${inter.variable} ` +
  `${marcellus.variable} ${playfair.variable} ${dmserif.variable} ${italiana.variable} ` +
  `${librebodoni.variable} ${spectral.variable} ` +
  `${cinzel.variable} ${prata.variable} ${greatvibes.variable} ${lora.variable} ${poppins.variable}`

/** Display faces a couple can pick in the Style panel (label → CSS var). */
export const DISPLAY_FACES = {
  cormorant: { label: 'Cormorant — classic serif', css: 'var(--f-cormorant)' },
  fraunces: { label: 'Fraunces — soft serif', css: 'var(--f-fraunces)' },
  playfair: { label: 'Playfair — romantic serif', css: 'var(--f-playfair)' },
  marcellus: { label: 'Marcellus — engraved', css: 'var(--f-marcellus)' },
  dmserif: { label: 'DM Serif — bold editorial', css: 'var(--f-dmserif)' },
  italiana: { label: 'Italiana — high fashion', css: 'var(--f-italiana)' },
  librebodoni: { label: 'Libre Bodoni — didone', css: 'var(--f-librebodoni)' },
  spectral: { label: 'Spectral — literary', css: 'var(--f-spectral)' },
  cinzel: { label: 'Cinzel — roman caps', css: 'var(--f-cinzel)' },
  prata: { label: 'Prata — jewellery serif', css: 'var(--f-prata)' },
  greatvibes: { label: 'Great Vibes — script', css: 'var(--f-greatvibes)' },
  lora: { label: 'Lora — warm serif', css: 'var(--f-lora)' },
} as const

/** Body faces a couple can pick in the Style panel. */
export const BODY_FACES = {
  jost: { label: 'Jost — geometric', css: 'var(--f-jost)' },
  inter: { label: 'Inter — neutral', css: 'var(--f-inter)' },
  lora: { label: 'Lora — serif body', css: 'var(--f-lora)' },
  poppins: { label: 'Poppins — rounded', css: 'var(--f-poppins)' },
  spectral: { label: 'Spectral — literary', css: 'var(--f-spectral)' },
} as const
