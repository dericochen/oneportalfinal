import "server-only";
import { hitungStatusSla, type Prioritas, type StatusLaporan, type StatusSla } from "@/lib/domain/laporan";
import { buatKlienServer } from "@/lib/supabase/server";

/** Tugas petugas yang sedang masuk. RLS membatasi ke laporan yang ditugaskan kepadanya. */
export type TugasPetugas = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  prioritas: Prioritas | null;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  kelurahan: string;
  alamat: string;
  tenggat: string | null;
  perluTindakan: boolean;
  alasanKembali: string | null;
  sla: StatusSla | null;
};

const URUTAN_PRIORITAS: Record<Prioritas, number> = { EMERGENCY: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const satu = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const KOLOM = `id, code, title, status, priority, address, due_at, verified_at, sla_stopped_at, needs_action, return_reason,
  report_categories:category_id (slug, name), districts:district_code (name), villages:village_code (name)`;

function petakan(r: Record<string, unknown>): TugasPetugas {
  const kat = satu(r.report_categories as { slug: string; name: string } | null);
  return {
    id: r.id as string,
    kode: r.code as string,
    judul: r.title as string,
    status: r.status as StatusLaporan,
    prioritas: (r.priority as Prioritas) ?? null,
    kategoriSlug: kat?.slug ?? "lainnya",
    kategoriNama: kat?.name ?? "Lainnya",
    kecamatan: satu(r.districts as { name: string } | null)?.name ?? "",
    kelurahan: satu(r.villages as { name: string } | null)?.name ?? "",
    alamat: r.address as string,
    tenggat: (r.due_at as string) ?? null,
    perluTindakan: Boolean(r.needs_action),
    alasanKembali: (r.return_reason as string) ?? null,
    sla: hitungStatusSla({
      status: r.status as StatusLaporan,
      verifiedAt: r.verified_at as string | null,
      dueAt: r.due_at as string | null,
      slaStoppedAt: r.sla_stopped_at as string | null,
    }),
  };
}

/**
 * Urutan antrean petugas: bukti dikembalikan ("Perlu tindakan Anda") paling
 * atas, lalu prioritas (Darurat → Rendah), lalu yang terlambat, lalu tenggat terdekat.
 */
function urutkan(a: TugasPetugas, b: TugasPetugas) {
  if (a.perluTindakan !== b.perluTindakan) return a.perluTindakan ? -1 : 1;
  const pa = a.prioritas ? URUTAN_PRIORITAS[a.prioritas] : 9;
  const pb = b.prioritas ? URUTAN_PRIORITAS[b.prioritas] : 9;
  if (pa !== pb) return pa - pb;
  const ta = a.sla === "TERLAMBAT" ? 0 : 1;
  const tb = b.sla === "TERLAMBAT" ? 0 : 1;
  if (ta !== tb) return ta - tb;
  return (a.tenggat ? Date.parse(a.tenggat) : Infinity) - (b.tenggat ? Date.parse(b.tenggat) : Infinity);
}

/** Awal bulan berjalan dalam WIB (UTC+7, tanpa DST). */
function awalBulanWib(): string {
  const wib = new Date(Date.now() + 7 * 3600e3);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - 7 * 3600e3).toISOString();
}

export async function ambilTugasPetugas(idPetugas: string) {
  const supabase = await buatKlienServer();
  const [aktif, selesai] = await Promise.all([
    supabase
      .from("reports")
      .select(KOLOM)
      .eq("assignee_id", idPetugas)
      .in("status", ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"])
      .is("deleted_at", null)
      .limit(200),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", idPetugas)
      .eq("status", "RESOLVED")
      .gte("resolved_at", awalBulanWib()),
  ]);
  if (aktif.error || selesai.error) return null;
  const tugas = (aktif.data ?? []).map(petakan).sort(urutkan);
  return {
    tugas,
    ringkasan: {
      aktif: tugas.length,
      hampirJatuhTempo: tugas.filter((t) => t.sla === "HAMPIR_JATUH_TEMPO").length,
      terlambat: tugas.filter((t) => t.sla === "TERLAMBAT").length,
      selesaiBulanIni: selesai.count ?? 0,
    },
  };
}

/** Detail satu tugas. Null bila tidak ada ATAU bukan milik petugas ini (RLS) -> halaman 404. */
export async function ambilDetailTugas(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await buatKlienServer();
  const { data, error } = await supabase
    .from("reports")
    .select(`${KOLOM}, description, lat, lng, is_anonymous, reporter_phone, submitted_at,
      report_events (id, type, to_status, actor_label, title, note, is_internal, created_at)`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...petakan(data),
    deskripsi: data.description as string,
    lat: data.lat as number,
    lng: data.lng as number,
    anonim: data.is_anonymous as boolean,
    hpPelapor: data.is_anonymous ? null : ((data.reporter_phone as string) ?? null),
    masukPada: data.submitted_at as string,
    riwayat: ((data.report_events as Array<Record<string, unknown>>) ?? []).map((e) => ({
      id: String(e.id),
      waktu: e.created_at as string,
      judul: e.title as string,
      keterangan: (e.note as string) ?? undefined,
      aktor: e.actor_label as string,
      status: (e.to_status as StatusLaporan) ?? undefined,
      internal: e.is_internal as boolean,
    })),
  };
}
