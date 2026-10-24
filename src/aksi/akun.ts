"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ambilSesi } from "@/lib/auth";
import { kelurahanSah } from "@/lib/data/wilayah";
import { alamatKosong, type NilaiAlamat, payloadAlamat, skemaAlamat } from "@/lib/domain/alamat";
import { pesanGalat } from "@/lib/galat";
import { buatKlienAdmin } from "@/lib/supabase/admin";
import { buatKlienServer } from "@/lib/supabase/server";

/**
 * Kelola akun oleh SUPERVISOR. Pendaftaran mandiri hanya membuat akun warga;
 * akun admin, petugas, dan supervisor hanya dibuat di sini.
 *
 * Membuat akun & mengganti kata sandi butuh Auth Admin API (service role).
 * Service role HANYA dipakai setelah sesi terverifikasi sebagai supervisor,
 * dan perubahan peran tetap lewat fungsi database supervisor_set_profile
 * (yang memeriksa peran pemanggil sekali lagi).
 */
export type HasilAkun = { ok: true; pesan?: string } | { ok: false; galat: string };

async function wajibSupervisor() {
  const s = await ambilSesi();
  if (!s) return { galat: "Anda perlu masuk terlebih dahulu." } as const;
  if (s.peran !== "SUPERVISOR") return { galat: "Hanya supervisor yang dapat mengelola akun." } as const;
  return { sesi: s } as const;
}

const peranStaf = z.enum(["ADMIN", "OFFICER", "SUPERVISOR", "CITIZEN"]);
const sandi = z
  .string()
  .min(8, { error: "Kata sandi minimal 8 karakter." })
  .max(72, { error: "Kata sandi maksimal 72 karakter." })
  .regex(/[A-Za-z]/, { error: "Kata sandi harus memuat huruf." })
  .regex(/[0-9]/, { error: "Kata sandi harus memuat angka." });

const skemaBaru = z
  .object({
    nama: z.string().trim().min(2, { error: "Tulis nama, minimal 2 huruf." }).max(120),
    email: z.email({ error: "Email tidak valid." }).max(254),
    hp: z.string().trim().regex(/^(\+?[0-9 -]{8,20})?$/, { error: "Nomor HP tidak valid." }),
    peran: peranStaf,
    instansi: z.string(),
    sandi,
    // Alamat domisili wajib bila fitur alamat aktif; dikirim undefined bila fitur
    // belum aktif di server (tabel/migrasi alamat belum ada).
    alamat: skemaAlamat.optional(),
  })
  .refine((d) => d.peran !== "OFFICER" || /^[0-9a-f-]{36}$/.test(d.instansi), { error: "Petugas lapangan wajib memilih instansi.", path: ["instansi"] });

/** Validasi alamat (format + kelurahan di kecamatannya) menjadi payload database. */
async function alamatUntukDb(a: NilaiAlamat): Promise<{ payload: ReturnType<typeof payloadAlamat> } | { galat: string }> {
  const cek = skemaAlamat.safeParse(a);
  if (!cek.success) return { galat: cek.error.issues[0]?.message ?? "Alamat domisili belum lengkap." };
  if (!(await kelurahanSah(cek.data.kecamatan, cek.data.kelurahan))) {
    return { galat: "Pilih kelurahan yang berada di kecamatan tersebut." };
  }
  return { payload: payloadAlamat(cek.data) };
}

export async function buatAkun(m: z.input<typeof skemaBaru>): Promise<HasilAkun> {
  const izin = await wajibSupervisor();
  if ("galat" in izin) return { ok: false, galat: izin.galat! };
  const cek = skemaBaru.safeParse(m);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian belum lengkap." };
  const d = cek.data;
  // Fitur alamat aktif: validasi dan kirim. Tidak aktif: lewati.
  let domicile: ReturnType<typeof payloadAlamat> | undefined;
  if (m.alamat) {
    const alamat = await alamatUntukDb(m.alamat);
    if ("galat" in alamat) return { ok: false, galat: alamat.galat };
    domicile = alamat.payload;
  }

  const admin = buatKlienAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: d.email.toLowerCase(),
    password: d.sandi,
    email_confirm: true,
    user_metadata: { full_name: d.nama, phone: d.hp || null },
  });
  if (error || !data.user) {
    return { ok: false, galat: /already|registered|exists/i.test(error?.message ?? "") ? "Email ini sudah dipakai akun lain." : pesanGalat(error) };
  }

  // Trigger database selalu membuat profil sebagai warga; peran ditetapkan lewat fungsi supervisor.
  const supabase = await buatKlienServer();
  const { error: errPeran } = await supabase.rpc("supervisor_set_profile", {
    p_user: data.user.id,
    p_payload: {
      role: d.peran,
      agency_id: d.peran === "OFFICER" ? d.instansi : null,
      full_name: d.nama,
      phone: d.hp || null,
      ...(domicile ? { domicile } : {}),
    },
  });
  if (errPeran) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, galat: pesanGalat(errPeran) };
  }
  revalidatePath("/supervisor/akun");
  return { ok: true, pesan: `Akun ${d.email} dibuat. Berikan kata sandinya secara langsung kepada pemiliknya.` };
}

const skemaUbah = z.object({
  id: z.uuid(),
  nama: z.string().trim().min(2).max(120),
  hp: z.string().trim().regex(/^(\+?[0-9 -]{8,20})?$/, { error: "Nomor HP tidak valid." }),
  peran: peranStaf,
  instansi: z.string(),
  aktif: z.boolean(),
});

export async function ubahAkun(m: z.input<typeof skemaUbah> & { alamat?: NilaiAlamat }): Promise<HasilAkun> {
  const izin = await wajibSupervisor();
  if ("galat" in izin) return { ok: false, galat: izin.galat! };
  const cek = skemaUbah.safeParse(m);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian belum lengkap." };
  const d = cek.data;
  // Akun lama boleh tetap tanpa alamat; begitu salah satu kolom diisi, semuanya wajib.
  let domicile: ReturnType<typeof payloadAlamat> | undefined;
  if (m.alamat && !alamatKosong(m.alamat)) {
    const alamat = await alamatUntukDb(m.alamat);
    if ("galat" in alamat) return { ok: false, galat: alamat.galat };
    domicile = alamat.payload;
  }
  const supabase = await buatKlienServer();
  const { error } = await supabase.rpc("supervisor_set_profile", {
    p_user: d.id,
    p_payload: {
      role: d.peran,
      agency_id: d.peran === "OFFICER" ? d.instansi : null,
      is_active: d.aktif,
      full_name: d.nama,
      phone: d.hp,
      ...(domicile ? { domicile } : {}),
    },
  });
  if (error) return { ok: false, galat: pesanGalat(error) };

  // Akun nonaktif juga diblokir di Auth agar sesi lamanya tidak bisa diperbarui.
  const admin = buatKlienAdmin();
  await admin.auth.admin.updateUserById(d.id, { ban_duration: d.aktif ? "none" : "876000h" });
  revalidatePath("/supervisor/akun");
  return { ok: true };
}

export async function gantiSandi(id: string, baru: string): Promise<HasilAkun> {
  const izin = await wajibSupervisor();
  if ("galat" in izin) return { ok: false, galat: izin.galat! };
  if (!z.uuid().safeParse(id).success) return { ok: false, galat: "Akun tidak ditemukan." };
  const cek = sandi.safeParse(baru);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Kata sandi tidak valid." };

  // Pastikan akun ada & bukan akun demo (kata sandi demo dibuat publik untuk juri).
  const supabase = await buatKlienServer();
  const { data: p } = await supabase.from("profiles").select("is_demo").eq("id", id).maybeSingle();
  if (!p) return { ok: false, galat: "Akun tidak ditemukan." };
  if (p.is_demo) return { ok: false, galat: "Kata sandi akun demo tidak dapat diubah." };

  const { error } = await buatKlienAdmin().auth.admin.updateUserById(id, { password: cek.data });
  if (error) return { ok: false, galat: pesanGalat(error) };
  return { ok: true, pesan: "Kata sandi diganti. Berikan secara langsung kepada pemilik akun." };
}
