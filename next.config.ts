import type { NextConfig } from "next";
import path from "path";

/**
 * Secciones del panel que antes existían duplicadas en la raíz (`/payments`, `/plans/new`, …) y sin
 * control de rol. Esas páginas se eliminaron; estos redirects mantienen vivos los marcadores viejos
 * mandándolos a su equivalente bajo `/dashboard`, que sí tiene guard.
 */
const LEGACY_ROOT_SECTIONS = [
  "calendar",
  "documents",
  "finances",
  "inventory",
  "payments",
  "plans",
  "rules",
  "settings",
  "subscriptions",
  "venues",
];

/**
 * Sub-rutas públicas de tenant (`/[slug]/signin`, `/[slug]/signup`, `/[slug]/manifest`). Se excluyen
 * del redirect para que un club cuyo slug coincida con una sección siga pudiendo iniciar sesión.
 */
const TENANT_SUBPATHS = "(?!(?:signin|signup|manifest)(?:/|$))";

const nextConfig: NextConfig = {
  // Los `source` van anclados al inicio y al final del path: `/payments` no captura
  // `/dashboard/payments`, `/api/payments/...` ni slugs como `/payments-club`.
  async redirects() {
    return LEGACY_ROOT_SECTIONS.flatMap((section) => [
      {
        source: `/${section}`,
        destination: `/dashboard/${section}`,
        permanent: false,
      },
      {
        source: `/${section}/:path(${TENANT_SUBPATHS}.+)`,
        destination: `/dashboard/${section}/:path`,
        permanent: false,
      },
    ]);
  },
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
