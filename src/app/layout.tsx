import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SATGUARD AI",
  description: "Real-time satellite telemetry monitoring with AI anomaly detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased text-gray-100 bg-background min-h-screen">
        {children}
      </body>
    </html>
  );
}