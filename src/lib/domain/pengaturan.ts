/**
 * Definisi pengaturan situs (aman diimpor dari komponen klien).
 * Pembacaan dari database ada di src/lib/pengaturan.ts (server-only).
 */
export const BAWAAN_PENGATURAN = {
  "beranda.judul": "Rawat Medan bersama|Mulai dari satu laporan",
  "beranda.kata_berganti": "jalan berlubang, parit tersumbat, sampah menumpuk, lampu jalan mati, pohon tumbang",
  "beranda.kalimat_pembuka":
    "Laporkan sekarang, lalu pantau setiap langkahnya. Laporan baru dinyatakan selesai setelah ada bukti foto sebelum dan sesudah diperbaiki.",
  "kontak.email": "",
  "kontak.telepon": "",
  "darurat.nomor": "112",
  "footer.disclaimer":
    "Prototipe untuk Lomba Web Development IT Fest UMK 2026, bukan kanal resmi Pemerintah Kota Medan. Keadaan darurat: hubungi 112.",
} as const;

export type KunciPengaturan = keyof typeof BAWAAN_PENGATURAN;

/** Label & petunjuk untuk halaman CMS pengaturan (admin). */
export const DAFTAR_PENGATURAN: Array<{ kunci: KunciPengaturan; label: string; petunjuk: string; panjang?: boolean; maks: number }> = [
  { kunci: "beranda.judul", label: "Judul besar beranda", petunjuk: 'Kata "Medan" otomatis diberi garis kuning.', maks: 120 },
  { kunci: "beranda.kata_berganti", label: "Kata yang berganti di beranda", petunjuk: "Pisahkan dengan koma, mis. jalan berlubang, parit tersumbat.", maks: 300 },
  { kunci: "beranda.kalimat_pembuka", label: "Kalimat di bawah judul", petunjuk: "Satu sampai dua kalimat.", panjang: true, maks: 300 },
  { kunci: "darurat.nomor", label: "Nomor darurat", petunjuk: "Tampil di footer semua halaman.", maks: 20 },
  { kunci: "kontak.telepon", label: "Telepon pengelola", petunjuk: "Kosongkan bila tidak ingin ditampilkan.", maks: 30 },
  { kunci: "kontak.email", label: "Email pengelola", petunjuk: "Kosongkan bila tidak ingin ditampilkan.", maks: 120 },
  { kunci: "footer.disclaimer", label: "Teks disclaimer footer", petunjuk: "Wajib menyebut bahwa ini prototipe lomba.", panjang: true, maks: 400 },
];
