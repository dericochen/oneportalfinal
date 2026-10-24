/**
 * Format waktu dan angka. Server Vercel berjalan dalam UTC, jadi semua waktu
 * dipaksa ke Asia/Jakarta (Medan = WIB). Nama bulan ditulis manual agar hasil
 * server dan browser selalu sama (menghindari hydration mismatch akibat
 * perbedaan data ICU).
 */

const ZONA = "Asia/Jakarta";
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type MasukanWaktu = Date | string | number;

function bagian(waktu: MasukanWaktu) {
  const d = waktu instanceof Date ? waktu : new Date(waktu);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const ambil = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    tahun: Number(ambil("year")),
    bulan: Number(ambil("month")) - 1,
    tanggal: Number(ambil("day")),
    jam: ambil("hour"),
    menit: ambil("minute"),
  };
}

/** "13 Okt 2026, 09.10 WIB" */
export function formatWaktu(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.tanggal} ${BULAN[b.bulan]} ${b.tahun}, ${b.jam}.${b.menit} WIB`;
}

/** "13 Okt 2026" */
export function formatTanggal(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.tanggal} ${BULAN[b.bulan]} ${b.tahun}`;
}

/** "13 Oktober 2026" */
export function formatTanggalPanjang(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.tanggal} ${BULAN_PANJANG[b.bulan]} ${b.tahun}`;
}

/** "13 Okt" (untuk label penggeser sebelum–sesudah dan log resi) */
export function formatTanggalPendek(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.tanggal} ${BULAN[b.bulan]}`;
}

/** "2026-10-13" (tanggal WIB, untuk nilai input type="date") */
export function formatTanggalIso(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.tahun}-${String(b.bulan + 1).padStart(2, "0")}-${String(b.tanggal).padStart(2, "0")}`;
}

/** "09.10" */
export function formatJam(waktu: MasukanWaktu): string {
  const b = bagian(waktu);
  return `${b.jam}.${b.menit}`;
}

const angka = new Intl.NumberFormat("id-ID");

/** 1234 → "1.234" */
export function formatAngka(n: number): string {
  return angka.format(n);
}

/** 0.875 → "87,5%" */
export function formatPersen(rasio: number, digit = 1): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: digit,
  }).format(rasio);
}

/** Durasi dalam jam → "3 jam 15 menit" / "2,8 hari" */
export function formatDurasi(jam: number): string {
  if (jam < 1) return `${Math.max(1, Math.round(jam * 60))} menit`;
  if (jam < 24) {
    const j = Math.floor(jam);
    const m = Math.round((jam - j) * 60);
    return m > 0 ? `${j} jam ${m} menit` : `${j} jam`;
  }
  const hari = jam / 24;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(hari)} hari`;
}
