/**
 * Uji alur lengkap di situs live dengan akun demo, persis seperti lewat CMS:
 * admin mencatat laporan berfoto → verifikasi + tugaskan → petugas mulai,
 * progres, kirim bukti sebelum–sesudah → admin setujui. Lalu memeriksa bahwa
 * hasilnya tampil di halaman lacak, beranda, peta, dan command center.
 *
 *   npx tsx scripts/uji-alur-live.mts [URL] [--bersihkan]
 *
 * --bersihkan menghapus data uji sesudahnya (memanggil reset data demo).
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { AKUN_DEMO, KATA_SANDI_DEMO } from "../src/lib/demo.ts";
import { wajibEnv } from "./lib/env.mts";

const SITUS = (process.argv.find((a) => a.startsWith("http")) ?? "https://oneportal-one.vercel.app").replace(/\/$/, "");
const URL_SB = wajibEnv("NEXT_PUBLIC_SUPABASE_URL");
const KUNCI = wajibEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

// JPEG 1x1 abu (valid) sebagai foto uji.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=",
  "base64",
);

let lulus = 0;
let gagal = 0;
const cek = (nama: string, ok: boolean, info: unknown = "") => {
  if (ok) lulus++;
  else gagal++;
  console.log(`  ${ok ? "ok   " : "GAGAL"} ${nama}${!ok && info ? `  (${typeof info === "string" ? info : JSON.stringify(info).slice(0, 300)})` : ""}`);
};

async function masuk(kunci: string): Promise<{ sb: SupabaseClient; id: string; cookie: string }> {
  const akun = AKUN_DEMO.find((a) => a.kunci === kunci)!;
  const toples = new Map<string, string>();
  const ssr = createServerClient(URL_SB, KUNCI, {
    cookies: {
      getAll: () => [...toples].map(([name, value]) => ({ name, value })),
      setAll: (d) => d.forEach(({ name, value }) => (value ? toples.set(name, value) : toples.delete(name))),
    },
  });
  const { data, error } = await ssr.auth.signInWithPassword({ email: akun.email, password: KATA_SANDI_DEMO });
  if (error || !data.session) throw new Error(`${akun.email}: ${error?.message}`);
  const sb = createClient(URL_SB, KUNCI, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } });
  return { sb, id: data.user.id, cookie: [...toples].map(([n, v]) => `${n}=${v}`).join("; ") };
}

async function foto(sb: SupabaseClient, uid: string) {
  const nama = crypto.randomUUID().replace(/-/g, "");
  const path = `${uid}/${nama}.jpg`;
  const thumb = `${uid}/${nama}-t.jpg`;
  for (const p of [path, thumb]) {
    const { error } = await sb.storage.from("laporan").upload(p, JPEG, { contentType: "image/jpeg" });
    if (error) throw new Error(`unggah ${p}: ${error.message}`);
  }
  return { path, thumb_path: thumb, mime_type: "image/jpeg", size_bytes: JPEG.length, width: 1, height: 1 };
}

async function transisi(sb: SupabaseClient, aksi: string, id: string | null, payload: Record<string, unknown>) {
  const { data, error } = await sb.rpc("transition_report", { p_action: aksi, p_report_id: id, p_payload: payload });
  if (error) throw new Error(`${aksi}: ${error.message}`);
  return data as { id: string; code: string; status: string };
}

const halaman = async (path: string, cookie?: string) => {
  const r = await fetch(SITUS + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  return { status: r.status, isi: r.status === 200 ? await r.text() : "" };
};

console.log(`Situs: ${SITUS}\n`);
const admin = await masuk("admin");
const petugas = await masuk("petugas");

const { data: kat } = await admin.sb.from("report_categories").select("id").eq("slug", "jalan-rusak").single();
const { data: wil } = await admin.sb.from("villages").select("code, district_code").eq("district_code", "12.71.04").limit(1).single();
const judul = `Uji alur ${new Date().toISOString().slice(11, 19)}: lubang jalan di Medan Denai`;

console.log("Alur CMS");
const lapor = await transisi(admin.sb, "submit", null, {
  title: judul,
  description: "Laporan uji otomatis lewat CMS admin, diterima lewat telepon dari warga sekitar.",
  category_id: kat!.id,
  lat: 3.5702,
  lng: 98.7215,
  district_code: wil!.district_code,
  village_code: wil!.code,
  address: "Jalan uji, depan sekolah",
  is_anonymous: false,
  is_confidential: false,
  consent: true,
  channel: "PHONE",
  intake_name: "Penelepon uji",
  media: [await foto(admin.sb, admin.id)],
});
cek(`admin mencatat laporan ${lapor.code}`, lapor.status === "SUBMITTED");
const v = await transisi(admin.sb, "verify", lapor.id, { priority: "HIGH", priority_reasons: ["Dekat sekolah/fasilitas kesehatan"], assignee_id: petugas.id });
cek("verifikasi + tugaskan ke petugas demo", v.status === "ASSIGNED", v);
cek("petugas mulai", (await transisi(petugas.sb, "start", lapor.id, {})).status === "IN_PROGRESS");
await transisi(petugas.sb, "add_progress", lapor.id, { note: "Material aspal sudah tiba di lokasi.", show_to_citizen: true, media: [await foto(petugas.sb, petugas.id)] });
cek("petugas menambah progres berfoto", true);
const b = await transisi(petugas.sb, "submit_proof", lapor.id, {
  description: "Lubang ditambal aspal dingin seluas kira-kira dua meter persegi, permukaan diratakan.",
  work_date: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10),
  declaration: true,
  before: [await foto(petugas.sb, petugas.id)],
  after: [await foto(petugas.sb, petugas.id)],
});
cek("petugas mengirim bukti sebelum-sesudah", b.status === "UNDER_REVIEW", b);
cek("admin menyetujui bukti", (await transisi(admin.sb, "approve_proof", lapor.id, {})).status === "RESOLVED");

console.log("\nTampil di situs");
const lacak = await halaman(`/lacak/${lapor.code}`);
cek("halaman lacak: 200 + cap SELESAI + penggeser + progres", lacak.status === 200 && /Cap selesai/.test(lacak.isi) && /penggeser-bukti/.test(lacak.isi) && /Progres pekerjaan/.test(lacak.isi), lacak.status);
cek("halaman lacak: nama penelepon tidak bocor", !lacak.isi.includes("Penelepon uji"));
const beranda = await halaman("/");
cek("beranda: muncul di Baru saja selesai", beranda.isi.includes(judul.replace(/:/g, ":")) || beranda.isi.includes("Uji alur"), beranda.status);
const peta = await halaman("/peta");
cek("peta: titik laporan ada", peta.isi.includes(lapor.code), peta.status);
const cc = await halaman("/admin", admin.cookie);
cek("command center admin: dokumentasi perbaikan memuat laporan", cc.status === 200 && cc.isi.includes(lapor.code), cc.status);
const detail = await halaman(`/admin/laporan/${lapor.id}`, admin.cookie);
cek("detail laporan admin: bukti + nama penelepon (internal)", detail.status === 200 && detail.isi.includes("Penelepon uji") && /Bukti penyelesaian/.test(detail.isi), detail.status);
const tugas = await halaman(`/petugas/tugas/${lapor.id}`, petugas.cookie);
cek("halaman tugas petugas terbuka", tugas.status === 200, tugas.status);
const sup = await halaman("/supervisor/laporan", (await masuk("supervisor")).cookie);
cek("supervisor melihat daftar laporan", sup.status === 200 && sup.isi.includes(lapor.code), sup.status);

if (process.argv.includes("--bersihkan")) {
  console.log("\nMembersihkan data uji…");
  spawnSync("npx", ["tsx", "scripts/reset-demo.mts", "--ya"], { stdio: "inherit", shell: process.platform === "win32" });
}
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
