import {
  Cormorant_Garamond, Jost, Fraunces, Inter,
  Marcellus, Playfair_Display, DM_Serif_Display, Italiana, Libre_Bodoni, Spectral,
} from 'next/font/google'

// Shared template font pool — used by the public site layout AND the editor
// canvas so previews are true WYSIWYG. Each template's vars pick a display
// face; body face is always Instrument Sans (design overhaul rule).
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

export const templateFontClasses =
  `${cormorant.variable} ${jost.variable} ${fraunces.variable} ${inter.variable} ` +
  `${marcellus.variable} ${playfair.variable} ${dmserif.variable} ${italiana.variable} ` +
  `${librebodoni.variable} ${spectral.variable}`
