/** Utilitas bersama skrip: memuat .env.local dan membuat klien. */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import pg from "pg";

const AKAR = join(import.meta.dirname, "..", "..");
config({ path: join(AKAR, ".env.local"), quiet: true });

export function wajibEnv(nama: string): string {
  const v = process.env[nama];
  if (!v) {
    console.error(`Variabel ${nama} belum diisi di .env.local. Lihat .env.example dan README.`);
    process.exit(1);
  }
  return v;
}

export async function klienDb() {
  const db = new pg.Client({
    connectionString: wajibEnv("SUPABASE_DB_URL"),
    // Supabase memakai sertifikat yang ditandatangani CA publik.
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  return db;
}

/**
 * Jalankan SQL (boleh banyak pernyataan, dibungkus satu transaksi oleh pemanggil).
 * - Bila SUPABASE_DB_URL ada: lewat koneksi Postgres langsung.
 * - Bila tidak: lewat Supabase CLI (`supabase db query --linked`), yang memakai
 *   Management API dan login `supabase login`. Tidak butuh kata sandi database.
 * Mengembalikan baris hasil pernyataan terakhir.
 */
export async function jalankanSql<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  if (process.env.SUPABASE_DB_URL) {
    const db = await klienDb();
    try {
      const hasil = await db.query(sql);
      const akhir = Array.isArray(hasil) ? hasil[hasil.length - 1] : hasil;
      return (akhir?.rows ?? []) as T[];
    } finally {
      await db.end();
    }
  }
  const dir = mkdtempSync(join(tmpdir(), "oneportal-sql-"));
  const berkas = join(dir, "kueri.sql");
  try {
    writeFileSync(berkas, sql, "utf8");
    const p = spawnSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", "-f", berkas], {
      cwd: AKAR,
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (p.status !== 0) {
      throw new Error((p.stderr || p.stdout || "supabase db query gagal").trim());
    }
    const keluaran = p.stdout.slice(p.stdout.indexOf("["));
    try {
      return JSON.parse(keluaran) as T[];
    } catch {
      return [];
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Klien admin Supabase (service role). Hanya untuk skrip di mesin tim. */
export function klienAdmin() {
  return createClient(wajibEnv("NEXT_PUBLIC_SUPABASE_URL"), wajibEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
