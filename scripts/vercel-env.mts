/**
 * Salin variabel dari .env.local ke Vercel (production & preview) lewat stdin,
 * jadi nilai rahasia tidak muncul di argumen proses maupun log.
 *
 *   npx tsx scripts/vercel-env.mts [NAMA=nilai ...]
 *
 * Argumen NAMA=nilai menimpa nilai dari .env.local (mis. NEXT_PUBLIC_SITE_URL).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";

const AKAR = join(import.meta.dirname, "..");
const lokal = parse(readFileSync(join(AKAR, ".env.local")));
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf("=");
  if (i > 0) lokal[arg.slice(0, i)] = arg.slice(i + 1);
}

const DAFTAR: Array<{ nama: string; rahasia: boolean }> = [
  { nama: "NEXT_PUBLIC_SUPABASE_URL", rahasia: false },
  { nama: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", rahasia: false },
  { nama: "NEXT_PUBLIC_SITE_URL", rahasia: false },
  { nama: "SUPABASE_SERVICE_ROLE_KEY", rahasia: true },
  { nama: "CRON_SECRET", rahasia: true },
];

let gagal = 0;
for (const { nama, rahasia } of DAFTAR) {
  const nilai = lokal[nama];
  if (!nilai) {
    console.log(`  lewati   ${nama} (kosong)`);
    continue;
  }
  for (const target of ["production", "preview"]) {
    const args = ["env", "add", nama, target, "--force", rahasia ? "--sensitive" : "--no-sensitive"];
    const p = spawnSync("vercel", args, {
      cwd: AKAR,
      input: nilai,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (p.status === 0) {
      console.log(`  diatur   ${nama} [${target}]${rahasia ? " (rahasia)" : ""}`);
    } else {
      gagal++;
      console.log(`  GAGAL    ${nama} [${target}]: ${(p.stderr || p.stdout).split("\n").filter(Boolean).slice(-2).join(" ")}`);
    }
  }
}
process.exit(gagal ? 1 : 0);
