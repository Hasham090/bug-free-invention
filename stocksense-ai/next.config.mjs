/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
