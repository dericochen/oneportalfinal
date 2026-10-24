/**
 * Uji asap situs live (Fase 0): masuk sebagai 4 akun demo dengan cookie sesi
 * yang sama seperti browser (@supabase/ssr), lalu cek hak akses tiap halaman.
 * Juga menguji pendaftaran warga baru tanpa konfirmasi email (akun uji
 * langsung dihapus lagi).
 *
 *   npx tsx scripts/uji-live.mts https://oneportal-one.vercel.app
 */
import { createServerClient } from "@supabase/ssr";
import { AKUN_DEMO, KATA_SANDI_DEMO } from "../src/lib/demo.ts";
import { klienAdmin, wajibEnv } from "./lib/env.mts";

const SITUS = (process.argv[2] ?? "https://oneportal-one.vercel.app").replace(/\/$/, "");
const URL_SB = wajibEnv("NEXT_PUBLIC_SUPABASE_URL");
const KUNCI = wajibEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

let lulus = 0;
let gagal = 0;
const cek = (nama: string, ok: boolean, info = "") => {
  if (ok) lulus++;
  else gagal++;
  console.log(`  ${ok ? "ok   " : "GAGAL"} ${nama}${info ? `  (${info})` : ""}`);
};

async function sesiCookie(email: string, sandi: string) {
  const toples = new Map<string, string>();
  const sb = createServerClient(URL_SB, KUNCI, {
    cookies: {
      getAll: () => [...toples].map(([name, value]) => ({ name, value })),
      setAll: (d) => d.forEach(({ name, value }) => (value ? toples.set(name, value) : toples.delete(name))),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: sandi });
  if (error) throw new Error(`${email}: ${error.message}`);
  return [...toples].map(([n, v]) => `${n}=${v}`).join("; ");
}

async function buka(path: string, cookie?: string) {
  const r = await fetch(SITUS + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  const isi = r.status === 200 ? await r.text() : "";
  return { status: r.status, lokasi: r.headers.get("location") ?? "", isi };
}

console.log(`Situs: ${SITUS}\n\nTanpa masuk`);
for (const p of ["/admin", "/petugas", "/supervisor", "/akun"]) {
  const r = await buka(p);
  cek(`${p} dialihkan ke /masuk`, r.status === 307 && r.lokasi.includes("/masuk"), `${r.status}`);
}
const tick = await buka("/api/cron/tick");
cek("/api/cron/tick tanpa rahasia ditolak", tick.status === 401, `${tick.status}`);

const HARAPAN: Record<string, { rumah: string; teks: RegExp; dilarang: string[] }> = {
  warga: { rumah: "/akun", teks: /Halo, (<!-- -->)?Warga Demo/, dilarang: ["/admin", "/petugas", "/supervisor"] },
  admin: { rumah: "/admin", teks: /Command center/, dilarang: ["/petugas", "/supervisor", "/akun"] },
  petugas: { rumah: "/petugas", teks: /Tugas saya[\s\S]*Dinas Sumber Daya Air/, dilarang: ["/admin", "/supervisor", "/akun"] },
  supervisor: { rumah: "/supervisor", teks: /Command center/, dilarang: ["/admin", "/petugas", "/akun"] },
};

for (const akun of AKUN_DEMO) {
  console.log(`\nSebagai ${akun.label.toLowerCase()} (${akun.email})`);
  const cookie = await sesiCookie(akun.email, KATA_SANDI_DEMO);
  const h = HARAPAN[akun.kunci];
  const rumah = await buka(h.rumah, cookie);
  cek(`${h.rumah} terbuka`, rumah.status === 200 && h.teks.test(rumah.isi), `${rumah.status}`);
  for (const p of h.dilarang) {
    const r = await buka(p, cookie);
    cek(`${p} ditolak 403`, r.status === 403 && /Anda tidak memiliki akses/.test(await (await fetch(SITUS + p, { headers: { cookie } })).text()), `${r.status}`);
  }
  const masuk = await buka("/masuk", cookie);
  cek("/masuk mengalihkan ke halaman peran", masuk.status === 307 && masuk.lokasi.endsWith(h.rumah), `${masuk.status} ${masuk.lokasi}`);
  if (akun.kunci === "petugas") {
    const r = await buka("/petugas/tugas/00000000-0000-4000-8000-000000000000", cookie);
    cek("tugas yang bukan miliknya -> 404", r.status === 404, `${r.status}`);
  }
}

console.log("\nPendaftaran warga baru");
const emailUji = `uji.${Date.now()}@oneportal.test`;
const sb = createServerClient(URL_SB, KUNCI, { cookies: { getAll: () => [], setAll: () => {} } });
const { data: daftar, error: errDaftar } = await sb.auth.signUp({
  email: emailUji,
  password: "UjiDaftar2026!",
  options: { data: { full_name: "Warga Uji", role: "ADMIN" } },
});
cek("daftar langsung dapat sesi (tanpa konfirmasi email)", !errDaftar && !!daftar.session, errDaftar?.message ?? "");
if (daftar.user) {
  const admin = klienAdmin();
  const { data: p } = await admin.from("profiles").select("role").eq("id", daftar.user.id).single();
  cek("akun baru berperan warga meski metadata meminta ADMIN", p?.role === "CITIZEN", p?.role ?? "");
  await admin.auth.admin.deleteUser(daftar.user.id);
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
