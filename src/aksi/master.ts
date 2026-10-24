"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ambilSesi } from "@/lib/auth";
import { pesanGalat } from "@/lib/galat";
import { DAFTAR_PENGATURAN, type KunciPengaturan } from "@/lib/domain/pengaturan";
import { buatKlienServer } from "@/lib/supabase/server";

/**
 * Server Action data master yang dikelola admin: pengaturan situs, matriks
 * SLA, dan instansi. Peran dicek di sini; RLS tabel menegakkannya lagi, dan
 * trigger audit mencatat siapa mengubah apa.
 */
export type Hasil = { ok: true } | { ok: false; galat: string };

async function wajibAdmin(): Promise<string | null> {
  const s = await ambilSesi();
  if (!s) return "Anda perlu masuk terlebih dahulu.";
  if (s.peran !== "ADMIN") return "Hanya admin yang dapat mengubah data ini.";
  return null;
}

export async function simpanPengaturan(nilai: Partial<Record<KunciPengaturan, string>>): Promise<Hasil> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  const baris = [];
  for (const def of DAFTAR_PENGATURAN) {
    const v = nilai[def.kunci];
    if (v === undefined) continue;
    const t = v.trim();
    if (t.length > def.maks) return { ok: false, galat: `${def.label} maksimal ${def.maks} karakter.` };
    if ((def.kunci === "beranda.judul" || def.kunci === "footer.disclaimer") && t.length < 5) {
      return { ok: false, galat: `${def.label} wajib diisi.` };
    }
    if (def.kunci === "kontak.email" && t && !z.email().safeParse(t).success) return { ok: false, galat: "Email pengelola tidak valid." };
    baris.push({ key: def.kunci, value: t, updated_at: new Date().toISOString() });
  }
  if (baris.length === 0) return { ok: true };
  const supabase = await buatKlienServer();
  const { error } = await supabase.from("site_settings").upsert(baris, { onConflict: "key" });
  if (error) return { ok: false, galat: pesanGalat(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

const skemaSla = z.array(
  z.object({
    kategori: z.uuid(),
    prioritas: z.enum(["EMERGENCY", "HIGH", "MEDIUM", "LOW"]),
    jam: z.number().int({ error: "Target SLA harus bilangan bulat jam." }).min(1, { error: "Target SLA minimal 1 jam." }).max(2160, { error: "Target SLA maksimal 90 hari." }),
  }),
);

export async function simpanSla(sel: z.input<typeof skemaSla>): Promise<Hasil> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  const cek = skemaSla.safeParse(sel);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian SLA tidak valid." };
  const supabase = await buatKlienServer();
  const { error } = await supabase.from("sla_policies").upsert(
    cek.data.map((s) => ({ category_id: s.kategori, priority: s.prioritas, target_hours: s.jam })),
    { onConflict: "category_id,priority" },
  );
  if (error) return { ok: false, galat: pesanGalat(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const skemaInstansi = z.object({
  id: z.uuid().optional(),
  nama: z.string().trim().min(3, { error: "Nama instansi minimal 3 karakter." }).max(160),
  namaSingkat: z.string().trim().min(2, { error: "Nama singkat minimal 2 karakter." }).max(60),
  jenis: z.enum(["INTERNAL", "EXTERNAL"]),
  keterangan: z.string().trim().max(500),
  telepon: z.string().trim().max(30),
  situs: z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Situs harus diawali https://" })]),
  aktif: z.boolean(),
});

const keSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "instansi";

export async function simpanInstansi(m: z.input<typeof skemaInstansi>): Promise<Hasil> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  const cek = skemaInstansi.safeParse(m);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian belum lengkap." };
  const d = cek.data;
  const supabase = await buatKlienServer();
  const data = {
    name: d.nama,
    short_name: d.namaSingkat,
    kind: d.jenis,
    description: d.keterangan || null,
    contact_phone: d.telepon || null,
    website: d.situs || null,
    is_active: d.aktif,
  };
  const { error } = d.id
    ? await supabase.from("agencies").update(data).eq("id", d.id)
    : await supabase.from("agencies").insert({ ...data, slug: `${keSlug(d.namaSingkat)}-${Date.now().toString(36)}` });
  if (error) return { ok: false, galat: pesanGalat(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Hapus lunak (soft delete). Ditolak database bila instansi masih dipakai laporan/petugas. */
export async function hapusInstansi(id: string, pulihkan = false): Promise<Hasil> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  if (!z.uuid().safeParse(id).success) return { ok: false, galat: "Instansi tidak ditemukan." };
  const supabase = await buatKlienServer();
  const { error } = await supabase.from("agencies").update({ deleted_at: pulihkan ? null : new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, galat: pesanGalat(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
