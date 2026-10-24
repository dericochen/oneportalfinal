"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ambilSesi } from "@/lib/auth";
import { POLA_PATH_SLIDE, tautanSlideValid } from "@/lib/domain/slide";
import { pesanGalat } from "@/lib/galat";
import { buatKlienServer } from "@/lib/supabase/server";

/**
 * Server Action CMS slide beranda. Peran ADMIN dicek di sini (lapis 2);
 * RLS tabel banners dan bucket konten menegakkannya sekali lagi (lapis 3).
 */
export type HasilSlide = { ok: true; id?: string } | { ok: false; galat: string };

const tanggal = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tanggal tidak valid." })]);

const skemaSlide = z.object({
  id: z.uuid().optional(),
  judul: z.string().trim().min(3, { error: "Judul slide minimal 3 karakter." }).max(120, { error: "Judul slide maksimal 120 karakter." }),
  keterangan: z.string().trim().max(200, { error: "Keterangan maksimal 200 karakter." }),
  path: z.string().regex(POLA_PATH_SLIDE, { error: "Unggah foto slide terlebih dahulu." }),
  tautan: z.string().trim(),
  labelTautan: z.string().trim().max(40, { error: "Label tautan maksimal 40 karakter." }),
  aktif: z.boolean(),
  mulai: tanggal,
  selesai: tanggal,
});
export type MasukanSlide = z.input<typeof skemaSlide>;

async function wajibAdmin(): Promise<string | null> {
  const sesi = await ambilSesi();
  if (!sesi) return "Anda perlu masuk terlebih dahulu.";
  if (sesi.peran !== "ADMIN") return "Hanya admin yang dapat mengelola slide beranda.";
  return null;
}

const segarkan = () => {
  revalidatePath("/", "layout");
};

/** Hapus berkas lama di bucket konten. Gagal = dibiarkan (tidak memengaruhi hasil simpan). */
async function hapusBerkas(path: string | null | undefined) {
  if (!path || !POLA_PATH_SLIDE.test(path)) return;
  try {
    const supabase = await buatKlienServer();
    await supabase.storage.from("konten").remove([path]);
  } catch (e) {
    console.error("hapusBerkas slide", e);
  }
}

export async function simpanSlide(masukan: MasukanSlide): Promise<HasilSlide> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };

  const cek = skemaSlide.safeParse(masukan);
  if (!cek.success) return { ok: false, galat: cek.error.issues[0]?.message ?? "Isian belum lengkap." };
  const d = cek.data;

  if (d.tautan && !tautanSlideValid(d.tautan)) {
    return { ok: false, galat: "Tautan harus diawali / (halaman di situs ini) atau https://." };
  }
  if (d.tautan && !d.labelTautan) return { ok: false, galat: "Isi label tautan, contoh: Buat laporan." };
  if (d.mulai && d.selesai && d.selesai < d.mulai) {
    return { ok: false, galat: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  }

  // Tanggal dibaca sebagai WIB: mulai pukul 00.00, selesai pukul 23.59.
  const baris = {
    title: d.judul,
    body: d.keterangan || null,
    image_path: d.path,
    link_url: d.tautan || null,
    link_label: d.tautan ? d.labelTautan : null,
    is_active: d.aktif,
    starts_at: d.mulai ? `${d.mulai}T00:00:00+07:00` : null,
    ends_at: d.selesai ? `${d.selesai}T23:59:59+07:00` : null,
  };

  const supabase = await buatKlienServer();

  if (d.id) {
    const { data: lama } = await supabase.from("banners").select("image_path").eq("id", d.id).is("deleted_at", null).maybeSingle();
    if (!lama) return { ok: false, galat: "Slide tidak ditemukan. Muat ulang halaman ini." };
    const { error } = await supabase.from("banners").update(baris).eq("id", d.id);
    if (error) return { ok: false, galat: pesanGalat(error) };
    if (lama.image_path && lama.image_path !== d.path) await hapusBerkas(lama.image_path);
    segarkan();
    return { ok: true, id: d.id };
  }

  const { data: terakhir } = await supabase
    .from("banners")
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("banners")
    .insert({ ...baris, sort_order: (terakhir?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, galat: pesanGalat(error) };
  segarkan();
  return { ok: true, id: data.id };
}

export async function aturAktifSlide(id: string, aktif: boolean): Promise<HasilSlide> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  if (!z.uuid().safeParse(id).success) return { ok: false, galat: "Slide tidak ditemukan." };
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.from("banners").update({ is_active: aktif }).eq("id", id).is("deleted_at", null).select("id");
  if (error) return { ok: false, galat: pesanGalat(error) };
  if (!data?.length) return { ok: false, galat: "Slide tidak ditemukan. Muat ulang halaman ini." };
  segarkan();
  return { ok: true, id };
}

export async function geserSlide(id: string, arah: "naik" | "turun"): Promise<HasilSlide> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  if (!z.uuid().safeParse(id).success) return { ok: false, galat: "Slide tidak ditemukan." };
  const supabase = await buatKlienServer();
  const { data, error } = await supabase
    .from("banners")
    .select("id, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, galat: pesanGalat(error) };
  const urut = (data ?? []).map((b) => b.id as string);
  const i = urut.indexOf(id);
  if (i === -1) return { ok: false, galat: "Slide tidak ditemukan. Muat ulang halaman ini." };
  const j = arah === "naik" ? i - 1 : i + 1;
  if (j < 0 || j >= urut.length) return { ok: true, id };
  [urut[i], urut[j]] = [urut[j], urut[i]];

  // Nomor urut ditulis ulang 0..n-1 hanya untuk baris yang berubah.
  const lama = new Map((data ?? []).map((b) => [b.id as string, b.sort_order as number]));
  for (const [nomor, idBaris] of urut.entries()) {
    if (lama.get(idBaris) === nomor) continue;
    const { error: galat } = await supabase.from("banners").update({ sort_order: nomor }).eq("id", idBaris);
    if (galat) return { ok: false, galat: pesanGalat(galat) };
  }
  segarkan();
  return { ok: true, id };
}

export async function hapusSlide(id: string): Promise<HasilSlide> {
  const tolak = await wajibAdmin();
  if (tolak) return { ok: false, galat: tolak };
  if (!z.uuid().safeParse(id).success) return { ok: false, galat: "Slide tidak ditemukan." };
  const supabase = await buatKlienServer();
  const { data: lama } = await supabase.from("banners").select("image_path").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!lama) return { ok: false, galat: "Slide tidak ditemukan. Muat ulang halaman ini." };
  // Hapus lunak: baris tetap ada untuk jejak audit, hanya fotonya yang dibersihkan.
  const { error } = await supabase.from("banners").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id);
  if (error) return { ok: false, galat: pesanGalat(error) };
  await hapusBerkas(lama.image_path);
  segarkan();
  return { ok: true, id };
}
