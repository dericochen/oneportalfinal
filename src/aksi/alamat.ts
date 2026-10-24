"use server";

import { revalidatePath } from "next/cache";
import { ambilSesi } from "@/lib/auth";
import { kelurahanSah } from "@/lib/data/wilayah";
import { type NilaiAlamat, payloadAlamat, skemaAlamat } from "@/lib/domain/alamat";
import { pesanGalat } from "@/lib/galat";
import { buatKlienServer } from "@/lib/supabase/server";

export type HasilAlamat = { ok: true } | { ok: false; galat: string; kolom?: Partial<Record<keyof NilaiAlamat, string>> };

/** Pengguna mengisi atau memperbarui alamat domisilinya sendiri (fungsi save_my_address). */
export async function simpanAlamatSaya(masukan: NilaiAlamat): Promise<HasilAlamat> {
  const sesi = await ambilSesi();
  if (!sesi) return { ok: false, galat: "Anda perlu masuk terlebih dahulu." };
  const cek = skemaAlamat.safeParse(masukan);
  if (!cek.success) {
    const kolom: Partial<Record<keyof NilaiAlamat, string>> = {};
    for (const i of cek.error.issues) kolom[String(i.path[0]) as keyof NilaiAlamat] ??= i.message;
    return { ok: false, galat: cek.error.issues[0]?.message ?? "Alamat domisili belum lengkap.", kolom };
  }
  if (!(await kelurahanSah(cek.data.kecamatan, cek.data.kelurahan))) {
    const pesan = "Pilih kelurahan yang berada di kecamatan tersebut.";
    return { ok: false, galat: pesan, kolom: { kelurahan: pesan } };
  }
  const supabase = await buatKlienServer();
  const { error } = await supabase.rpc("save_my_address", { p_payload: payloadAlamat(cek.data) });
  if (error) return { ok: false, galat: pesanGalat(error) };
  revalidatePath("/akun");
  return { ok: true };
}
