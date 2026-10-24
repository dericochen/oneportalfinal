/**
 * Kosakata domain laporan. Kode (bahasa Inggris) sama dengan enum di database;
 * label (sentence case, Bahasa Indonesia) yang tampil di antarmuka.
 */

export const STATUS_LAPORAN = [
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
  "FORWARDED",
  "MERGED",
] as const;
export type StatusLaporan = (typeof STATUS_LAPORAN)[number];

export const LABEL_STATUS: Record<StatusLaporan, string> = {
  SUBMITTED: "Diterima",
  VERIFIED: "Diverifikasi",
  ASSIGNED: "Ditugaskan",
  IN_PROGRESS: "Dikerjakan",
  UNDER_REVIEW: "Peninjauan bukti",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
  FORWARDED: "Diteruskan",
  MERGED: "Digabungkan",
};

/** Kelompok warna status (DESIGN.md § Pemetaan status). */
export type KelompokStatus = "menunggu" | "dikerjakan" | "selesai" | "ditolak" | "dialihkan";

export const KELOMPOK_STATUS: Record<StatusLaporan, KelompokStatus> = {
  SUBMITTED: "menunggu",
  VERIFIED: "menunggu",
  ASSIGNED: "menunggu",
  IN_PROGRESS: "dikerjakan",
  UNDER_REVIEW: "dikerjakan",
  RESOLVED: "selesai",
  REJECTED: "ditolak",
  FORWARDED: "dialihkan",
  MERGED: "dialihkan",
};

/** Enam tahap bar progres di halaman lacak. */
export const TAHAP_LACAK: StatusLaporan[] = [
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "RESOLVED",
];

export const STATUS_FINAL: StatusLaporan[] = ["RESOLVED", "REJECTED", "FORWARDED", "MERGED"];

export const PRIORITAS = ["EMERGENCY", "HIGH", "MEDIUM", "LOW"] as const;
export type Prioritas = (typeof PRIORITAS)[number];

export const LABEL_PRIORITAS: Record<Prioritas, string> = {
  EMERGENCY: "Darurat",
  HIGH: "Tinggi",
  MEDIUM: "Sedang",
  LOW: "Rendah",
};

export const ALASAN_PRIORITAS = [
  "Membahayakan pengguna jalan",
  "Dekat sekolah/fasilitas kesehatan",
  "Berdampak banyak warga",
  "Rawan banjir",
] as const;

export type StatusSla =
  | "TEPAT_WAKTU"
  | "HAMPIR_JATUH_TEMPO"
  | "TERLAMBAT"
  | "SELESAI_TEPAT_WAKTU"
  | "SELESAI_TERLAMBAT";

export const LABEL_SLA: Record<StatusSla, string> = {
  TEPAT_WAKTU: "Tepat waktu",
  HAMPIR_JATUH_TEMPO: "Hampir jatuh tempo",
  TERLAMBAT: "Terlambat",
  SELESAI_TEPAT_WAKTU: "Selesai tepat waktu",
  SELESAI_TERLAMBAT: "Selesai terlambat",
};

/**
 * Status SLA dihitung saat dibaca (bukan disimpan).
 * - Belum selesai: Terlambat jika lewat tenggat; Hampir jatuh tempo jika sisa ≤25% durasi.
 * - Selesai: dibandingkan waktu bukti (yang akhirnya disetujui) dikirim terhadap tenggat.
 */
export function hitungStatusSla(p: {
  verifiedAt: string | Date | null;
  dueAt: string | Date | null;
  slaStoppedAt: string | Date | null;
  status: StatusLaporan;
  sekarang?: Date;
}): StatusSla | null {
  if (!p.dueAt || !p.verifiedAt) return null;
  if (p.status === "REJECTED" || p.status === "FORWARDED" || p.status === "MERGED") return null;
  const due = new Date(p.dueAt).getTime();
  const mulai = new Date(p.verifiedAt).getTime();
  if (p.status === "RESOLVED") {
    const berhenti = p.slaStoppedAt ? new Date(p.slaStoppedAt).getTime() : due;
    return berhenti <= due ? "SELESAI_TEPAT_WAKTU" : "SELESAI_TERLAMBAT";
  }
  const kini = (p.sekarang ?? new Date()).getTime();
  if (kini > due) return "TERLAMBAT";
  const durasi = Math.max(1, due - mulai);
  return (due - kini) / durasi <= 0.25 ? "HAMPIR_JATUH_TEMPO" : "TEPAT_WAKTU";
}

export const PERAN = ["CITIZEN", "ADMIN", "OFFICER", "SUPERVISOR"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  CITIZEN: "Warga",
  ADMIN: "Admin",
  OFFICER: "Petugas lapangan",
  SUPERVISOR: "Supervisor",
};

/** Halaman beranda tiap peran setelah masuk. */
export const BERANDA_PERAN: Record<Peran, string> = {
  CITIZEN: "/akun",
  ADMIN: "/admin",
  OFFICER: "/petugas",
  SUPERVISOR: "/supervisor",
};

export const POLA_KODE_LAPORAN = /^OP-\d{4}-\d{5}$/;
