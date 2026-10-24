import "server-only";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import type { Peran } from "@/lib/domain/laporan";
import { supabaseTerkonfigurasi } from "@/lib/env";
import { buatKlienServer } from "@/lib/supabase/server";

export type Sesi = {
  id: string;
  email: string;
  namaLengkap: string;
  peran: Peran;
  instansi: { id: string; nama: string; namaSingkat: string } | null;
  akunDemo: boolean;
};

/**
 * Pengguna yang sedang masuk beserta profilnya. Di-cache per permintaan,
 * jadi layout dan halaman bisa memanggilnya berkali-kali tanpa query ganda.
 * Mengembalikan null bila belum masuk atau akun nonaktif.
 */
export const ambilSesi = cache(async (): Promise<Sesi | null> => {
  // Sesi selalu bergantung pada permintaan: jangan pernah di-prerender.
  await connection();
  if (!supabaseTerkonfigurasi) return null;
  const supabase = await buatKlienServer();
  const { data: klaim } = await supabase.auth.getClaims();
  const id = klaim?.claims?.sub;
  if (!id) return null;

  const { data: profil } = await supabase
    .from("profiles")
    .select("full_name, role, is_active, deleted_at, is_demo, agencies:agency_id (id, name, short_name)")
    .eq("id", id)
    .maybeSingle();
  if (!profil || !profil.is_active || profil.deleted_at) return null;

  const instansi = Array.isArray(profil.agencies) ? profil.agencies[0] : profil.agencies;
  return {
    id,
    email: String(klaim.claims.email ?? ""),
    namaLengkap: profil.full_name || "Pengguna",
    peran: profil.role as Peran,
    instansi: instansi ? { id: instansi.id, nama: instansi.name, namaSingkat: instansi.short_name } : null,
    akunDemo: profil.is_demo,
  };
});

/**
 * Lapis 2 penegakan akses. Belum masuk -> /masuk; peran tidak cocok -> 403.
 * Dipanggil di layout tiap area dan di awal setiap Server Action.
 */
export async function wajibPeran(peran: Peran[], lanjut?: string): Promise<Sesi> {
  const sesi = await ambilSesi();
  if (!sesi) redirect(lanjut ? `/masuk?lanjut=${encodeURIComponent(lanjut)}` : "/masuk");
  if (!peran.includes(sesi.peran)) forbidden();
  return sesi;
}

export async function wajibMasuk(lanjut?: string): Promise<Sesi> {
  const sesi = await ambilSesi();
  if (!sesi) redirect(lanjut ? `/masuk?lanjut=${encodeURIComponent(lanjut)}` : "/masuk");
  return sesi;
}
