import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SATGUARD AI — Satellite Telemetry Monitoring',
  description: 'Real-time satellite telemetry monitoring with AI anomaly detection, predictive forecasting, and mission control.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-950`}>{children}</body>
    </html>
  )
}