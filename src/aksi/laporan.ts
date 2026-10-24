"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ambilSesi } from "@/lib/auth";
import type { Peran } from "@/lib/domain/laporan";
import { pesanGalat } from "@/lib/galat";
import { buatKlienServer } from "@/lib/supabase/server";

/**
 * Server Action laporan. Lapis 2 penegakan akses: peran dicek di sini; lapis 3
 * (fungsi transisi + RLS di database) memvalidasi ulang semuanya, termasuk
 * status asal dan data wajib, dalam satu transaksi.
 */
export type HasilAksi = { ok: true; kode?: string; id?: string; status?: string } | { ok: false; galat: string };

const skemaMedia = z
  .object({
    path: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{8,80}\.(jpg|jpeg|webp|png|pdf)$/),
    thumb_path: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{8,80}\.(jpg|jpeg|webp|png)$/).optional(),
    mime_type: z.enum(["image/jpeg", "image/webp", "image/png", "application/pdf"]),
    size_bytes: z.number().int().min(1).max(5_242_880),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict();
const daftarMedia = (min: number, maks: number) => z.array(skemaMedia).min(min).max(maks);

const skemaLaporan = z.object({
  title: z.string().trim().min(10, { error: "Judul minimal 10 karakter." }).max(120),
  description: z.string().trim().min(20, { error: "Deskripsi minimal 20 karakter." }).max(2000),
  category_id: z.uuid({ error: "Pilih kategori masalah." }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  district_code: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, { error: "Pilih kecamatan." }),
  village_code: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, { error: "Pilih kelurahan." }),
  address: z.string().trim().min(5, { error: "Isi alamat atau patokan, minimal 5 karakter." }).max(300),
  is_anonymous: z.boolean(),
  is_confidential: z.boolean(),
  phone: z.string().trim().max(20).optional(),
  consent: z.literal(true, { error: "Centang persetujuan pemrosesan data." }),
  media: daftarMedia(1, 5),
  channel: z.enum(["PHONE", "WALK_IN", "SOCIAL"]).optional(),
  intake_name: z.string().trim().max(120).optional(),
  intake_note: z.string().trim().max(500).optional(),
});
export type MasukanLaporan = z.input<typeof skemaLaporan>;

export async function kirimLaporan(masukan: MasukanLaporan): Promise<HasilAksi> {
  const sesi = await ambilSesi();
  if (!sesi) return { ok: false, galat: "Anda perlu masuk terlebih dahulu." };
  if (sesi.peran !== "CITIZEN" && sesi.peran !== "ADMIN") return { ok: false, galat: "Laporan dibuat dari akun warga atau admin." };
  const cek = skemaLaporan.safeParse(masukan);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian belum lengkap." };
  const data = { ...cek.data };
  if (sesi.peran !== "ADMIN") {
    delete data.channel;
    delete data.intake_name;
    delete data.intake_note;
  }

  const supabase = await buatKlienServer();
  const { data: hasil, error } = await supabase.rpc("transition_report", { p_action: "submit", p_report_id: null, p_payload: data });
  if (error) return { ok: false, galat: pesanGalat(error) };
  const h = hasil as { id: string; code: string; status: string };
  revalidatePath("/", "layout");
  return { ok: true, id: h.id, kode: h.code, status: h.status };
}

/** Peran yang boleh menjalankan tiap aksi (dicek ulang oleh database). */
const PERAN_AKSI: Record<string, Peran[]> = {
  verify: ["ADMIN"],
  assign: ["ADMIN"],
  reassign: ["ADMIN"],
  reject: ["ADMIN"],
  forward: ["ADMIN"],
  merge: ["ADMIN"],
  approve_proof: ["ADMIN"],
  return_proof: ["ADMIN"],
  set_media_visibility: ["ADMIN"],
  start: ["OFFICER"],
  add_progress: ["OFFICER"],
  submit_proof: ["OFFICER"],
  add_note: ["ADMIN", "SUPERVISOR", "OFFICER"],
  support: ["CITIZEN"],
  update_details: ["ADMIN"],
  reopen: ["ADMIN"],
  delete: ["ADMIN"],
  restore: ["ADMIN"],
};

const skemaPayload: Record<string, z.ZodType> = {
  add_progress: z.object({ note: z.string(), show_to_citizen: z.boolean(), media: daftarMedia(0, 5) }).passthrough(),
  submit_proof: z
    .object({
      description: z.string(),
      work_date: z.string(),
      declaration: z.boolean(),
      before: daftarMedia(1, 5),
      after: daftarMedia(1, 5),
      supporting: daftarMedia(0, 3).optional(),
    })
    .passthrough(),
};

export async function jalankanTransisi(aksi: string, idLaporan: string, payload: Record<string, unknown> = {}): Promise<HasilAksi> {
  const sesi = await ambilSesi();
  if (!sesi) return { ok: false, galat: "Anda perlu masuk terlebih dahulu." };
  const izin = PERAN_AKSI[aksi];
  if (!izin) return { ok: false, galat: "Aksi tidak dikenal." };
  if (!izin.includes(sesi.peran)) return { ok: false, galat: "Anda tidak memiliki akses untuk tindakan ini." };
  if (!z.uuid().safeParse(idLaporan).success) return { ok: false, galat: "Laporan tidak ditemukan." };
  const skema = skemaPayload[aksi];
  if (skema) {
    const cek = skema.safeParse(payload);
    if (!cek.success) return { ok: false, galat: "Lampiran tidak valid. Unggah ulang foto Anda." };
  }

  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("transition_report", { p_action: aksi, p_report_id: idLaporan, p_payload: payload });
  if (error) return { ok: false, galat: pesanGalat(error) };
  const h = data as { id: string; code: string; status: string };
  revalidatePath("/", "layout");
  return { ok: true, id: h.id, kode: h.code, status: h.status };
}

/** Saran kecamatan dari titik peta + cek di dalam Kota Medan. */
export async function sarankanWilayah(lat: number, lng: number): Promise<{ kode: string | null; dalamKota: boolean }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { kode: null, dalamKota: false };
  const supabase = await buatKlienServer();
  const { data } = await supabase.rpc("suggest_district", { p_lat: lat, p_lng: lng });
  const baris = (Array.isArray(data) ? data[0] : data) as { district_code: string | null; inside_city: boolean } | undefined;
  return { kode: baris?.district_code ?? null, dalamKota: baris?.inside_city ?? false };
}
