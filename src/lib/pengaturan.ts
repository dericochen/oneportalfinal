import "server-only";
import { cache } from "react";
import { BAWAAN_PENGATURAN, type KunciPengaturan } from "@/lib/domain/pengaturan";
import { supabaseTerkonfigurasi } from "@/lib/env";
import { buatKlienServer } from "@/lib/supabase/server";

export { DAFTAR_PENGATURAN, type KunciPengaturan } from "@/lib/domain/pengaturan";

/** Pengaturan situs (dikelola admin di /admin/pengaturan). Di-cache per permintaan. */
export const ambilPengaturan = cache(async (): Promise<Record<KunciPengaturan, string>> => {
  const hasil: Record<KunciPengaturan, string> = { ...BAWAAN_PENGATURAN };
  if (!supabaseTerkonfigurasi) return hasil;
  try {
    const supabase = await buatKlienServer();
    const { data } = await supabase.from("site_settings").select("key, value").in("key", Object.keys(BAWAAN_PENGATURAN));
    for (const baris of data ?? []) {
      if (baris.key in hasil && typeof baris.value === "string") hasil[baris.key as KunciPengaturan] = baris.value;
    }
  } catch {
    // Tetap tampil dengan teks bawaan.
  }
  return hasil;
});
