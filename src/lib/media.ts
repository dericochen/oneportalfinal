import "server-only";
import { buatKlienAdmin } from "@/lib/supabase/admin";

/**
 * URL bertanda tangan untuk foto di bucket privat "laporan". Dipanggil HANYA
 * untuk path yang sudah lolos aturan tampil: dari fungsi publik database
 * (public_*), atau dari query yang berjalan dengan RLS pengguna. Berlaku 1 jam.
 */
const UMUR_DETIK = 3600;

export async function tandatanganiFoto(paths: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unik = [...new Set(paths.filter((p): p is string => !!p))];
  const hasil = new Map<string, string>();
  if (unik.length === 0) return hasil;
  try {
    const supabase = buatKlienAdmin();
    for (let i = 0; i < unik.length; i += 100) {
      const { data } = await supabase.storage.from("laporan").createSignedUrls(unik.slice(i, i + 100), UMUR_DETIK);
      for (const d of data ?? []) if (d.path && d.signedUrl) hasil.set(d.path, d.signedUrl);
    }
  } catch (e) {
    console.error("gagal menandatangani foto", e);
  }
  return hasil;
}
