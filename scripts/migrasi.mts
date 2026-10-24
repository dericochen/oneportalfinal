/**
 * Jalankan migrasi SQL ke Supabase lewat connection string Postgres.
 * Tidak memerlukan Supabase CLI atau Docker. Setiap berkas dijalankan dalam
 * satu transaksi dan dicatat di tabel app_private.schema_migrations, jadi
 * aman dijalankan berulang.
 *
 *   npm run db:migrasi
 *
 * Membutuhkan SUPABASE_DB_URL di .env.local (Project Settings > Database >
 * Connection string > Session pooler, dengan kata sandi database).
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { klienDb } from "./lib/env.mts";

const DIR = join(import.meta.dirname, "..", "supabase", "migrations");

// Tanpa SUPABASE_DB_URL: pakai Supabase CLI (butuh `supabase login` + `supabase link`).
// CLI mencatat riwayat migrasi di supabase_migrations.schema_migrations.
if (!process.env.SUPABASE_DB_URL) {
  console.log("SUPABASE_DB_URL kosong, memakai `supabase db push --linked`…");
  const p = spawnSync("npx", ["supabase", "db", "push", "--linked", "--yes"], {
    cwd: join(import.meta.dirname, ".."),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(p.status ?? 1);
}

const db = await klienDb();

try {
  await db.query(`create schema if not exists app_private;
    create table if not exists app_private.schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const sudah = new Set((await db.query<{ name: string }>(`select name from app_private.schema_migrations`)).rows.map((r) => r.name));
  const berkas = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  let n = 0;
  for (const f of berkas) {
    if (sudah.has(f)) {
      console.log(`  lewati   ${f}`);
      continue;
    }
    await db.query("begin");
    try {
      await db.query(readFileSync(join(DIR, f), "utf8"));
      await db.query(`insert into app_private.schema_migrations (name) values ($1)`, [f]);
      await db.query("commit");
      console.log(`  terapkan ${f}`);
      n++;
    } catch (e) {
      await db.query("rollback");
      console.error(`\nMigrasi ${f} gagal dan dibatalkan:\n  ${(e as Error).message}`);
      process.exitCode = 1;
      break;
    }
  }
  if (!process.exitCode) console.log(n ? `\n${n} migrasi diterapkan.` : "\nBasis data sudah mutakhir.");
} finally {
  await db.end();
}
