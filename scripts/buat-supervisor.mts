/**
 * Buat akun SUPERVISOR sungguhan (bukan akun demo yang kata sandinya publik).
 * Dipakai untuk supervisor pertama; supervisor berikutnya cukup dibuat lewat
 * /supervisor/akun. Alamat domisili saat ini wajib, sama seperti akun lain.
 *
 *   npm run akun:supervisor -- --email nama@pemkomedan.go.id --nama "Nama Lengkap" \
 *     --alamat "Jl. Denai Gg. Mawar No. 12" --rt 3 --rw 5 --kodepos 20228 \
 *     --kecamatan "Medan Denai" --kelurahan "Denai" [--hp "0812 3456 7890"] [--sandi "..."]
 *
 * Tanpa --sandi, kata sandi acak dibuat dan ditampilkan SEKALI di terminal.
 */
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";
import { z } from "zod";
import { payloadAlamat, skemaAlamat } from "../src/lib/domain/alamat.ts";
import { jalankanSql, klienAdmin } from "./lib/env.mts";
import { bacaWilayah, q } from "./lib/master.mts";

const { values: a } = parseArgs({
  options: {
    email: { type: "string" },
    nama: { type: "string" },
    hp: { type: "string" },
    sandi: { type: "string" },
    alamat: { type: "string" },
    rt: { type: "string" },
    rw: { type: "string" },
    kodepos: { type: "string" },
    kecamatan: { type: "string" },
    kelurahan: { type: "string" },
  },
});

function gagal(pesan: string): never {
  console.error(`Gagal: ${pesan}`);
  process.exit(1);
}

function sandiAcak() {
  const h = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const n = "23456789";
  const ambil = (s: string, k: number) => Array.from({ length: k }, () => s[randomInt(s.length)]).join("");
  return `${ambil(h, 6)}${ambil(n, 3)}${ambil(h, 3)}`;
}

const akun = z
  .object({
    email: z.email({ error: "--email tidak valid." }).max(254),
    nama: z.string().trim().min(2, { error: "--nama minimal 2 huruf." }).max(120),
    hp: z.string().trim().regex(/^(\+?[0-9 -]{8,20})?$/, { error: "--hp tidak valid. Contoh: 0812 3456 7890." }),
    sandi: z
      .string()
      .min(8, { error: "--sandi minimal 8 karakter." })
      .max(72)
      .regex(/[A-Za-z]/, { error: "--sandi harus memuat huruf." })
      .regex(/[0-9]/, { error: "--sandi harus memuat angka." }),
  })
  .safeParse({ email: a.email ?? "", nama: a.nama ?? "", hp: a.hp ?? "", sandi: a.sandi ?? sandiAcak() });
if (!akun.success) gagal(akun.error.issues[0]?.message ?? "Isian akun tidak valid.");

// Kecamatan & kelurahan ditulis dengan nama (tidak peka huruf besar/kecil).
const sama = (x: string, y: string) => x.trim().toLowerCase() === y.trim().toLowerCase();
const kec = bacaWilayah().find((k) => sama(k.name, a.kecamatan ?? ""));
if (!kec) gagal(`--kecamatan "${a.kecamatan ?? ""}" tidak ditemukan di Kota Medan.`);
const kel = kec.villages.find((v) => sama(v.name, a.kelurahan ?? ""));
if (!kel) gagal(`--kelurahan "${a.kelurahan ?? ""}" tidak ada di Kecamatan ${kec.name}. Pilihan: ${kec.villages.map((v) => v.name).join(", ")}.`);

const alamat = skemaAlamat.safeParse({
  alamat: a.alamat ?? "",
  rt: a.rt ?? "",
  rw: a.rw ?? "",
  kodePos: a.kodepos ?? "",
  kecamatan: kec.code,
  kelurahan: kel.code,
});
if (!alamat.success) gagal(alamat.error.issues[0]?.message ?? "Alamat domisili tidak valid.");

const d = akun.data;
const supabase = klienAdmin();
const { data, error } = await supabase.auth.admin.createUser({
  email: d.email.toLowerCase(),
  password: d.sandi,
  email_confirm: true,
  // Trigger database membuat profil (warga) dan menyimpan alamat domisili.
  user_metadata: { full_name: d.nama, phone: d.hp || null, domicile: payloadAlamat(alamat.data) },
});
if (error || !data.user) {
  gagal(/already|registered|exists/i.test(error?.message ?? "") ? `Email ${d.email} sudah dipakai akun lain.` : (error?.message ?? "Akun tidak dibuat."));
}

try {
  await jalankanSql(`update public.profiles set role = 'SUPERVISOR', agency_id = null, is_active = true
where id = ${q(data.user.id)};`);
} catch (e) {
  await supabase.auth.admin.deleteUser(data.user.id);
  gagal(`peran supervisor tidak dapat ditetapkan, akun dibatalkan. ${(e as Error).message}`);
}

console.log(`Akun supervisor dibuat.
  Email      : ${d.email.toLowerCase()}
  Kata sandi : ${d.sandi}
  Domisili   : ${alamat.data.alamat}, RT ${alamat.data.rt}/RW ${alamat.data.rw}, Kel. ${kel.name}, Kec. ${kec.name}, Kota Medan ${alamat.data.kodePos}

Simpan kata sandi ini sekarang (tidak ditampilkan lagi). Masuk di /masuk; sistem membuka /supervisor.`);
