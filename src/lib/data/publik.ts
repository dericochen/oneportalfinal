import "server-only";
import { cache } from "react";
import type { StatusLaporan, StatusSla } from "@/lib/domain/laporan";
import { supabaseTerkonfigurasi } from "@/lib/env";
import { tandatanganiFoto } from "@/lib/media";
import { buatKlienServer } from "@/lib/supabase/server";

/** Data publik tanpa identitas, lewat fungsi database public_* (lihat migrasi 5). */

export type TitikPeta = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  statusLabel: string;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  lat: number;
  lng: number;
  masukPada: string;
  selesaiPada: string | null;
  thumbSesudah: string | null;
};

export async function ambilTitikPeta(filter: { hari?: number; kecamatan?: string; kategori?: string; status?: string } = {}) {
  if (!supabaseTerkonfigurasi) return null;
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("public_map_points", {
    p_days: filter.hari ?? null,
    p_district: filter.kecamatan ?? null,
    p_category: filter.kategori ?? null,
    p_status: filter.status ?? null,
  });
  if (error) {
    console.error("public_map_points", error);
    return null;
  }
  const baris = (data ?? []) as Array<Record<string, unknown>>;
  const url = await tandatanganiFoto(baris.map((b) => b.after_thumb as string | null));
  return baris.map<TitikPeta>((b) => ({
    id: b.id as string,
    kode: b.code as string,
    judul: b.title as string,
    status: b.status as StatusLaporan,
    statusLabel: b.status_label as string,
    kategoriSlug: b.category_slug as string,
    kategoriNama: b.category_name as string,
    kecamatan: b.district_name as string,
    lat: b.lat as number,
    lng: b.lng as number,
    masukPada: b.submitted_at as string,
    selesaiPada: (b.resolved_at as string) ?? null,
    thumbSesudah: b.after_thumb ? (url.get(b.after_thumb as string) ?? null) : null,
  }));
}

export type StatistikPublik = {
  hari: number;
  masuk: number;
  selesai: number;
  diproses: number;
  diteruskan: number;
  rataJamSelesai: number | null;
  persenTepatWaktu: number | null;
  kecamatanTerbanyak: string | null;
  selesai7Hari: number;
  masuk7Hari: number;
};

export const ambilStatistikPublik = cache(async (hari = 30): Promise<StatistikPublik | null> => {
  if (!supabaseTerkonfigurasi) return null;
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("public_report_stats", { p_days: hari });
  if (error || !data) return null;
  const d = data as Record<string, number | string | null>;
  return {
    hari: Number(d.hari),
    masuk: Number(d.masuk ?? 0),
    selesai: Number(d.selesai ?? 0),
    diproses: Number(d.diproses ?? 0),
    diteruskan: Number(d.diteruskan ?? 0),
    rataJamSelesai: d.rata_jam_selesai === null ? null : Number(d.rata_jam_selesai),
    persenTepatWaktu: d.persen_tepat_waktu === null ? null : Number(d.persen_tepat_waktu),
    kecamatanTerbanyak: (d.kecamatan_terbanyak as string) ?? null,
    selesai7Hari: Number(d.selesai_7_hari ?? 0),
    masuk7Hari: Number(d.masuk_7_hari ?? 0),
  };
});

export type LaporanSelesai = {
  id: string;
  kode: string;
  judul: string;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  kelurahan: string;
  instansi: string | null;
  masukPada: string;
  selesaiPada: string;
  jamPengerjaan: number;
  fotoSebelum: string | null;
  fotoSesudah: string | null;
  keteranganBukti: string | null;
};

export async function ambilBaruSelesai(batas = 6): Promise<LaporanSelesai[] | null> {
  if (!supabaseTerkonfigurasi) return null;
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("public_recent_resolved", { p_limit: batas });
  if (error) {
    console.error("public_recent_resolved", error);
    return null;
  }
  const baris = (data ?? []) as Array<Record<string, unknown>>;
  const url = await tandatanganiFoto(baris.flatMap((b) => [b.before_path as string, b.after_path as string]));
  return baris.map((b) => ({
    id: b.id as string,
    kode: b.code as string,
    judul: b.title as string,
    kategoriSlug: b.category_slug as string,
    kategoriNama: b.category_name as string,
    kecamatan: b.district_name as string,
    kelurahan: b.village_name as string,
    instansi: (b.agency_name as string) ?? null,
    masukPada: b.submitted_at as string,
    selesaiPada: b.resolved_at as string,
    jamPengerjaan: Number(b.hours_to_resolve ?? 0),
    fotoSebelum: url.get(b.before_path as string) ?? null,
    fotoSesudah: url.get(b.after_path as string) ?? null,
    keteranganBukti: (b.proof_description as string) ?? null,
  }));
}

export type DataLacak = {
  id: string;
  kode: string;
  status: StatusLaporan;
  statusLabel: string;
  tampil: boolean;
  judul: string | null;
  deskripsi: string | null;
  alamat: string | null;
  lat: number | null;
  lng: number | null;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  kelurahan: string;
  prioritas: string | null;
  instansi: string | null;
  instansiSingkat: string | null;
  tenggat: string | null;
  sla: StatusSla | null;
  terdampak: number;
  waktu: Record<"masuk" | "diverifikasi" | "ditugaskan" | "mulai" | "bukti" | "selesai", string | null>;
  alasanTolak: string | null;
  diteruskan: { nama: string; telepon: string | null; situs: string | null; catatan: string | null } | null;
  kodeInduk: string | null;
  sebelumnya: { kode: string; selesaiPada: string | null } | null;
  bukti: { deskripsi: string; tanggalKerja: string } | null;
  foto: Array<{ jenis: "INITIAL" | "PROGRESS" | "BEFORE" | "AFTER"; url: string; thumb: string }>;
  riwayat: Array<{ id: string; waktu: string; judul: string; keterangan?: string; aktor: string; status?: StatusLaporan }>;
};

export async function ambilLacak(kode: string): Promise<DataLacak | null | "galat"> {
  if (!supabaseTerkonfigurasi) return "galat";
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("public_track", { p_code: kode });
  if (error) return "galat";
  if (!data) return null;
  const d = data as Record<string, unknown>;
  const media = (d.media as Array<{ kind: DataLacak["foto"][number]["jenis"]; path: string; thumb: string }>) ?? [];
  const url = await tandatanganiFoto(media.flatMap((m) => [m.path, m.thumb]));
  const fw = d.forward as Record<string, string | null> | null;
  const prev = d.previous as { code: string; resolved_at: string | null } | null;
  const proof = d.proof as { description: string; work_date: string } | null;
  return {
    id: d.id as string,
    kode: d.code as string,
    status: d.status as StatusLaporan,
    statusLabel: d.status_label as string,
    tampil: Boolean(d.tampil),
    judul: (d.title as string) ?? null,
    deskripsi: (d.description as string) ?? null,
    alamat: (d.address as string) ?? null,
    lat: (d.lat as number) ?? null,
    lng: (d.lng as number) ?? null,
    kategoriSlug: d.category_slug as string,
    kategoriNama: d.category_name as string,
    kecamatan: d.district_name as string,
    kelurahan: d.village_name as string,
    prioritas: (d.priority as string) ?? null,
    instansi: (d.agency_name as string) ?? null,
    instansiSingkat: (d.agency_short as string) ?? null,
    tenggat: (d.due_at as string) ?? null,
    sla: (d.sla as StatusSla) ?? null,
    terdampak: Number(d.affected_count ?? 1),
    waktu: {
      masuk: (d.submitted_at as string) ?? null,
      diverifikasi: (d.verified_at as string) ?? null,
      ditugaskan: (d.assigned_at as string) ?? null,
      mulai: (d.started_at as string) ?? null,
      bukti: (d.proof_submitted_at as string) ?? null,
      selesai: (d.resolved_at as string) ?? null,
    },
    alasanTolak: (d.reject_reason as string) ?? null,
    diteruskan: fw ? { nama: fw.name ?? "", telepon: fw.phone, situs: fw.website, catatan: fw.note } : null,
    kodeInduk: (d.parent_code as string) ?? null,
    sebelumnya: prev ? { kode: prev.code, selesaiPada: prev.resolved_at } : null,
    bukti: proof ? { deskripsi: proof.description, tanggalKerja: proof.work_date } : null,
    foto: media
      .map((m) => ({ jenis: m.kind, url: url.get(m.path) ?? "", thumb: url.get(m.thumb) ?? url.get(m.path) ?? "" }))
      .filter((m) => m.url),
    riwayat: ((d.events as Array<Record<string, unknown>>) ?? []).map((e) => ({
      id: String(e.id),
      waktu: e.at as string,
      judul: e.title as string,
      keterangan: (e.note as string) ?? undefined,
      aktor: e.actor as string,
      status: (e.to_status as StatusLaporan) ?? undefined,
    })),
  };
}
