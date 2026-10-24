import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buatKlienAdmin } from "@/lib/supabase/admin";

/**
 * Pengecekan SLA berkala: menandai laporan yang melewati tenggat dan
 * memberi tahu supervisor (sekali per laporan). Dipanggil GitHub Actions
 * setiap jam, sekaligus menjaga proyek Supabase Free tetap aktif.
 *
 * Wajib header `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";

function rahasiaCocok(header: string | null): boolean {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || rahasia.length < 32 || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(rahasia);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function jalankan(request: Request) {
  if (!rahasiaCocok(request.headers.get("authorization"))) {
    return NextResponse.json({ galat: "Tidak berwenang." }, { status: 401 });
  }
  try {
    const supabase = buatKlienAdmin();
    const { data, error } = await supabase.rpc("run_sla_tick");
    if (error) throw error;
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("cron tick gagal", e);
    return NextResponse.json({ ok: false, galat: "Pengecekan SLA gagal dijalankan." }, { status: 500 });
  }
}

export const GET = jalankan;
export const POST = jalankan;
