import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Klien service role: MELEWATI RLS. Hanya untuk kebutuhan server yang sudah
 * diotorisasi di kode (cron tick, admin membuat akun staf). Jangan pernah
 * dipakai untuk membaca data atas nama pengguna. `server-only` membuat build
 * gagal bila berkas ini terimpor ke komponen klien.
 */
export function buatKlienAdmin() {
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !kunci) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur di server.");
  }
  return createClient(SUPABASE_URL, kunci, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
