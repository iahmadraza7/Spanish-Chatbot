/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 14
  experimental: {
    serverComponentsExternalPackages: ["sql.js", "pdf-parse", "mammoth"]
  }
};

export default nextConfig;

