import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Everydays",
  description: "A series of daily design concepts that explore ways blockchain can be more useful, usable and delightful.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* DNS prefetch for faster connections */}
        <link rel="dns-prefetch" href="https://lykbbceawbrmtursljvk.supabase.co" />
        <link rel="preconnect" href="https://lykbbceawbrmtursljvk.supabase.co" crossOrigin="anonymous" />
        
        {/* Preload critical resources for instant loading */}
        <link rel="preload" href="/atlas-0.webp" as="image" type="image/webp" />
        <link rel="preload" href="/atlas.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/data/items.json" as="fetch" crossOrigin="anonymous" />
        
        {/* Prefetch secondary resources */}
        <link rel="prefetch" href="/atlas-1.webp" as="image" type="image/webp" />
        <link rel="prefetch" href="/atlas-2.webp" as="image" type="image/webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
