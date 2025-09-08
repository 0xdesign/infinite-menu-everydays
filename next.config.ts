import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    formats: ['image/webp'],
    domains: ['lykbbceawbrmtursljvk.supabase.co'],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize production build
  productionBrowserSourceMaps: false,
  
  // Enable strict mode for better performance
  reactStrictMode: true,
  
  // Configure headers for caching
  async headers() {
    return [
      {
        source: '/:path*.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      {
        source: '/atlas.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
