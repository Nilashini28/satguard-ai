import type { Metadata } from 'next';
import { Space_Mono, Orbitron } from 'next/font/google';
import './globals.css';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
});

const orbitron = Orbitron({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'SATGUARD AI — Satellite Telemetry Monitoring',
  description: 'Real-time satellite telemetry monitoring with AI anomaly detection, predictive forecasting, and mission control.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceMono.variable} ${orbitron.variable} bg-[#020817] text-[#e2e8f0] font-mono`}>
        {children}
      </body>
    </html>
  );
}