/**
 * Slide hero beranda. Disimpan di tabel `banners`; foto di bucket publik
 * `konten`, folder `slide/`. Berkas ini aman diimpor dari komponen klien.
 */

/** Lama tiap slide tampil di beranda (milidetik). */
export const DURASI_SLIDE_MS = 2000;

/** Batas jumlah slide aktif di beranda agar tetap ringan di HP murah. */
export const MAKS_SLIDE_TAMPIL = 8;

export type Slide = {
  id: string;
  judul: string;
  keterangan: string | null;
  /** URL foto publik. Null = slide teks (dipakai slide bawaan). */
  gambar: string | null;
  tautan: string | null;
  labelTautan: string | null;
};

export type StatusSlide = "tampil" | "terjadwal" | "berakhir" | "nonaktif";

export type SlideAdmin = Slide & {
  /** Path di bucket `konten`, mis. slide/abc123.jpg. */
  path: string | null;
  urutan: number;
  aktif: boolean;
  /** ISO. */
  mulai: string | null;
  selesai: string | null;
  status: StatusSlide;
};

/**
 * Slide bawaan saat admin belum mengaktifkan satu pun slide. Teks saja, tanpa
 * foto stok (DESIGN.md bagian 5), dan hanya menyebut fitur yang benar-benar ada.
 */
export const SLIDE_BAWAAN: Slide[] = [
  {
    id: "bawaan-1",
    judul: "Foto masalahnya, tandai lokasinya",
    keterangan: "Laporan masuk ke antrean admin untuk diverifikasi.",
    gambar: null,
    tautan: "/lapor",
    labelTautan: "Buat laporan",
  },
  {
    id: "bawaan-2",
    judul: "Pantau dengan kode resi",
    keterangan: "Setiap perubahan status tercatat lengkap dengan jam WIB.",
    gambar: null,
    tautan: "/lacak",
    labelTautan: "Lacak laporan",
  },
  {
    id: "bawaan-3",
    judul: "Selesai berarti ada bukti foto",
    keterangan: "Admin memeriksa foto sebelum dan sesudah dari petugas.",
    gambar: null,
    tautan: "/peta",
    labelTautan: "Lihat peta",
  },
];

/** Tautan slide: path internal ("/lapor") atau alamat https penuh. */
export function tautanSlideValid(nilai: string): boolean {
  if (nilai.length > 300) return false;
  if (nilai.startsWith("/")) return !nilai.startsWith("//") && !/\s/.test(nilai);
  try {
    const u = new URL(nilai);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Lokasi berkas di bucket: slide/{32 heksadesimal}.jpg */
export const POLA_PATH_SLIDE = /^slide\/[0-9a-f]{32}\.jpg$/;
