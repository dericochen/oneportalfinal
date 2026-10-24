import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Klien Supabase untuk Server Component, Server Action, dan Route Handler.
 * Bertindak sebagai pengguna yang sedang masuk, jadi RLS selalu berlaku.
 */
export async function buatKlienServer() {
  const toko = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => toko.getAll(),
      setAll: (daftar) => {
        try {
          daftar.forEach(({ name, value, options }) => toko.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component (tidak bisa menulis cookie).
          // Aman diabaikan: proxy.ts memperbarui sesi di setiap permintaan.
        }
      },
    },
  });
}
