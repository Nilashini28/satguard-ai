import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SATGUARD AI",
  description: "Satellite Telemetry Monitoring & AI Anomaly Detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-100">{children}</body>
    </html>
  );
}