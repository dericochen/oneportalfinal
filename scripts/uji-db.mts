/**
 * Uji migrasi database secara lokal tanpa Supabase/Docker: PGlite (Postgres 18
 * WASM) + PostGIS + stub auth/storage. Menjalankan semua migrasi, seed master,
 * lalu skenario alur status, transisi tidak sah, dan RLS.
 *
 *   npm run db:uji
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { postgis } from "@electric-sql/pglite-postgis";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buatSqlMaster, buatSqlPeranDemo } from "./lib/master.mts";

const AKAR = join(import.meta.dirname, "..");
const db = new PGlite({ extensions: { postgis, pgcrypto } });

let lulus = 0;
let gagal = 0;

function cek(nama: string, kondisi: boolean, info?: unknown) {
  if (kondisi) {
    lulus++;
    console.log(`  ok    ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama}`, info ?? "");
  }
}

async function harusGagal(nama: string, fn: () => Promise<unknown>, pola: RegExp) {
  try {
    await fn();
    cek(nama, false, "tidak ada error");
  } catch (e) {
    const pesan = (e as Error).message;
    cek(nama, pola.test(pesan), pesan);
  } finally {
    await db.exec("reset role");
  }
}

/** Jalankan query sebagai pengguna tertentu (meniru JWT Supabase). */
async function sebagai<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

async function transisi(uid: string, aksi: string, laporan: string | null, payload: Record<string, unknown> = {}) {
  const rows = await sebagai<{ r: { id: string; code: string; status: string; affected_count: number } }>(
    uid,
    `select public.transition_report($1, $2::uuid, $3::jsonb) as r`,
    [aksi, laporan, JSON.stringify(payload)],
  );
  return rows[0].r;
}

async function satu<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows[0];
}

// --- Siapkan basis data ------------------------------------------------------
console.log("Menyiapkan PGlite + stub Supabase…");
await db.exec(readFileSync(join(AKAR, "scripts", "lib", "stub-supabase.sql"), "utf8"));
const migrasi = readdirSync(join(AKAR, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of migrasi) {
  try {
    await db.exec(readFileSync(join(AKAR, "supabase", "migrations", f), "utf8"));
    console.log(`  migrasi ${f}`);
  } catch (e) {
    console.error(`Migrasi ${f} gagal:`, (e as Error).message);
    process.exit(1);
  }
}
await db.exec(buatSqlMaster());
await db.exec(buatSqlMaster()); // idempoten

console.log("\nData master");
const hitung = await satu<Record<string, number>>(`select
  (select count(*)::int from districts) kec, (select count(*)::int from villages) kel,
  (select count(*)::int from districts where boundary is not null) kec_batas,
  (select count(*)::int from agencies) instansi, (select count(*)::int from report_categories) kategori,
  (select count(*)::int from sla_policies) sla, (select count(*)::int from city_boundaries) kota,
  (select count(*)::int from service_categories) kat_layanan`);
cek("21 kecamatan", hitung.kec === 21, hitung);
cek("151 kelurahan", hitung.kel === 151, hitung);
cek("21 kecamatan punya batas OSM", hitung.kec_batas === 21, hitung);
cek("13 instansi, 10 kategori, 40 sel SLA, 8 kategori layanan", hitung.instansi === 13 && hitung.kategori === 10 && hitung.sla === 40 && hitung.kat_layanan === 8, hitung);
cek("batas Kota Medan ada", hitung.kota === 1);
const saran = await satu<{ district_name: string; inside_city: boolean }>(
  `select * from suggest_district(3.5702, 98.7215)`,
);
cek("titik pusat Medan Denai disarankan ke Medan Denai", saran?.district_name === "Medan Denai" && saran.inside_city, saran);
const luar = await satu<{ inside_city: boolean }>(`select * from suggest_district(-6.2, 106.8)`);
cek("titik Jakarta di luar kota", luar?.inside_city === false, luar);

// --- Pengguna ----------------------------------------------------------------
const id = {
  warga: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  petugas: "00000000-0000-4000-8000-000000000003",
  supervisor: "00000000-0000-4000-8000-000000000004",
  warga2: "00000000-0000-4000-8000-000000000005",
  petugasDlh: "00000000-0000-4000-8000-000000000006",
};
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${id.warga}', 'demo.warga@oneportal.test', '{"full_name":"Warga Demo","role":"ADMIN"}'),
  ('${id.admin}', 'demo.admin@oneportal.test', '{}'),
  ('${id.petugas}', 'demo.petugas@oneportal.test', '{}'),
  ('${id.supervisor}', 'demo.supervisor@oneportal.test', '{}'),
  ('${id.warga2}', 'warga2@oneportal.test', '{"full_name":"Warga Dua"}'),
  ('${id.petugasDlh}', 'petugas.dlh@oneportal.test', '{}')`);
console.log("\nAuth & profil");
const pWarga = await satu<{ role: string; full_name: string }>(`select role, full_name from profiles where id = $1`, [id.warga]);
cek("profil dibuat otomatis sebagai warga (metadata peran diabaikan)", pWarga.role === "CITIZEN" && pWarga.full_name === "Warga Demo", pWarga);
await db.exec(buatSqlPeranDemo());
await db.exec(buatSqlPeranDemo()); // idempoten
await db.exec(`update profiles set role = 'OFFICER', agency_id = (select id from agencies where slug = 'dlh') where id = '${id.petugasDlh}'`);
const peran = await db.query<{ email: string; role: string; is_demo: boolean }>(
  `select u.email, p.role, p.is_demo from profiles p join auth.users u on u.id = p.id order by u.email`,
);
cek("4 akun demo berperan benar", peran.rows.filter((r) => r.is_demo).map((r) => r.role).sort().join() === "ADMIN,CITIZEN,OFFICER,SUPERVISOR", peran.rows);

await harusGagal("akun demo tidak bisa diubah perannya", () => db.query(`update profiles set role = 'ADMIN' where id = $1`, [id.warga]), /Akun demo/);
await harusGagal("akun demo tidak bisa dinonaktifkan", () => db.query(`update profiles set is_active = false where id = $1`, [id.admin]), /Akun demo/);
await harusGagal("akun demo tidak bisa dihapus", () => db.query(`delete from auth.users where id = $1`, [id.petugas]), /Akun demo/);
await harusGagal("warga tidak bisa mengubah perannya sendiri", () => sebagai(id.warga2, `update profiles set role = 'ADMIN' where id = $1`, [id.warga2]), /permission denied/);
const ubahNama = await sebagai(id.warga2, `update profiles set full_name = 'Warga Kedua' where id = $1 returning full_name`, [id.warga2]);
cek("warga bisa mengubah namanya sendiri", ubahNama.length === 1);

// --- Media tiruan (seolah sudah diunggah ke Storage) --------------------------
let nFoto = 0;
async function foto(uid: string) {
  nFoto++;
  const path = `${uid}/foto-uji-${String(nFoto).padStart(4, "0")}.jpg`;
  await db.query(`insert into storage.objects (bucket_id, name, owner) values ('laporan', $1, $2)`, [path, uid]);
  return { path, thumb_path: `${uid}/foto-uji-${String(nFoto).padStart(4, "0")}-thumb.webp`, mime_type: "image/jpeg", size_bytes: 120000, width: 1600, height: 1200 };
}
const kat = Object.fromEntries(
  (await db.query<{ slug: string; id: string }>(`select slug, id from report_categories`)).rows.map((r) => [r.slug, r.id]),
);
const desaDenai = await satu<{ code: string; district_code: string }>(
  `select v.code, v.district_code from villages v join districts d on d.code = v.district_code where d.name = 'Medan Denai' and v.name = 'Denai'`,
);
const laporanDasar = async (uid: string, extra: Record<string, unknown> = {}) => ({
  title: "Jalan berlubang dalam di depan sekolah",
  description: "Lubang sedalam kira-kira 20 cm, sudah dua minggu. Banyak pengendara motor hampir jatuh saat hujan.",
  category_id: kat["jalan-rusak"],
  lat: 3.5702,
  lng: 98.7215,
  district_code: desaDenai.district_code,
  village_code: desaDenai.code,
  address: "Depan sekolah dasar, dekat simpang",
  consent: true,
  media: [await foto(uid)],
  ...extra,
});

// --- Alur emas ---------------------------------------------------------------
console.log("\nAlur emas: lapor sampai selesai");
const lapor = await transisi(id.warga, "submit", null, await laporanDasar(id.warga));
cek("submit menghasilkan kode OP-{tahun}-00001", /^OP-\d{4}-00001$/.test(lapor.code) && lapor.status === "SUBMITTED", lapor);

await harusGagal("warga tidak bisa memverifikasi", () => transisi(id.warga, "verify", lapor.id, { priority: "HIGH" }), /hanya dapat dilakukan admin/);
await harusGagal("admin tidak bisa menyetujui bukti laporan Diterima", () => transisi(id.admin, "approve_proof", lapor.id), /berstatus "Diterima" tidak dapat disetujui/);
await harusGagal("verifikasi wajib alasan prioritas", () => transisi(id.admin, "verify", lapor.id, { priority: "HIGH" }), /alasan prioritas/);

const terverifikasi = await transisi(id.admin, "verify", lapor.id, {
  priority: "HIGH",
  priority_reasons: ["Dekat sekolah/fasilitas kesehatan", "Membahayakan pengguna jalan"],
  assignee_id: id.petugas,
});
cek("verify + langsung tugaskan -> Ditugaskan", terverifikasi.status === "ASSIGNED", terverifikasi);
const sla = await satu<{ jam: number; due_ok: boolean; agency: string }>(
  `select r.sla_target_hours jam, abs(extract(epoch from r.due_at - (r.verified_at + interval '72 hours'))) < 1 due_ok, a.slug agency
   from reports r join agencies a on a.id = r.agency_id where r.id = $1`,
  [lapor.id],
);
cek("tenggat otomatis dari SLA (Tinggi = 72 jam) dan instansi default", sla.jam === 72 && sla.due_ok && sla.agency === "dinas-sdabmbk", sla);

console.log("\nRLS laporan");
cek("petugas melihat tugasnya", (await sebagai(id.petugas, `select id from reports`)).length === 1);
cek("petugas instansi lain tidak melihat tugas itu", (await sebagai(id.petugasDlh, `select id from reports`)).length === 0);
cek("warga lain tidak melihat laporan orang lain", (await sebagai(id.warga2, `select id from reports`)).length === 0);
cek("anon tidak membaca tabel laporan", (await sebagai(null, `select id from reports`)).length === 0);
cek("anon membaca kecamatan", (await sebagai(null, `select code from districts`)).length === 21);
cek("supervisor melihat semua laporan", (await sebagai(id.supervisor, `select id from reports`)).length === 1);
cek("petugas melihat kontak pelapor (tidak anonim)", (await sebagai(id.petugas, `select id from profiles where id = $1`, [id.warga])).length === 1);
await harusGagal("petugas instansi lain tidak bisa mulai mengerjakan", () => transisi(id.petugasDlh, "start", lapor.id), /Tugas tidak ditemukan/);
await harusGagal("klien tidak bisa mengubah laporan langsung", () => sebagai(id.admin, `update reports set status = 'RESOLVED' where id = $1`, [lapor.id]), /permission denied/);
await harusGagal("service role pun tidak bisa melewati fungsi transisi", () => db.query(`update reports set status = 'RESOLVED' where id = $1`, [lapor.id]), /fungsi transisi/);

await transisi(id.petugas, "start", lapor.id);
await harusGagal("petugas tidak punya aksi selesai", () => transisi(id.petugas, "approve_proof", lapor.id), /hanya dapat dilakukan admin/);
await harusGagal("bukti wajib foto sesudah", () =>
  transisi(id.petugas, "submit_proof", lapor.id, {
    description: "Lubang ditambal dengan aspal dingin seluas kira-kira dua meter persegi.",
    // Tanggal WIB (database membandingkan dengan tanggal laporan masuk dalam WIB).
    work_date: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10),
    declaration: true,
    before: [{ path: "x" }],
  }), /foto sesudah|foto sebelum|Berkas/);
await harusGagal("tanggal pengerjaan tidak boleh di masa depan", async () =>
  transisi(id.petugas, "submit_proof", lapor.id, {
    description: "Lubang ditambal dengan aspal dingin seluas kira-kira dua meter persegi.",
    work_date: "2099-01-01",
    declaration: true,
    before: [await foto(id.petugas)],
    after: [await foto(id.petugas)],
  }), /masa depan/);

const buktiPayload = async () => ({
  description: "Lubang ditambal dengan aspal dingin seluas kira-kira dua meter persegi.",
  work_date: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10),
  declaration: true,
  before: [await foto(id.petugas)],
  after: [await foto(id.petugas)],
});
await transisi(id.petugas, "add_progress", lapor.id, { note: "Material aspal sudah tiba di lokasi.", show_to_citizen: true });
await transisi(id.petugas, "add_progress", lapor.id, { note: "Catatan internal petugas.", show_to_citizen: false });
let st = await transisi(id.petugas, "submit_proof", lapor.id, await buktiPayload());
cek("kirim bukti -> Peninjauan bukti", st.status === "UNDER_REVIEW", st);
cek("warga belum melihat foto bukti sebelum disetujui",
  (await sebagai(id.warga, `select id from report_media where report_id = $1 and kind in ('BEFORE','AFTER')`, [lapor.id])).length === 0);

await harusGagal("kembalikan bukti wajib alasan", () => transisi(id.admin, "return_proof", lapor.id, { reason: "kurang" }), /alasan pengembalian/);
st = await transisi(id.admin, "return_proof", lapor.id, { reason: "Foto sesudah buram, ambil ulang dari sudut yang sama." });
const ditandai = await satu<{ needs_action: boolean; status: string }>(`select needs_action, status from reports where id = $1`, [lapor.id]);
cek("bukti dikembalikan -> Dikerjakan + Perlu tindakan Anda", ditandai.status === "IN_PROGRESS" && ditandai.needs_action, ditandai);
const notifPetugas = await sebagai<{ title: string }>(id.petugas, `select title from notifications order by created_at desc limit 1`);
cek("petugas menerima notifikasi pengembalian", /dikembalikan/.test(notifPetugas[0]?.title ?? ""), notifPetugas);

await transisi(id.petugas, "submit_proof", lapor.id, await buktiPayload());
st = await transisi(id.admin, "approve_proof", lapor.id);
cek("admin menyetujui bukti -> Selesai", st.status === "RESOLVED", st);
const selesai = await satu<{ resolved_at: string; sla: string }>(
  `select resolved_at, sla_status(status, verified_at, due_at, sla_stopped_at, proof_submitted_at) sla from reports where id = $1`, [lapor.id],
);
cek("resolved_at terisi dan SLA selesai tepat waktu", !!selesai.resolved_at && selesai.sla === "SELESAI_TEPAT_WAKTU", selesai);
const notifWarga = await sebagai<{ title: string; link: string }>(id.warga, `select title, link from notifications order by created_at desc limit 1`);
cek("pelapor menerima 'Laporan Anda selesai' + tautan bukti", notifWarga[0]?.title === "Laporan Anda selesai" && /#bukti$/.test(notifWarga[0].link), notifWarga);
cek("warga melihat foto sebelum-sesudah setelah disetujui",
  (await sebagai(id.warga, `select id from report_media where report_id = $1 and kind in ('BEFORE','AFTER')`, [lapor.id])).length === 2);
await harusGagal("status Selesai final", () => transisi(id.admin, "reject", lapor.id, { reason: "Coba tolak laporan selesai" }), /berstatus "Selesai"/);

const riwayat = await sebagai<{ type: string; is_internal: boolean; actor_label: string }>(
  id.warga, `select type, is_internal, actor_label from report_events where report_id = $1 order by id`, [lapor.id],
);
cek("warga tidak melihat catatan internal", riwayat.every((r) => !r.is_internal), riwayat);
cek("label aktor berupa peran/instansi", riwayat.some((r) => r.actor_label === "Petugas Dinas SDABMBK") && riwayat.some((r) => r.actor_label === "Admin"), riwayat);
const riwayatStaf = await sebagai(id.supervisor, `select id from report_events where report_id = $1`, [lapor.id]);
cek("staf melihat riwayat lengkap termasuk catatan internal", riwayatStaf.length > riwayat.length);
await harusGagal("riwayat tidak bisa diubah", () => db.query(`update report_events set title = 'ubah' where report_id = $1`, [lapor.id]), /tidak dapat diubah/);
await harusGagal("riwayat tidak bisa dihapus", () => db.query(`delete from report_events where report_id = $1`, [lapor.id]), /tidak dapat dihapus/);

// --- Kasus tepi ---------------------------------------------------------------
console.log("\nKasus tepi");
await harusGagal("titik di luar Kota Medan ditolak", async () =>
  transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { lat: -6.2, lng: 106.8 })), /di luar Kota Medan/);
await harusGagal("kelurahan harus sesuai kecamatan", async () =>
  transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { district_code: "12.71.01" })), /kecamatan dan kelurahan/);
await harusGagal("foto harus milik pengunggah", () =>
  transisi(id.warga2, "submit", null, {
    title: "Jalan berlubang dalam di depan sekolah", description: "Lubang besar sekali dan sangat berbahaya bagi pengendara.",
    category_id: kat["jalan-rusak"], lat: 3.5702, lng: 98.7215, district_code: desaDenai.district_code, village_code: desaDenai.code,
    address: "Depan sekolah", consent: true, media: [{ path: `${id.warga}/foto-uji-0001.jpg` }],
  }), /Berkas tidak valid/);

const berulang = await transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { lat: 3.5705, lng: 98.7216, title: "Lubangnya muncul lagi di depan sekolah" }));
const prev = await satu<{ previous_report_id: string }>(`select previous_report_id from reports where id = $1`, [berulang.id]);
cek("laporan baru di titik yang pernah selesai ditautkan sebagai laporan berulang", prev.previous_report_id === lapor.id, prev);

const induk = await transisi(id.warga, "submit", null, await laporanDasar(id.warga, { title: "Sampah menumpuk di pinggir parit", category_id: kat["sampah"] }));
const anak = await transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { title: "Tumpukan sampah di dekat parit", category_id: kat["sampah"] }));
await harusGagal("tidak bisa digabung ke laporan Selesai", () => transisi(id.admin, "merge", anak.id, { parent_id: lapor.id }), /Pilih laporan induk yang masih ditangani/);
const gabung = await transisi(id.admin, "merge", anak.id, { parent_id: induk.id });
const indukSesudah = await satu<{ affected_count: number }>(`select affected_count from reports where id = $1`, [induk.id]);
cek("merge: anak Digabungkan, induk 2 warga terdampak", gabung.status === "MERGED" && indukSesudah.affected_count === 2, indukSesudah);
await transisi(id.admin, "reject", berulang.id, { reason: "Duplikat uji coba, bukan masalah baru." });
// Pelapor anak ikut dikabari saat induk berubah status.
await transisi(id.admin, "verify", induk.id, { priority: "MEDIUM", priority_reasons: ["Berdampak banyak warga"] });
const notifAnak = await sebagai<{ title: string }>(id.warga2, `select title from notifications where report_id = $1`, [induk.id]);
cek("pelapor laporan yang digabungkan menerima kabar induk", notifAnak.some((n) => /diverifikasi/.test(n.title)), notifAnak);

const teruskan = await transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { title: "Air PDAM tidak mengalir tiga hari", category_id: kat["air-bersih"] }));
await harusGagal("teruskan hanya ke instansi eksternal", async () =>
  transisi(id.admin, "forward", teruskan.id, { agency_id: (await satu<{ id: string }>(`select id from agencies where slug='dlh'`)).id, note: "Bukan kewenangan Pemko Medan." }), /di luar Pemko/);
const fw = await transisi(id.admin, "forward", teruskan.id, {
  agency_id: (await satu<{ id: string }>(`select id from agencies where slug='perumda-tirtanadi'`)).id,
  note: "Air bersih dikelola Perumda Tirtanadi. Laporan Anda sudah kami teruskan.",
});
cek("forward -> Diteruskan", fw.status === "FORWARDED", fw);

await harusGagal("kategori yang dipakai tidak bisa dihapus", () => sebagai(id.admin, `update report_categories set deleted_at = now() where slug = 'jalan-rusak'`), /Dipakai oleh \d+ laporan/);
await sebagai(id.admin, `update agencies set contact_phone = '0611234567' where slug = 'bpbd'`);
const audit = await satu<{ actor_id: string; action: string }>(`select actor_id, action from audit_logs where table_name = 'agencies' order by id desc limit 1`);
cek("perubahan CMS tercatat di log aktivitas beserta pelakunya", audit.actor_id === id.admin && audit.action === "UPDATE", audit);
await harusGagal("warga tidak bisa mengubah data master", () => sebagai(id.warga, `update agencies set name = 'x' where slug = 'bpbd' returning id`).then((r) => { if (r.length === 0) throw new Error("ditolak RLS"); }), /ditolak RLS|permission denied/);

// Batas 5 laporan/jam (warga sudah mengirim 2 laporan).
for (let i = 0; i < 3; i++) await transisi(id.warga, "submit", null, await laporanDasar(id.warga, { title: `Lampu jalan mati nomor ${i + 1} di gang` }));
await harusGagal("batas 5 laporan per jam", async () => transisi(id.warga, "submit", null, await laporanDasar(id.warga)), /Batas 5 laporan per jam/);

// Eskalasi SLA.
await db.exec(`select set_config('oneportal.transition','on',false); update reports set due_at = now() - interval '1 hour' where id = '${induk.id}'; select set_config('oneportal.transition','',false);`);
await db.exec("set role service_role");
const tick = await satu<{ r: { escalated: number } }>(`select run_sla_tick() r`);
await db.exec("reset role");
cek("tick menandai laporan terlambat", tick.r.escalated === 1, tick);
const tick2 = await satu<{ r: { escalated: number } }>(`select run_sla_tick() r`);
cek("eskalasi hanya sekali per laporan", tick2.r.escalated === 0, tick2);
const notifSup = await sebagai<{ title: string }>(id.supervisor, `select title from notifications where type = 'ESCALATED'`);
cek("supervisor menerima notifikasi eskalasi", notifSup.length === 1, notifSup);
await harusGagal("warga tidak bisa menjalankan tick", () => sebagai(id.warga, `select run_sla_tick()`), /permission denied/);

// --- Migrasi 5: input admin (CMS), data publik, dashboard ---------------------
console.log("\nCMS, data publik, dashboard");
const intake = await transisi(id.admin, "submit", null, await laporanDasar(id.admin, {
  title: "Drainase tersumbat di simpang pasar",
  category_id: kat["drainase-banjir"],
  channel: "PHONE",
  intake_name: "Ibu Penelepon",
  lat: 3.5711, lng: 98.7201,
}));
const rIntake = await satu<{ channel: string; intake_name: string; reporter_id: string }>(
  `select channel, intake_name, reporter_id from reports where id = $1`, [intake.id]);
cek("admin bisa mencatat laporan telepon dari CMS", rIntake.channel === "PHONE" && rIntake.intake_name === "Ibu Penelepon" && rIntake.reporter_id === id.admin, rIntake);
await harusGagal("kanal admin harus valid", async () =>
  transisi(id.admin, "submit", null, await laporanDasar(id.admin, { channel: "WEB" })), /Pilih kanal laporan/);
await harusGagal("petugas tidak bisa membuat laporan", async () =>
  transisi(id.petugas, "submit", null, await laporanDasar(id.petugas)), /akun warga/);

const titik = await sebagai<{ code: string; status: string; after_thumb: string | null }>(null, `select code, status, after_thumb from public_map_points()`);
cek("peta publik: laporan Diterima tidak tampil", !titik.some((t) => t.code === intake.code), titik.map((t) => t.code));
cek("peta publik: laporan selesai tampil dengan thumbnail sesudah", titik.some((t) => t.code === lapor.code && t.status === "RESOLVED" && !!t.after_thumb), titik);
cek("peta publik: laporan ditolak tidak tampil", !titik.some((t) => t.status === "REJECTED"));

await db.exec(`select set_config('oneportal.transition','on',false); update reports set is_confidential = true where id = '${induk.id}'; select set_config('oneportal.transition','',false);`);
const titik2 = await sebagai<{ code: string }>(null, `select code from public_map_points()`);
cek("peta publik: laporan Rahasia tidak tampil", !titik2.some((t) => t.code === induk.code));

const statistik = await satu<{ s: { masuk: number; selesai: number } }>(`select public_report_stats(30) s`);
cek("statistik publik menghitung laporan (termasuk Rahasia)", statistik.s.masuk >= 5 && statistik.s.selesai === 1, statistik.s);

const galeri = await sebagai<{ code: string; before_path: string; after_path: string }>(null, `select code, before_path, after_path from public_recent_resolved(6)`);
cek("galeri sebelum-sesudah berisi laporan selesai", galeri.length === 1 && galeri[0].code === lapor.code && !!galeri[0].before_path && !!galeri[0].after_path, galeri);

const lacak = await sebagai<{ t: { status: string; title: string; events: Array<{ title: string }>; media: Array<{ kind: string }> } }>(null, `select public_track($1) t`, [lapor.code.toLowerCase()]);
cek("lacak publik: kode huruf kecil tetap ditemukan", lacak[0].t?.status === "RESOLVED");
cek("lacak publik: tanpa catatan internal", !lacak[0].t.events.some((e) => /Catatan internal|Alasan pengembalian/.test(e.title)), lacak[0].t.events);
cek("lacak publik: foto sebelum & sesudah ikut", ["BEFORE", "AFTER"].every((k) => lacak[0].t.media.some((m) => m.kind === k)), lacak[0].t.media);
const lacakBaru = await sebagai<{ t: { title: string | null; tampil: boolean } }>(null, `select public_track($1) t`, [intake.code]);
cek("lacak publik: laporan belum diverifikasi tanpa judul", lacakBaru[0].t.tampil === false && lacakBaru[0].t.title === null, lacakBaru[0].t);
const lacakNihil = await sebagai<{ t: unknown }>(null, `select public_track('OP-1999-00000') t`);
cek("lacak publik: kode tidak ada -> null", lacakNihil[0].t === null);

const dasbor = await sebagai<{ d: { ringkas: { masuk: number; menunggu_verifikasi: number }; kecamatan: unknown[] } }>(id.supervisor, `select staff_dashboard(30) d`);
cek("dashboard staf: angka dari database", dasbor[0].d.ringkas.masuk >= 6 && dasbor[0].d.kecamatan.length === 21, dasbor[0].d.ringkas);
await harusGagal("dashboard staf ditolak untuk warga", () => sebagai(id.warga, `select staff_dashboard(30)`), /hanya untuk admin dan supervisor/);

const wilayah = await sebagai<{ w: Array<{ nama: string; lat: number; kelurahan: unknown[] }> }>(null, `select daftar_wilayah() w`);
cek("daftar wilayah: 21 kecamatan bertitik pusat, 151 kelurahan",
  wilayah[0].w.length === 21 && wilayah[0].w.every((k) => k.lat > 3.4 && k.lat < 3.9) && wilayah[0].w.reduce((n, k) => n + k.kelurahan.length, 0) === 151);

// --- Migrasi 7: kontrol admin & kelola akun ---------------------------------
console.log("\nKontrol admin & kelola akun");
// Laporan baru untuk diuji: diverifikasi lalu diubah tenggatnya.
const uji7 = await transisi(id.warga2, "submit", null, await laporanDasar(id.warga2, { title: "Lampu jalan padam sepanjang gang" , category_id: kat["lampu-jalan"] }));
await transisi(id.admin, "verify", uji7.id, { priority: "LOW", priority_reasons: ["Berdampak banyak warga"] });
const tenggatBaru = new Date(Date.now() + 5 * 3600e3).toISOString();
const ubah = await transisi(id.admin, "update_details", uji7.id, { due_at: tenggatBaru, priority: "HIGH", note: "Permintaan camat" });
const r7 = await satu<{ due_at: string; priority: string; sla_target_hours: number }>(`select due_at, priority, sla_target_hours from reports where id = $1`, [uji7.id]);
cek("admin mengubah tenggat & prioritas", Math.abs(Date.parse(r7.due_at) - Date.parse(tenggatBaru)) < 1000 && r7.priority === "HIGH", { ubah, r7 });
const ev7 = await sebagai<{ title: string; is_internal: boolean }>(id.warga2, `select title, is_internal from report_events where report_id = $1 and type = 'DETAILS_UPDATED'`, [uji7.id]);
cek("perubahan tenggat terlihat pelapor, perubahan lain internal", ev7.length === 1 && /Target selesai diubah/.test(ev7[0].title), ev7);
await transisi(id.admin, "update_details", uji7.id, { recalculate_due: true });
const r7b = await satu<{ sla_target_hours: number }>(`select sla_target_hours from reports where id = $1`, [uji7.id]);
cek("hitung ulang tenggat dari SLA (Tinggi = 72 jam)", r7b.sla_target_hours === 72, r7b);
await harusGagal("petugas tidak bisa mengubah tenggat", () => transisi(id.petugas, "update_details", uji7.id, { due_at: tenggatBaru }), /Hanya admin/);
await harusGagal("tidak ada perubahan ditolak", () => transisi(id.admin, "update_details", uji7.id, { priority: "HIGH" }), /Tidak ada perubahan/);
await harusGagal("tenggat laporan selesai tidak bisa diubah", () => transisi(id.admin, "update_details", lapor.id, { due_at: tenggatBaru }), /sudah final/);
await transisi(id.admin, "update_details", uji7.id, { title: "Lampu jalan padam sepanjang gang sempit", category_id: kat["fasilitas-umum"] });
cek("admin mengubah judul & kategori", (await satu<{ title: string }>(`select title from reports where id = $1`, [uji7.id])).title.endsWith("sempit"));

const dibuka = await transisi(id.admin, "reopen", teruskan.id, { reason: "Ternyata pipa milik Pemko" });
cek("laporan diteruskan bisa dibuka kembali", dibuka.status === "SUBMITTED", dibuka);
await harusGagal("buka kembali hanya untuk ditolak/diteruskan", () => transisi(id.admin, "reopen", uji7.id, { reason: "coba buka" }), /tidak dapat dibuka kembali/);
await transisi(id.admin, "delete", uji7.id, { reason: "Laporan uji coba" });
cek("laporan dihapus hilang dari daftar warga", (await sebagai(id.warga2, `select id from reports where id = $1 and deleted_at is null`, [uji7.id])).length === 0);
await harusGagal("laporan terhapus tidak bisa diubah", () => transisi(id.admin, "update_details", uji7.id, { priority: "LOW" }), /sudah dihapus/);
await transisi(id.admin, "restore", uji7.id);
cek("laporan bisa dipulihkan", (await satu<{ deleted_at: string | null }>(`select deleted_at from reports where id = $1`, [uji7.id])).deleted_at === null);

const akun = await sebagai<{ email: string; role: string }>(id.supervisor, `select email, role from staff_list_accounts()`);
cek("supervisor melihat daftar akun", akun.length >= 6 && akun.some((x) => x.role === "ADMIN"), akun.length);
await harusGagal("admin tidak bisa melihat daftar akun", () => sebagai(id.admin, `select * from staff_list_accounts()`), /Hanya supervisor/);
const dlh = (await satu<{ id: string }>(`select id from agencies where slug = 'dlh'`)).id;
await sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.warga2, JSON.stringify({ role: "OFFICER", agency_id: dlh })]);
cek("supervisor mengubah warga jadi petugas DLH", (await satu<{ role: string }>(`select role from profiles where id = $1`, [id.warga2])).role === "OFFICER");
await sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.warga2, JSON.stringify({ role: "ADMIN" })]);
const jadiAdmin = await satu<{ role: string; agency_id: string | null }>(`select role, agency_id from profiles where id = $1`, [id.warga2]);
cek("supervisor menjadikan akun admin (instansi dikosongkan)", jadiAdmin.role === "ADMIN" && jadiAdmin.agency_id === null, jadiAdmin);
await harusGagal("petugas bertugas aktif tidak bisa dinonaktifkan", async () => {
  const tugasDlh = await transisi(id.warga, "submit", null, await laporanDasar(id.warga, { title: "Sampah belum diangkut dua hari", category_id: kat["sampah"] })).catch(() => null);
  if (tugasDlh) await transisi(id.admin, "verify", tugasDlh.id, { priority: "MEDIUM", priority_reasons: ["Berdampak banyak warga"], agency_id: dlh, assignee_id: id.petugasDlh });
  else await db.exec(`select set_config('oneportal.transition','on',false); update reports set status='ASSIGNED', assignee_id='${id.petugasDlh}', agency_id='${dlh}', priority='MEDIUM', due_at=now()+interval '1 day', verified_at=now() where id='${uji7.id}'; select set_config('oneportal.transition','',false);`);
  return sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.petugasDlh, JSON.stringify({ is_active: false })]);
}, /masih memegang/);
await harusGagal("akun demo tidak bisa diubah supervisor", () =>
  sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.petugas, JSON.stringify({ role: "ADMIN" })]), /Akun demo|masih memegang/);
await harusGagal("supervisor tidak bisa menonaktifkan dirinya", () =>
  sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.supervisor, JSON.stringify({ is_active: false })]), /akun Anda sendiri/);
await harusGagal("petugas wajib instansi", () =>
  sebagai(id.supervisor, `select supervisor_set_profile($1, $2::jsonb)`, [id.warga2, JSON.stringify({ role: "OFFICER", agency_id: "" })]), /wajib memilih instansi/);
await harusGagal("admin tidak bisa mengubah peran akun", () =>
  sebagai(id.admin, `select supervisor_set_profile($1, $2::jsonb)`, [id.warga2, JSON.stringify({ role: "SUPERVISOR" })]), /Hanya supervisor/);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
await db.close();
process.exit(gagal > 0 ? 1 : 0);
