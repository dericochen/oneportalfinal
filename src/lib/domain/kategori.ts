/**
 * Sepuluh kategori laporan. Slug sama dengan kolom `report_categories.slug`
 * di database; ikon dipetakan di `PelatKategori`.
 */
export const KATEGORI_LAPORAN = [
  { slug: "jalan-rusak", nama: "Jalan rusak" },
  { slug: "drainase-banjir", nama: "Drainase dan genangan/banjir" },
  { slug: "sampah", nama: "Sampah" },
  { slug: "lampu-jalan", nama: "Lampu jalan mati" },
  { slug: "air-bersih", nama: "Air bersih" },
  { slug: "fasilitas-umum", nama: "Fasilitas umum dan taman" },
  { slug: "lalu-lintas", nama: "Lalu lintas dan parkir" },
  { slug: "pohon-bencana", nama: "Pohon tumbang dan bencana" },
  { slug: "pelayanan-publik", nama: "Pelayanan publik" },
  { slug: "lainnya", nama: "Lainnya" },
] as const;

export type SlugKategori = (typeof KATEGORI_LAPORAN)[number]["slug"];
