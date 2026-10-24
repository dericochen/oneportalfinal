import "server-only";
import type { OpsiKecamatan } from "@/lib/domain/alamat";
import { buatKlienServer } from "@/lib/supabase/server";

/** Kecamatan + kelurahan aktif Kota Medan (untuk isian alamat domisili). */
export async function ambilWilayah(): Promise<OpsiKecamatan[] | null> {
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("daftar_wilayah");
  if (error) return null;
  return ((data ?? []) as OpsiKecamatan[]).map((w) => ({ kode: w.kode, nama: w.nama, kelurahan: w.kelurahan }));
}

/** Kelurahan aktif dan memang berada di kecamatan itu. */
export async function kelurahanSah(kecamatan: string, kelurahan: string): Promise<boolean> {
  const supabase = await buatKlienServer();
  const { data } = await supabase
    .from("villages")
    .select("code")
    .eq("code", kelurahan)
    .eq("district_code", kecamatan)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}
