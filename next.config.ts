import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Comprobantes por Server Action (multipart): el default de Next es 1 MB y devuelve error no-RSC → toast genérico en el cliente.
  // 4 MB encaja con el tope ~4.5 MB de Vercel para el body de la función.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
};

export default nextConfig;
