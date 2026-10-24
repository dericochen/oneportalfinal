/**
 * Data master ONE PORTAL (idempoten). Dipakai oleh `npm run db:seed` (Supabase)
 * dan `npm run db:uji` (PGlite lokal).
 *
 * Sumber:
 * - Kecamatan & kelurahan: data kode wilayah Kemendagri via wilayah.id
 *   (data/wilayah-raw.json, pembaruan 2025-07-04). Nama ditulis persis seperti
 *   sumber, termasuk singkatan (mis. "Tegal S Mandala II").
 * - Batas kota & kecamatan: OpenStreetMap via Nominatim (data/batas-osm.geojson),
 *   © kontributor OpenStreetMap, lisensi ODbL.
 * - Instansi: SIMULASI. Tim wajib mencocokkan dengan SOTK terbaru Pemko Medan.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AKUN_DEMO } from "../../src/lib/demo.ts";

const AKAR = join(import.meta.dirname, "..", "..");

type Kecamatan = { code: string; name: string; villages: Array<{ code: string; name: string }> };
type Fitur = { properties: { osm_id: number; name: string }; geometry: unknown };

export function bacaWilayah(): Kecamatan[] {
  const teks = readFileSync(join(AKAR, "data", "wilayah-raw.json"), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(teks) as Kecamatan[];
}

function bacaBatas(): Fitur[] {
  const teks = readFileSync(join(AKAR, "data", "batas-osm.geojson"), "utf8").replace(/^\uFEFF/, "");
  return (JSON.parse(teks) as { features: Fitur[] }).features;
}

/** Literal SQL aman (kutip tunggal digandakan). */
export const q = (v: string | number | boolean | null | undefined): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${v.replace(/'/g, "''")}'`;
};

// PostGIS berada di skema `extensions` (bawaan Supabase), jadi nama fungsi dikualifikasi.
const geom = (g: unknown) =>
  `extensions.ST_Multi(extensions.ST_CollectionExtract(extensions.ST_MakeValid(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(${q(JSON.stringify(g))}::text), 4326)), 3))`;

export type Instansi = {
  slug: string;
  name: string;
  short_name: string;
  kind: "INTERNAL" | "EXTERNAL";
  description: string;
  contact_phone?: string | null;
  website?: string | null;
};

// SIMULASI: tim mencocokkan nama dan tugas dengan SOTK terbaru Pemko Medan.
export const INSTANSI: Instansi[] = [
  {
    slug: "dinas-sdabmbk",
    name: "Dinas Sumber Daya Air, Bina Marga dan Bina Konstruksi",
    short_name: "Dinas SDABMBK",
    kind: "INTERNAL",
    description: "Jalan kota, jembatan, dan drainase.",
  },
  { slug: "dlh", name: "Dinas Lingkungan Hidup", short_name: "DLH", kind: "INTERNAL", description: "Sampah dan kebersihan kota." },
  {
    slug: "dinas-perkimtaru",
    name: "Dinas Perumahan, Kawasan Permukiman, Cipta Karya dan Tata Ruang",
    short_name: "Dinas Perkimtaru",
    kind: "INTERNAL",
    description: "Lampu jalan, taman, dan fasilitas umum. Kewenangan lampu jalan perlu dicek tim.",
  },
  { slug: "dishub", name: "Dinas Perhubungan", short_name: "Dishub", kind: "INTERNAL", description: "Lalu lintas, rambu, dan parkir." },
  { slug: "dinkes", name: "Dinas Kesehatan", short_name: "Dinkes", kind: "INTERNAL", description: "Puskesmas dan layanan kesehatan." },
  {
    slug: "disdukcapil",
    name: "Dinas Kependudukan dan Pencatatan Sipil",
    short_name: "Disdukcapil",
    kind: "INTERNAL",
    description: "KTP-el, kartu keluarga, akta, dan dokumen kependudukan.",
  },
  {
    slug: "dpmptsp",
    name: "Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu",
    short_name: "DPMPTSP",
    kind: "INTERNAL",
    description: "Perizinan dan nonperizinan.",
  },
  { slug: "dinsos", name: "Dinas Sosial", short_name: "Dinsos", kind: "INTERNAL", description: "Bantuan sosial dan perlindungan sosial." },
  { slug: "disdik", name: "Dinas Pendidikan", short_name: "Disdik", kind: "INTERNAL", description: "Sekolah dan layanan pendidikan." },
  {
    slug: "bpbd",
    name: "Badan Penanggulangan Bencana Daerah",
    short_name: "BPBD",
    kind: "INTERNAL",
    description: "Pohon tumbang, banjir, dan keadaan darurat bencana.",
  },
  // Eksternal: tujuan status Diteruskan. Kontak dikosongkan bila belum diverifikasi tim.
  {
    slug: "perumda-tirtanadi",
    name: "Perumda Tirtanadi (BUMD Pemprov Sumatera Utara)",
    short_name: "Perumda Tirtanadi",
    kind: "EXTERNAL",
    description: "Air bersih perpipaan di Kota Medan. Kontak resmi perlu diisi tim.",
  },
  {
    slug: "pln",
    name: "PT PLN (Persero)",
    short_name: "PLN",
    kind: "EXTERNAL",
    description: "Gangguan listrik dan jaringan PLN. Kontak resmi perlu dicek tim.",
  },
  {
    slug: "balai-jalan-nasional",
    name: "Balai jalan nasional wilayah Sumatera Utara (Kementerian PU)",
    short_name: "Balai jalan nasional",
    kind: "EXTERNAL",
    description: "Jalan berstatus jalan nasional. Nama unit dan kontak perlu dicek tim.",
  },
];

export const KATEGORI: Array<{
  slug: string;
  name: string;
  description: string;
  default_agency: string | null;
  forward_agency?: string;
}> = [
  { slug: "jalan-rusak", name: "Jalan rusak", description: "Jalan berlubang, retak, amblas, atau jembatan rusak.", default_agency: "dinas-sdabmbk" },
  {
    slug: "drainase-banjir",
    name: "Drainase dan genangan/banjir",
    description: "Parit tersumbat, saluran meluap, dan genangan setelah hujan.",
    default_agency: "dinas-sdabmbk",
  },
  { slug: "sampah", name: "Sampah", description: "Tumpukan sampah, sampah tidak diangkut, atau TPS penuh.", default_agency: "dlh" },
  { slug: "lampu-jalan", name: "Lampu jalan mati", description: "Lampu penerangan jalan mati, berkedip, atau tiangnya rusak.", default_agency: "dinas-perkimtaru" },
  {
    slug: "air-bersih",
    name: "Air bersih",
    description: "Air PDAM mati, keruh, atau pipa bocor. Umumnya diteruskan ke Perumda Tirtanadi.",
    default_agency: null,
    forward_agency: "perumda-tirtanadi",
  },
  {
    slug: "fasilitas-umum",
    name: "Fasilitas umum dan taman",
    description: "Taman, trotoar, halte, toilet umum, dan fasilitas kota lain yang rusak.",
    default_agency: "dinas-perkimtaru",
  },
  { slug: "lalu-lintas", name: "Lalu lintas dan parkir", description: "Lampu lalu lintas, rambu, marka, dan parkir liar.", default_agency: "dishub" },
  { slug: "pohon-bencana", name: "Pohon tumbang dan bencana", description: "Pohon tumbang, rawan tumbang, atau kejadian bencana lain.", default_agency: "bpbd" },
  {
    slug: "pelayanan-publik",
    name: "Pelayanan publik",
    description: "Kendala saat mengurus layanan di kantor pemerintahan.",
    default_agency: null,
  },
  { slug: "lainnya", name: "Lainnya", description: "Masalah kota yang tidak masuk kategori lain.", default_agency: null },
];

/** Target SLA default (jam): Darurat 24, Tinggi 72, Sedang 7 hari, Rendah 14 hari. */
export const SLA_DEFAULT = { EMERGENCY: 24, HIGH: 72, MEDIUM: 168, LOW: 336 } as const;

export const KATEGORI_LAYANAN = [
  ["kependudukan", "Kependudukan"],
  ["kesehatan", "Kesehatan"],
  ["pendidikan", "Pendidikan"],
  ["transportasi", "Transportasi"],
  ["lingkungan", "Lingkungan"],
  ["perizinan", "Perizinan"],
  ["bantuan-sosial", "Bantuan sosial"],
  ["fasilitas-umum", "Fasilitas umum"],
] as const;

export const PENGATURAN_SITUS: Record<string, { value: unknown; description: string }> = {
  "beranda.kalimat_pembuka": {
    value: "Laporkan jalan rusak, sampah, atau lampu jalan mati. Anda akan dikabari sampai selesai.",
    description: "Kalimat pembuka di blok tugas beranda.",
  },
  "kontak.email": { value: "", description: "Email kontak pengelola prototipe (diisi tim)." },
  "kontak.telepon": { value: "", description: "Telepon kontak pengelola prototipe (diisi tim)." },
  "darurat.nomor": { value: "112", description: "Nomor panggilan darurat yang tampil di footer." },
  "footer.disclaimer": {
    value:
      "Prototipe untuk Lomba Web Development IT Fest UMK 2026, bukan kanal resmi Pemerintah Kota Medan. Keadaan darurat: hubungi 112.",
    description: "Teks disclaimer di footer semua halaman.",
  },
};

// Filter kata kasar sederhana: hanya menandai laporan untuk ditinjau admin.
export const KATA_DIFILTER = ["bangsat", "bajingan", "keparat", "kampret", "goblok", "tolol", "brengsek"];

export function buatSqlMaster(): string {
  const wilayah = bacaWilayah();
  const batas = bacaBatas();
  const kota = batas.find((f) => f.properties.osm_id === 8484616);
  const out: string[] = ["-- Dibuat oleh scripts/lib/master.mts"];

  if (kota) {
    out.push(
      `insert into public.city_boundaries (id, name, osm_relation_id, boundary) values (1, 'Kota Medan', 8484616, ${geom(kota.geometry)})
on conflict (id) do update set name = excluded.name, osm_relation_id = excluded.osm_relation_id, boundary = excluded.boundary;`,
    );
  }

  for (const k of wilayah) {
    const f = batas.find((b) => b.properties.name === k.name && b.properties.osm_id !== 8484616);
    const g = f ? geom(f.geometry) : "null";
    out.push(
      `insert into public.districts (code, name, boundary, center, osm_relation_id) values (${q(k.code)}, ${q(k.name)}, ${g}, ${
        f ? `extensions.ST_PointOnSurface(${g})::extensions.geography` : "null"
      }, ${q(f?.properties.osm_id ?? null)})
on conflict (code) do update set name = excluded.name, boundary = excluded.boundary, center = excluded.center, osm_relation_id = excluded.osm_relation_id;`,
    );
    const nilai = k.villages.map((v) => `(${q(v.code)}, ${q(k.code)}, ${q(v.name)})`).join(",\n  ");
    out.push(
      `insert into public.villages (code, district_code, name) values\n  ${nilai}
on conflict (code) do update set district_code = excluded.district_code, name = excluded.name;`,
    );
  }

  const nilaiInstansi = INSTANSI.map(
    (i) =>
      `(${q(i.slug)}, ${q(i.name)}, ${q(i.short_name)}, ${q(i.kind)}::public.agency_kind, ${q(i.description)}, ${q(i.contact_phone ?? null)}, ${q(i.website ?? null)})`,
  ).join(",\n  ");
  out.push(
    `insert into public.agencies (slug, name, short_name, kind, description, contact_phone, website) values\n  ${nilaiInstansi}
on conflict (slug) do update set name = excluded.name, short_name = excluded.short_name, kind = excluded.kind, description = excluded.description;`,
  );

  KATEGORI.forEach((k, i) => {
    const agen = k.default_agency ? `(select id from public.agencies where slug = ${q(k.default_agency)})` : "null";
    const teruskan = k.forward_agency ? `(select id from public.agencies where slug = ${q(k.forward_agency)})` : "null";
    out.push(
      `insert into public.report_categories (slug, name, description, icon, default_agency_id, suggest_forward_agency_id, sort_order)
values (${q(k.slug)}, ${q(k.name)}, ${q(k.description)}, ${q(k.slug)}, ${agen}, ${teruskan}, ${(i + 1) * 10})
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon,
  default_agency_id = excluded.default_agency_id, suggest_forward_agency_id = excluded.suggest_forward_agency_id, sort_order = excluded.sort_order;`,
    );
  });

  // Matriks SLA: hanya mengisi sel yang belum ada (perubahan admin tidak ditimpa).
  for (const [prioritas, jam] of Object.entries(SLA_DEFAULT)) {
    out.push(
      `insert into public.sla_policies (category_id, priority, target_hours)
select id, ${q(prioritas)}::public.report_priority, ${jam} from public.report_categories
on conflict (category_id, priority) do nothing;`,
    );
  }

  const nilaiKL = KATEGORI_LAYANAN.map(([slug, nama], i) => `(${q(slug)}, ${q(nama)}, ${(i + 1) * 10})`).join(", ");
  out.push(
    `insert into public.service_categories (slug, name, sort_order) values ${nilaiKL}
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;`,
  );

  for (const [key, s] of Object.entries(PENGATURAN_SITUS)) {
    out.push(
      `insert into public.site_settings (key, value, description) values (${q(key)}, ${q(JSON.stringify(s.value))}::jsonb, ${q(s.description)})
on conflict (key) do nothing;`,
    );
  }

  out.push(
    `insert into public.blocked_words (word) values ${KATA_DIFILTER.map((w) => `(${q(w)})`).join(", ")} on conflict do nothing;`,
  );

  return out.join("\n\n");
}

/** Empat akun demo untuk juri: satu sumber dengan halaman masuk (src/lib/demo.ts). */
export { AKUN_DEMO, KATA_SANDI_DEMO } from "../../src/lib/demo.ts";

/** SQL untuk menetapkan peran akun demo setelah akun auth dibuat. */
export function buatSqlPeranDemo(): string {
  return AKUN_DEMO.map(
    (a) =>
      `update public.profiles p set full_name = ${q(a.full_name)}, role = ${q(a.role)}::public.user_role,
  agency_id = ${a.agency ? `(select id from public.agencies where slug = ${q(a.agency)})` : "null"}, is_active = true, is_demo = true
from auth.users u where u.id = p.id and u.email = ${q(a.email)};`,
  ).join("\n");
}
