import "server-only";
import { hitungStatusSla, type Prioritas, type StatusLaporan, type StatusSla } from "@/lib/domain/laporan";
import { tandatanganiFoto } from "@/lib/media";
import { buatKlienServer } from "@/lib/supabase/server";

/** Data area staf (admin & supervisor). Semua lewat RLS pengguna yang masuk. */

const satu = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type Dasbor = {
  hari: number;
  ringkas: {
    masuk: number;
    masuk_lalu: number;
    menunggu_verifikasi: number;
    diproses: number;
    peninjauan_bukti: number;
    selesai: number;
    selesai_lalu: number;
    terlambat: number;
    rata_jam: number | null;
    persen_tepat: number | null;
    berulang: number;
    masuk_valid: number;
    masuk_selesai: number;
  };
  tren: Array<{ tanggal: string; masuk: number; selesai: number }>;
  kecamatan: Array<{ kode: string; nama: string; jumlah: number; selesai: number; terlambat: number }>;
  kategori: Array<{ slug: string; nama: string; jumlah: number }>;
  status: Partial<Record<StatusLaporan, number>>;
  instansi: Array<{
    id: string;
    nama: string;
    jumlah: number;
    selesai: number;
    persen_selesai: number | null;
    persen_tepat: number | null;
    rata_jam: number | null;
    berulang: number;
    terlambat: number;
  }>;
};

export async function ambilDasbor(f: { hari?: number; kecamatan?: string; kategori?: string; instansi?: string } = {}) {
  const supabase = await buatKlienServer();
  const { data, error } = await supabase.rpc("staff_dashboard", {
    p_days: f.hari ?? 30,
    p_district: f.kecamatan || null,
    p_category: f.kategori || null,
    p_agency: f.instansi || null,
  });
  if (error) {
    console.error("staff_dashboard", error);
    return null;
  }
  return data as Dasbor;
}

export type TitikStaf = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  kategoriSlug: string;
  lat: number;
  lng: number;
  thumbSesudah: string | null;
};

/** Semua titik untuk peta staf (termasuk Diterima & Rahasia). */
export async function ambilTitikStaf(): Promise<TitikStaf[]> {
  const supabase = await buatKlienServer();
  const { data } = await supabase
    .from("reports")
    .select("id, code, title, status, lat, lng, report_categories:category_id (slug)")
    .is("deleted_at", null)
    .not("status", "in", "(REJECTED,MERGED)")
    .order("submitted_at", { ascending: false })
    .limit(3000);
  const baris = data ?? [];
  const selesai = baris.filter((b) => b.status === "RESOLVED").map((b) => b.id);
  const thumbs = new Map<string, string>();
  if (selesai.length) {
    const { data: media } = await supabase
      .from("report_media")
      .select("report_id, thumb_path, storage_path")
      .eq("kind", "AFTER")
      .in("report_id", selesai.slice(0, 1000));
    const url = await tandatanganiFoto((media ?? []).map((m) => m.thumb_path ?? m.storage_path));
    for (const m of media ?? []) {
      const u = url.get(m.thumb_path ?? m.storage_path);
      if (u && !thumbs.has(m.report_id)) thumbs.set(m.report_id, u);
    }
  }
  return baris.map((b) => ({
    id: b.id,
    kode: b.code,
    judul: b.title,
    status: b.status as StatusLaporan,
    kategoriSlug: satu(b.report_categories as unknown as { slug: string } | null)?.slug ?? "lainnya",
    lat: b.lat,
    lng: b.lng,
    thumbSesudah: thumbs.get(b.id) ?? null,
  }));
}

export type BarisLaporan = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  prioritas: Prioritas | null;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  instansi: string | null;
  petugas: string | null;
  masukPada: string;
  tenggat: string | null;
  sla: StatusSla | null;
  kanal: string;
  rahasia: boolean;
  ditandai: boolean;
  berulang: boolean;
  perluTindakan: boolean;
};

const KOLOM_DAFTAR = `id, code, title, status, priority, submitted_at, due_at, verified_at, sla_stopped_at, proof_submitted_at,
  channel, is_confidential, flagged, previous_report_id, needs_action,
  report_categories:category_id (slug, name), districts:district_code (name), agencies:agency_id (short_name),
  assignee:assignee_id (full_name)`;

function petakanBaris(r: Record<string, unknown>): BarisLaporan {
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
    instansi: satu(r.agencies as { short_name: string } | null)?.short_name ?? null,
    petugas: satu(r.assignee as { full_name: string } | null)?.full_name ?? null,
    masukPada: r.submitted_at as string,
    tenggat: (r.due_at as string) ?? null,
    sla: hitungStatusSla({
      status: r.status as StatusLaporan,
      verifiedAt: r.verified_at as string | null,
      dueAt: r.due_at as string | null,
      slaStoppedAt: r.sla_stopped_at as string | null,
    }),
    kanal: r.channel as string,
    rahasia: Boolean(r.is_confidential),
    ditandai: Boolean(r.flagged),
    berulang: Boolean(r.previous_report_id),
    perluTindakan: Boolean(r.needs_action),
  };
}

export const ANTREAN = {
  semua: { label: "Semua", status: null },
  verifikasi: { label: "Perlu verifikasi", status: ["SUBMITTED"] },
  tugaskan: { label: "Perlu ditugaskan", status: ["VERIFIED"] },
  dikerjakan: { label: "Dikerjakan", status: ["ASSIGNED", "IN_PROGRESS"] },
  bukti: { label: "Tinjau bukti", status: ["UNDER_REVIEW"] },
  selesai: { label: "Selesai", status: ["RESOLVED"] },
  lainnya: { label: "Ditolak/diteruskan", status: ["REJECTED", "FORWARDED", "MERGED"] },
  terhapus: { label: "Terhapus", status: null },
} as const;
export type KunciAntrean = keyof typeof ANTREAN;

export const PER_HALAMAN = 25;

export async function daftarLaporan(f: { antrean?: string; cari?: string; kecamatan?: string; kategori?: string; halaman?: number }) {
  const supabase = await buatKlienServer();
  const terhapus = f.antrean === "terhapus";
  const antrean = terhapus ? ANTREAN.semua : (ANTREAN[(f.antrean as KunciAntrean) ?? "semua"] ?? ANTREAN.semua);
  const halaman = Math.max(1, f.halaman ?? 1);
  let q = supabase.from("reports").select(KOLOM_DAFTAR, { count: "exact" });
  q = terhapus ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  if (antrean.status) q = q.in("status", [...antrean.status]);
  if (f.kecamatan) q = q.eq("district_code", f.kecamatan);
  if (f.kategori) q = q.eq("category_id", f.kategori);
  const cari = f.cari?.trim().replace(/[%,()]/g, " ");
  if (cari) q = /^OP-/i.test(cari) ? q.ilike("code", `${cari.toUpperCase()}%`) : q.ilike("title", `%${cari}%`);
  // Antrean: bukti dikembalikan & prioritas lebih dulu, lalu tenggat terdekat; selain itu terbaru dulu.
  q = antrean.status && antrean.status[0] !== "RESOLVED"
    ? q.order("priority", { ascending: true, nullsFirst: false }).order("due_at", { ascending: true, nullsFirst: false }).order("submitted_at")
    : q.order("submitted_at", { ascending: false });
  const { data, count, error } = await q.range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);
  if (error) {
    console.error("daftarLaporan", error);
    return null;
  }
  return { baris: (data ?? []).map(petakanBaris), total: count ?? 0, halaman };
}

export async function hitungAntrean() {
  const supabase = await buatKlienServer();
  const hitung = (s: string[]) =>
    supabase.from("reports").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", s);
  const [v, b] = await Promise.all([hitung(["SUBMITTED"]), hitung(["UNDER_REVIEW"])]);
  return { verifikasi: v.count ?? 0, bukti: b.count ?? 0 };
}

/** Daftar "Perlu perhatian": aktif, urut prioritas lalu tenggat. */
export async function ambilPerluPerhatian(batas = 8) {
  const supabase = await buatKlienServer();
  const { data } = await supabase
    .from("reports")
    .select(KOLOM_DAFTAR)
    .is("deleted_at", null)
    .in("status", ["SUBMITTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"])
    .order("priority", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(60);
  const baris = (data ?? []).map(petakanBaris);
  const urut = (b: BarisLaporan) => (b.sla === "TERLAMBAT" ? 0 : b.status === "SUBMITTED" ? 1 : b.status === "UNDER_REVIEW" ? 2 : 3);
  return baris.sort((a, b) => urut(a) - urut(b)).slice(0, batas);
}

export type ButirDokumentasi = {
  id: string;
  laporanId: string;
  kode: string;
  judul: string;
  jenis: string;
  judulKejadian: string;
  catatan: string | null;
  aktor: string;
  waktu: string;
  foto: Array<{ url: string; jenis: string }>;
};

/** Dokumentasi perbaikan terbaru: progres petugas, bukti dikirim, bukti disetujui, beserta fotonya. */
export async function ambilDokumentasi(batas = 12): Promise<ButirDokumentasi[]> {
  const supabase = await buatKlienServer();
  const { data: ev } = await supabase
    .from("report_events")
    .select("id, report_id, type, title, note, actor_label, created_at, reports:report_id (code, title)")
    .in("type", ["PROGRESS", "PROOF_SUBMITTED", "PROOF_APPROVED", "SUBMITTED"])
    .order("created_at", { ascending: false })
    .limit(batas);
  const kejadian = ev ?? [];
  const idEvent = kejadian.map((e) => e.id);
  const { data: media } = idEvent.length
    ? await supabase.from("report_media").select("event_id, kind, thumb_path, storage_path").in("event_id", idEvent)
    : { data: [] };
  const url = await tandatanganiFoto((media ?? []).map((m) => m.thumb_path ?? m.storage_path));
  return kejadian.map((e) => {
    const r = satu(e.reports as unknown as { code: string; title: string } | null);
    return {
      id: String(e.id),
      laporanId: e.report_id,
      kode: r?.code ?? "",
      judul: r?.title ?? "",
      jenis: e.type,
      judulKejadian: e.title,
      catatan: e.note,
      aktor: e.actor_label,
      waktu: e.created_at,
      foto: (media ?? [])
        .filter((m) => m.event_id === e.id)
        .map((m) => ({ url: url.get(m.thumb_path ?? m.storage_path) ?? "", jenis: m.kind }))
        .filter((m) => m.url),
    };
  });
}

/** Detail lengkap laporan untuk staf (admin/supervisor). */
export async function ambilDetailLaporan(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await buatKlienServer();
  const { data: r, error } = await supabase
    .from("reports")
    .select(`*, report_categories:category_id (id, slug, name, default_agency_id, suggest_forward_agency_id),
      districts:district_code (name), villages:village_code (name), agencies:agency_id (id, name, short_name),
      forward:forward_agency_id (name), assignee:assignee_id (id, full_name),
      reporter:reporter_id (full_name, phone),
      parent:parent_id (code), previous:previous_report_id (code, resolved_at)`)
    .eq("id", id)
    .maybeSingle();
  if (error || !r) return null;

  const [ev, med, bukti] = await Promise.all([
    supabase.from("report_events").select("id, type, to_status, actor_label, title, note, is_internal, created_at").eq("report_id", id).order("created_at", { ascending: false }),
    supabase.from("report_media").select("id, kind, storage_path, thumb_path, is_hidden, proof_id, created_at").eq("report_id", id).order("created_at"),
    supabase.from("completion_proofs").select("id, description, work_date, status, submitted_at, review_note").eq("report_id", id).order("submitted_at", { ascending: false }),
  ]);
  const media = med.data ?? [];
  const url = await tandatanganiFoto(media.flatMap((m) => [m.storage_path, m.thumb_path]));

  return {
    r,
    kategori: satu(r.report_categories as { id: string; slug: string; name: string; default_agency_id: string | null; suggest_forward_agency_id: string | null } | null),
    kecamatan: satu(r.districts as { name: string } | null)?.name ?? "",
    kelurahan: satu(r.villages as { name: string } | null)?.name ?? "",
    instansi: satu(r.agencies as { id: string; name: string; short_name: string } | null),
    tujuanTeruskan: satu(r.forward as { name: string } | null)?.name ?? null,
    petugas: satu(r.assignee as { id: string; full_name: string } | null),
    pelapor: satu(r.reporter as { full_name: string; phone: string | null } | null),
    kodeInduk: satu(r.parent as { code: string } | null)?.code ?? null,
    sebelumnya: satu(r.previous as { code: string; resolved_at: string | null } | null),
    sla: hitungStatusSla({ status: r.status, verifiedAt: r.verified_at, dueAt: r.due_at, slaStoppedAt: r.sla_stopped_at }),
    riwayat: (ev.data ?? []).map((e) => ({
      id: String(e.id),
      waktu: e.created_at,
      judul: e.title,
      keterangan: e.note ?? undefined,
      aktor: e.actor_label,
      status: (e.to_status as StatusLaporan) ?? undefined,
      internal: e.is_internal,
    })),
    media: media.map((m) => ({
      id: m.id,
      jenis: m.kind as "INITIAL" | "PROGRESS" | "BEFORE" | "AFTER" | "SUPPORTING",
      url: url.get(m.storage_path) ?? "",
      thumb: url.get(m.thumb_path ?? m.storage_path) ?? url.get(m.storage_path) ?? "",
      tersembunyi: m.is_hidden,
      buktiId: m.proof_id,
    })),
    bukti: bukti.data ?? [],
  };
}

/** Pilihan untuk panel aksi admin: kategori, instansi internal/eksternal, petugas aktif + beban tugas. */
export async function ambilOpsiAksi() {
  const supabase = await buatKlienServer();
  const [kat, ag, pet, beban] = await Promise.all([
    supabase.from("report_categories").select("id, name, default_agency_id").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    supabase.from("agencies").select("id, name, short_name, kind").eq("is_active", true).is("deleted_at", null).order("name"),
    supabase.from("profiles").select("id, full_name, agency_id").eq("role", "OFFICER").eq("is_active", true).is("deleted_at", null).order("full_name"),
    supabase.from("reports").select("assignee_id").in("status", ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"]).is("deleted_at", null).not("assignee_id", "is", null),
  ]);
  const hitung = new Map<string, number>();
  for (const b of beban.data ?? []) hitung.set(b.assignee_id!, (hitung.get(b.assignee_id!) ?? 0) + 1);
  return {
    kategori: (kat.data ?? []).map((k) => ({ id: k.id, nama: k.name, instansiBawaan: k.default_agency_id })),
    instansiInternal: (ag.data ?? []).filter((a) => a.kind === "INTERNAL").map((a) => ({ id: a.id, nama: a.short_name })),
    instansiEksternal: (ag.data ?? []).filter((a) => a.kind === "EXTERNAL").map((a) => ({ id: a.id, nama: a.name })),
    petugas: (pet.data ?? []).map((p) => ({ id: p.id, nama: p.full_name, instansi: p.agency_id, tugasAktif: hitung.get(p.id) ?? 0 })),
  };
}
