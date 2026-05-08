import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Providers } from '@/components/providers'

const geist = Geist({ 
  subsets: ["latin"],
  variable: "--font-sans"
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: 'ExoQuest | Community Quest for K Dwarfs and Exoplanets',
  description: 'Join the community quest to discover K-Dwarf stars and exoplanet candidates. Scout the cosmos using real Gaia DR3 data and help find Earth 2.0.',
  keywords: ['astronomy', 'exoplanets', 'K dwarfs', 'citizen science', 'Gaia DR3', 'space exploration', 'Earth 2.0'],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0E14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#0B0E14]">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </Providers>
      </body>
    </html>
  )
}
