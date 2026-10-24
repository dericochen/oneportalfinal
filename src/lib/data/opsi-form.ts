import "server-only";
import type { OpsiKategori, OpsiWilayah } from "@/components/laporan/form-laporan";
import { buatKlienServer } from "@/lib/supabase/server";

/** Data pilihan form laporan: kategori aktif + wilayah dengan titik pusat. */
export async function ambilOpsiForm(): Promise<{ kategori: OpsiKategori[]; wilayah: OpsiWilayah[] } | null> {
  const supabase = await buatKlienServer();
  const [k, w] = await Promise.all([
    supabase.from("report_categories").select("id, slug, name, description").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    supabase.rpc("daftar_wilayah"),
  ]);
  if (k.error || w.error) return null;
  return {
    kategori: (k.data ?? []).map((x) => ({ id: x.id, slug: x.slug, nama: x.name, keterangan: x.description })),
    wilayah: (w.data ?? []) as OpsiWilayah[],
  };
}
