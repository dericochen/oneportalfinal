import "server-only";
import { supabaseTerkonfigurasi } from "@/lib/env";
import { MAKS_SLIDE_TAMPIL, type Slide, type SlideAdmin, type StatusSlide } from "@/lib/domain/slide";
import { buatKlienServer } from "@/lib/supabase/server";

type BarisBanner = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const KOLOM = "id, title, body, link_url, link_label, image_path, sort_order, is_active, starts_at, ends_at";

type Klien = Awaited<ReturnType<typeof buatKlienServer>>;

const urlFoto = (supabase: Klien, path: string | null) =>
  path ? supabase.storage.from("konten").getPublicUrl(path).data.publicUrl : null;

function keSlide(supabase: Klien, b: BarisBanner): Slide {
  return {
    id: b.id,
    judul: b.title,
    keterangan: b.body,
    gambar: urlFoto(supabase, b.image_path),
    tautan: b.link_url,
    labelTautan: b.link_label,
  };
}

/**
 * Slide yang tampil di beranda sekarang: aktif, belum dihapus, dan dalam
 * jendela jadwal. Disaring eksplisit karena admin yang sedang masuk juga
 * boleh membaca slide nonaktif lewat RLS. Gagal = daftar kosong, jadi beranda
 * memakai slide bawaan.
 */
export async function ambilSlideBeranda(): Promise<Slide[]> {
  if (!supabaseTerkonfigurasi) return [];
  // Klien dibuat di luar try: cookies() melempar sinyal "dinamis" yang tidak boleh ditelan.
  const supabase = await buatKlienServer();
  try {
    const sekarang = new Date().toISOString();
    const { data, error } = await supabase
      .from("banners")
      .select(KOLOM)
      .eq("is_active", true)
      .is("deleted_at", null)
      .or(`starts_at.is.null,starts_at.lte.${sekarang}`)
      .or(`ends_at.is.null,ends_at.gt.${sekarang}`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(MAKS_SLIDE_TAMPIL);
    if (error) {
      console.error("ambilSlideBeranda", error);
      return [];
    }
    return ((data ?? []) as BarisBanner[]).map((b) => keSlide(supabase, b));
  } catch (e) {
    console.error("ambilSlideBeranda", e);
    return [];
  }
}

function hitungStatus(b: BarisBanner, sekarang: number): StatusSlide {
  if (!b.is_active) return "nonaktif";
  if (b.starts_at && new Date(b.starts_at).getTime() > sekarang) return "terjadwal";
  if (b.ends_at && new Date(b.ends_at).getTime() <= sekarang) return "berakhir";
  return "tampil";
}

/** Semua slide (kecuali yang dihapus) untuk halaman CMS. Null bila gagal. */
export async function ambilSemuaSlide(): Promise<SlideAdmin[] | null> {
  if (!supabaseTerkonfigurasi) return null;
  const supabase = await buatKlienServer();
  const { data, error } = await supabase
    .from("banners")
    .select(KOLOM)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("ambilSemuaSlide", error);
    return null;
  }
  const sekarang = Date.now();
  return ((data ?? []) as BarisBanner[]).map<SlideAdmin>((b) => ({
    ...keSlide(supabase, b),
    path: b.image_path,
    urutan: b.sort_order,
    aktif: b.is_active,
    mulai: b.starts_at,
    selesai: b.ends_at,
    status: hitungStatus(b, sekarang),
  }));
}
