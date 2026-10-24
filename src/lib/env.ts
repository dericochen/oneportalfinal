/**
 * Variabel lingkungan publik. Kunci publishable/anon aman di klien karena
 * semua akses data dijaga RLS. Service role key TIDAK pernah dibaca di sini
 * (lihat src/lib/supabase/admin.ts yang server-only).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const URL_SITUS = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** False bila .env.local belum diisi (mis. saat build pertama). */
export const supabaseTerkonfigurasi = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
