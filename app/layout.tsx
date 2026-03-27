import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Michaelson MMA',
  description: 'ניהול אימונים — Michaelson MMA',
  manifest: '/manifest.json',
  themeColor: '#0f0f0f',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body>{children}</body>
    </html>
  )
}
