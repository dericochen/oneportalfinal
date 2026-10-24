import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Lapis 1 penegakan akses (route guard). Memperbarui sesi Supabase di setiap
 * permintaan, lalu mengalihkan pengunjung yang belum masuk dari halaman yang
 * butuh akun ke /masuk. Pengecekan PERAN dilakukan di layout tiap area
 * (lapis 2) dan RLS di database (lapis 3).
 */
const BUTUH_MASUK = ["/akun", "/notifikasi", "/lapor", "/admin", "/petugas", "/supervisor"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !kunci) return NextResponse.next();

  let respons = NextResponse.next({ request });
  const supabase = createServerClient(url, kunci, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (daftar) => {
        daftar.forEach(({ name, value }) => request.cookies.set(name, value));
        respons = NextResponse.next({ request });
        daftar.forEach(({ name, value, options }) => respons.cookies.set(name, value, options));
      },
    },
  });

  // getClaims memverifikasi JWT (bukan sekadar membaca cookie).
  const { data } = await supabase.auth.getClaims();
  const masuk = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const perluMasuk = BUTUH_MASUK.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (perluMasuk && !masuk) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = "/masuk";
    tujuan.search = `?lanjut=${encodeURIComponent(pathname + search)}`;
    const alih = NextResponse.redirect(tujuan);
    respons.cookies.getAll().forEach((c) => alih.cookies.set(c));
    return alih;
  }
  return respons;
}

export const config = {
  matcher: [
    // Semua halaman kecuali aset statis, gambar, dan endpoint cron (punya autentikasi sendiri).
    "/((?!_next/static|_next/image|api/cron|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
