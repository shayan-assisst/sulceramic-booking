/** @type {import('next').NextConfig} */
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(isDemo
    ? {
        output: "export",
        basePath: "/sulceramic-booking",
        assetPrefix: "/sulceramic-booking",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
