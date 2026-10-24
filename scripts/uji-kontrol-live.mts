/**
 * Uji live fitur kontrol: satu pintu masuk (peran dari database), supervisor
 * membuat akun admin/petugas, akun nonaktif tidak bisa masuk, admin mengubah
 * tenggat, dan warga tidak bisa mendaftar sebagai staf. Semua data uji
 * dihapus lagi di akhir.
 *
 *   npx tsx scripts/uji-kontrol-live.mts [URL]
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AKUN_DEMO, KATA_SANDI_DEMO } from "../src/lib/demo.ts";
import { klienAdmin, wajibEnv } from "./lib/env.mts";

const SITUS = (process.argv.find((a) => a.startsWith("http")) ?? "https://oneportal-one.vercel.app").replace(/\/$/, "");
const URL_SB = wajibEnv("NEXT_PUBLIC_SUPABASE_URL");
const KUNCI = wajibEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const admin = klienAdmin();

let lulus = 0;
let gagal = 0;
const cek = (nama: string, ok: boolean, info: unknown = "") => {
  if (ok) lulus++;
  else gagal++;
  console.log(`  ${ok ? "ok   " : "GAGAL"} ${nama}${!ok && info ? `  (${typeof info === "string" ? info : JSON.stringify(info).slice(0, 300)})` : ""}`);
};

async function masuk(email: string, sandi: string): Promise<{ sb: SupabaseClient; id: string; cookie: string } | { galat: string }> {
  const toples = new Map<string, string>();
  const ssr = createServerClient(URL_SB, KUNCI, {
    cookies: {
      getAll: () => [...toples].map(([name, value]) => ({ name, value })),
      setAll: (d) => d.forEach(({ name, value }) => (value ? toples.set(name, value) : toples.delete(name))),
    },
  });
  const { data, error } = await ssr.auth.signInWithPassword({ email, password: sandi });
  if (error || !data.session) return { galat: error?.message ?? "tanpa sesi" };
  const sb = createClient(URL_SB, KUNCI, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } });
  return { sb, id: data.user.id, cookie: [...toples].map(([n, v]) => `${n}=${v}`).join("; ") };
}
const pasti = async (email: string, sandi: string) => {
  const m = await masuk(email, sandi);
  if ("galat" in m) throw new Error(`${email}: ${m.galat}`);
  return m;
};
const halaman = (path: string, cookie?: string) => fetch(SITUS + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });

console.log(`Situs: ${SITUS}\n\nHalaman masuk tunggal`);
const hMasuk = await (await halaman("/masuk")).text();
cek("tidak ada tombol 'Masuk sebagai' per peran", !/Masuk sebagai (warga|admin|petugas|supervisor)/i.test(hMasuk));
cek("ada penjelasan akun staf dibuatkan supervisor", /dibuatkan oleh supervisor/.test(hMasuk));
for (const a of AKUN_DEMO) {
  const m = await pasti(a.email, KATA_SANDI_DEMO);
  const r = await halaman("/masuk", m.cookie);
  const tujuan = { CITIZEN: "/akun", ADMIN: "/admin", OFFICER: "/petugas", SUPERVISOR: "/supervisor" }[a.role];
  cek(`${a.label}: email + sandi biasa langsung ke ${tujuan}`, r.status === 307 && (r.headers.get("location") ?? "").endsWith(tujuan), `${r.status} ${r.headers.get("location")}`);
}

console.log("\nSupervisor membuat akun");
const sup = await pasti(AKUN_DEMO.find((a) => a.role === "SUPERVISOR")!.email, KATA_SANDI_DEMO);
const hAkun = await halaman("/supervisor/akun", sup.cookie);
cek("halaman Kelola akun terbuka untuk supervisor", hAkun.status === 200 && /Kelola akun/.test(await hAkun.text()), hAkun.status);
const adm = await pasti(AKUN_DEMO.find((a) => a.role === "ADMIN")!.email, KATA_SANDI_DEMO);
cek("admin tidak bisa membuka Kelola akun (403)", (await halaman("/supervisor/akun", adm.cookie)).status === 403);

// Meniru aksi buatAkun: akun dibuat via Auth Admin, peran ditetapkan lewat RPC supervisor.
const emailUji = `uji.admin.${Date.now()}@oneportal.test`;
const sandiUji = "UjiAdmin2026x";
const { data: dibuat, error: errBuat } = await admin.auth.admin.createUser({ email: emailUji, password: sandiUji, email_confirm: true, user_metadata: { full_name: "Admin Uji" } });
cek("akun baru dibuat", !errBuat && !!dibuat.user, errBuat?.message);
const idUji = dibuat.user!.id;
try {
  const { error: errPeran } = await sup.sb.rpc("supervisor_set_profile", { p_user: idUji, p_payload: { role: "ADMIN" } });
  cek("supervisor menetapkan peran ADMIN", !errPeran, errPeran?.message);
  const { error: errAdminUbah } = await adm.sb.rpc("supervisor_set_profile", { p_user: idUji, p_payload: { role: "SUPERVISOR" } });
  cek("admin ditolak saat mencoba mengubah peran", !!errAdminUbah && /Hanya supervisor/.test(errAdminUbah.message), errAdminUbah?.message);

  const baru = await pasti(emailUji, sandiUji);
  const r = await halaman("/masuk", baru.cookie);
  cek("akun buatan supervisor masuk dan otomatis ke /admin", (r.headers.get("location") ?? "").endsWith("/admin"), r.headers.get("location"));
  cek("akun admin baru bisa membuka /admin", (await halaman("/admin", baru.cookie)).status === 200);

  await sup.sb.rpc("supervisor_set_profile", { p_user: idUji, p_payload: { is_active: false } });
  await admin.auth.admin.updateUserById(idUji, { ban_duration: "876000h" });
  const nonaktif = await masuk(emailUji, sandiUji);
  cek("akun dinonaktifkan supervisor tidak bisa masuk", "galat" in nonaktif, nonaktif);
  cek("sesi lama akun nonaktif ditolak di /admin", (await halaman("/admin", baru.cookie)).status !== 200);
} finally {
  await admin.auth.admin.deleteUser(idUji);
}

console.log("\nPendaftaran mandiri");
const emailWarga = `uji.warga.${Date.now()}@oneportal.test`;
const sb = createServerClient(URL_SB, KUNCI, { cookies: { getAll: () => [], setAll: () => {} } });
const { data: daftar } = await sb.auth.signUp({ email: emailWarga, password: "UjiWarga2026x", options: { data: { full_name: "Warga Uji", role: "SUPERVISOR" } } });
if (daftar.user) {
  const { data: p } = await admin.from("profiles").select("role").eq("id", daftar.user.id).single();
  cek("daftar sendiri selalu warga (metadata SUPERVISOR diabaikan)", p?.role === "CITIZEN", p?.role);
  await admin.auth.admin.deleteUser(daftar.user.id);
}

console.log("\nAdmin mengubah tenggat");
const { data: kat } = await adm.sb.from("report_categories").select("id").eq("slug", "jalan-rusak").single();
const { data: wil } = await adm.sb.from("villages").select("code, district_code").eq("district_code", "12.71.04").limit(1).single();
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=", "base64");
const nama = crypto.randomUUID().replace(/-/g, "");
const path = `${adm.id}/${nama}.jpg`;
await adm.sb.storage.from("laporan").upload(path, JPEG, { contentType: "image/jpeg" });
const { data: lap, error: errLap } = await adm.sb.rpc("transition_report", {
  p_action: "submit",
  p_report_id: null,
  p_payload: {
    title: "Uji tenggat: lubang jalan di Medan Denai",
    description: "Laporan uji otomatis untuk memeriksa perubahan tenggat oleh admin.",
    category_id: kat!.id, lat: 3.5702, lng: 98.7215, district_code: wil!.district_code, village_code: wil!.code,
    address: "Jalan uji", is_anonymous: false, is_confidential: true, consent: true, channel: "PHONE",
    media: [{ path, mime_type: "image/jpeg", size_bytes: JPEG.length }],
  },
});
cek("admin mencatat laporan uji", !errLap, errLap?.message);
const idLap = (lap as { id: string }).id;
try {
  await adm.sb.rpc("transition_report", { p_action: "verify", p_report_id: idLap, p_payload: { priority: "LOW", priority_reasons: ["Berdampak banyak warga"] } });
  const tenggat = new Date(Date.now() + 26 * 3600e3).toISOString();
  const { error: errUbah } = await adm.sb.rpc("transition_report", { p_action: "update_details", p_report_id: idLap, p_payload: { due_at: tenggat, priority: "EMERGENCY", note: "Uji" } });
  const { data: r } = await admin.from("reports").select("due_at, priority").eq("id", idLap).single();
  cek("tenggat & prioritas berhasil diubah admin", !errUbah && Math.abs(Date.parse(r!.due_at) - Date.parse(tenggat)) < 1000 && r!.priority === "EMERGENCY", errUbah?.message ?? r);
  const det = await halaman(`/admin/laporan/${idLap}`, adm.cookie);
  cek("detail laporan menampilkan panel Ubah data laporan", det.status === 200 && /Ubah data laporan/.test(await det.text()), det.status);
  const { error: errSup } = await sup.sb.rpc("transition_report", { p_action: "update_details", p_report_id: idLap, p_payload: { priority: "LOW" } });
  cek("supervisor tidak bisa mengubah data laporan", !!errSup, errSup?.message);
  const set = await halaman("/admin/pengaturan?tab=sla", adm.cookie);
  cek("halaman Pengaturan/SLA terbuka untuk admin", set.status === 200 && /Simpan matriks SLA/.test(await set.text()), set.status);
} finally {
  await adm.sb.rpc("transition_report", { p_action: "delete", p_report_id: idLap, p_payload: { reason: "Data uji otomatis" } });
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
