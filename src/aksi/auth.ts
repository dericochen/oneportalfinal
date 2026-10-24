"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { kelurahanSah } from "@/lib/data/wilayah";
import { bacaAlamat, payloadAlamat, skemaAlamat } from "@/lib/domain/alamat";
import { BERANDA_PERAN, type Peran } from "@/lib/domain/laporan";
import { pesanGalat } from "@/lib/galat";
import { buatKlienServer } from "@/lib/supabase/server";

export type HasilForm = {
  galat?: string;
  kolom?: Partial<Record<string, string>>;
  nilai?: Record<string, string>;
};

/** Hanya izinkan tujuan relatif di situs ini (mencegah open redirect). */
function tujuanAman(lanjut: unknown): string | null {
  if (typeof lanjut !== "string") return null;
  if (!lanjut.startsWith("/") || lanjut.startsWith("//") || lanjut.startsWith("/\\")) return null;
  if (lanjut.startsWith("/masuk") || lanjut.startsWith("/daftar")) return null;
  return lanjut;
}

/** Area yang hanya boleh dibuka peran tertentu (selain itu: halaman umum). */
const AREA_PERAN: Array<[string, Peran]> = [
  ["/admin", "ADMIN"],
  ["/petugas", "OFFICER"],
  ["/supervisor", "SUPERVISOR"],
  ["/akun", "CITIZEN"],
  ["/lapor", "CITIZEN"],
];

/**
 * Halaman tujuan setelah masuk ditentukan oleh PERAN AKUN di database, bukan
 * pilihan pengguna. `lanjut` hanya dipakai bila memang boleh dibuka peran itu.
 */
async function berandaPengguna(id: string, lanjut: string | null): Promise<{ tujuan: string } | { galat: string }> {
  const supabase = await buatKlienServer();
  const { data } = await supabase.from("profiles").select("role, is_active, deleted_at").eq("id", id).maybeSingle();
  if (!data || !data.is_active || data.deleted_at) {
    await supabase.auth.signOut();
    return { galat: "Akun ini sedang dinonaktifkan. Hubungi supervisor untuk mengaktifkannya kembali." };
  }
  const peran = data.role as Peran;
  if (lanjut) {
    const area = AREA_PERAN.find(([awalan]) => lanjut === awalan || lanjut.startsWith(`${awalan}/`) || lanjut.startsWith(`${awalan}?`));
    if (!area || area[1] === peran) return { tujuan: lanjut };
  }
  return { tujuan: BERANDA_PERAN[peran] ?? "/" };
}

const skemaMasuk = z.object({
  email: z.email({ error: "Masukkan email yang valid, contoh: nama@contoh.com." }).max(254),
  kata_sandi: z.string().min(1, { error: "Masukkan kata sandi." }).max(128),
});

export async function masuk(_: HasilForm, data: FormData): Promise<HasilForm> {
  const nilai = { email: String(data.get("email") ?? "").trim() };
  const cek = skemaMasuk.safeParse({ email: nilai.email, kata_sandi: data.get("kata_sandi") });
  if (!cek.success) {
    const kolom: HasilForm["kolom"] = {};
    for (const i of cek.error.issues) kolom[String(i.path[0])] ??= i.message;
    return { kolom, nilai };
  }

  const supabase = await buatKlienServer();
  const { data: hasil, error } = await supabase.auth.signInWithPassword({
    email: cek.data.email,
    password: cek.data.kata_sandi,
  });
  if (error || !hasil.user) {
    return {
      galat: /banned/i.test(error?.message ?? "")
        ? "Akun ini sedang dinonaktifkan. Hubungi supervisor untuk mengaktifkannya kembali."
        : pesanGalat(error),
      nilai,
    };
  }

  const arah = await berandaPengguna(hasil.user.id, tujuanAman(data.get("lanjut")));
  if ("galat" in arah) return { galat: arah.galat, nilai };
  redirect(arah.tujuan);
}

const skemaDaftar = z.object({
  nama: z
    .string()
    .trim()
    .min(2, { error: "Tulis nama Anda, minimal 2 huruf." })
    .max(120, { error: "Nama paling panjang 120 karakter." }),
  email: z.email({ error: "Masukkan email yang valid, contoh: nama@contoh.com." }).max(254),
  hp: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 -]{8,20})?$/, { error: "Nomor HP tidak valid. Contoh: 0812 3456 7890." }),
  kata_sandi: z
    .string()
    .min(8, { error: "Kata sandi minimal 8 karakter." })
    .max(72, { error: "Kata sandi paling panjang 72 karakter." }),
  setuju: z.literal("ya", { error: "Centang persetujuan untuk membuat akun." }),
});

export async function daftar(_: HasilForm, data: FormData): Promise<HasilForm> {
  const alamat = bacaAlamat(data);
  const nilai = {
    nama: String(data.get("nama") ?? ""),
    email: String(data.get("email") ?? "").trim(),
    hp: String(data.get("hp") ?? ""),
    ...alamat,
  };
  const cek = skemaDaftar.safeParse({ ...nilai, kata_sandi: data.get("kata_sandi"), setuju: data.get("setuju") });
  // Alamat domisili saat ini wajib untuk membuat akun.
  const cekAlamat = skemaAlamat.safeParse(alamat);
  if (!cek.success || !cekAlamat.success) {
    const kolom: HasilForm["kolom"] = {};
    for (const i of [...(cek.error?.issues ?? []), ...(cekAlamat.error?.issues ?? [])]) kolom[String(i.path[0])] ??= i.message;
    return { kolom, nilai };
  }
  if (!(await kelurahanSah(cekAlamat.data.kecamatan, cekAlamat.data.kelurahan))) {
    return { kolom: { kelurahan: "Pilih kelurahan yang berada di kecamatan tersebut." }, nilai };
  }

  const supabase = await buatKlienServer();
  // Peran tidak dikirim: trigger database selalu membuat akun baru sebagai warga.
  // Alamat (`domicile`) disimpan trigger yang sama ke profile_addresses.
  const { data: hasil, error } = await supabase.auth.signUp({
    email: cek.data.email,
    password: cek.data.kata_sandi,
    options: { data: { full_name: cek.data.nama, phone: cek.data.hp || null, domicile: payloadAlamat(cekAlamat.data) } },
  });
  if (error) return { galat: pesanGalat(error), nilai };
  if (!hasil.session) {
    // "Confirm email" masih menyala di Supabase.
    return {
      galat: "Akun dibuat, tetapi email perlu dikonfirmasi lebih dulu. Buka email Anda, klik tautan konfirmasi, lalu masuk.",
      nilai,
    };
  }
  // Akun baru selalu warga: jangan arahkan ke area staf.
  const lanjut = tujuanAman(data.get("lanjut"));
  const areaStaf = lanjut && /^\/(admin|petugas|supervisor)(\/|\?|$)/.test(lanjut);
  redirect(lanjut && !areaStaf ? lanjut : "/akun");
}

export async function keluar() {
  const supabase = await buatKlienServer();
  await supabase.auth.signOut();
  redirect("/masuk?keluar=1");
}
