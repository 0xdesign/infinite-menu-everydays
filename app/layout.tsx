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
  title: "Infinite Menu - NFT Explorer",
  description: "Interactive 3D spherical menu for exploring NFT collections",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Start critical connections and downloads earlier for faster first paint */}
        <link
          rel="preconnect"
          href="https://lykbbceawbrmtursljvk.supabase.co"
          crossOrigin="anonymous"
        />
        <link rel="preload" href="/atlas-0.jpg" as="image" />
        <link
          rel="preload"
          href="/atlas.json"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
