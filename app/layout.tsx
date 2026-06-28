import type { Metadata } from 'next'
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider, ThemeScript } from '@/components/theme/theme-provider'
import { BRAND_NAME } from '@/lib/brand'

const display = Instrument_Serif({
  variable: '--font-instrument',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
})
const sans = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  display: 'swap',
})
const mono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: `${BRAND_NAME} — your wedding, beautifully in hand`,
  description:
    'One calm command centre for a multi-event wedding: website, guest list, RSVPs, vendors and budget — connected.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
