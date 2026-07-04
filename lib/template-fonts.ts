import { Cormorant_Garamond, Jost, Fraunces, Inter } from 'next/font/google'

// Shared template font pool — used by the public site layout AND the editor
// canvas so previews are true WYSIWYG. Each template's vars pick a pair.
const cormorant = Cormorant_Garamond({
  variable: '--f-cormorant', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap',
})
const jost = Jost({ variable: '--f-jost', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const fraunces = Fraunces({ variable: '--f-fraunces', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const inter = Inter({ variable: '--f-inter', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

export const templateFontClasses =
  `${cormorant.variable} ${jost.variable} ${fraunces.variable} ${inter.variable}`
