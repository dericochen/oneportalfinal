import type { NextConfig } from "next";

// Host Supabase Storage untuk next/image (signed URL & bucket publik).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera & lokasi dipakai form lapor; mikrofon tidak.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Cache Components dimatikan: hampir semua halaman bergantung pada sesi
  // (cookie) dan data yang selalu segar. Caching diatur per kasus.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    // Mengaktifkan forbidden() untuk halaman 403.
    authInterrupts: true,
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    // Ada package-lock.json lain di direktori home; tetapkan akar proyek ini.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
