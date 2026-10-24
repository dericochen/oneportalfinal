import { UserCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { TombolTautan } from "@/components/ui/tombol";
import { Logo } from "@/components/ui/logo";
import { ambilSesi } from "@/lib/auth";
import { BERANDA_PERAN, LABEL_PERAN } from "@/lib/domain/laporan";
import { BilahGulir } from "./bilah-gulir";
import { LoncengNotifikasi } from "./lonceng-notifikasi";
import { NAV_PUBLIK, tersediaSaja } from "./navigasi";
import { PenandaGulir } from "./penanda-gulir";
import { TautanAktif } from "./tautan-aktif";

/**
 * Header publik: logo kiri; Layanan, Lapor, Lacak, Peta, Statistik (yang
 * sudah tersedia); Masuk/akun di kanan. Di HP navigasi pindah ke bottom nav
 * dan tombol Lapor disembunyikan (sudah ada di bottom nav dan hero).
 */
export async function HeaderPublik() {
  const sesi = await ambilSesi();
  const nav = tersediaSaja(NAV_PUBLIK);
  const lapor = nav.find((b) => b.lapor);
  const biasa = nav.filter((b) => !b.lapor);

  return (
    <header
      id="header-situs"
      className="tanpa-cetak sticky top-0 z-30 border-b border-garis bg-putih transition-shadow duration-300 ease-keluar"
    >
      <PenandaGulir target="header-situs" />
      <BilahGulir />
      <div className="mx-auto flex min-h-16 w-full max-w-situs items-center gap-4 px-4 md:px-6">
        <Logo href="/" className="text-hutan" />
        {biasa.length > 0 && (
          <nav aria-label="Navigasi utama" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {biasa.map((b) => (
                <li key={b.href}>
                  <TautanAktif
                    href={b.href}
                    className="relative inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-aspal-2 transition-colors duration-150 ease-keluar after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-sm after:bg-hutan after:transition-transform after:duration-200 after:ease-keluar hover:text-hutan hover:after:scale-x-100"
                    kelasAktif="text-hutan after:scale-x-100"
                  >
                    {b.label}
                  </TautanAktif>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {lapor && (
            // Pembungkus, bukan kelas pada tombol: "hidden" kalah oleh "inline-flex" bawaan tombol.
            <div className="hidden md:block">
              <TombolTautan href={lapor.href} varian="lapor">
                Lapor masalah
              </TombolTautan>
            </div>
          )}
          {sesi ? (
            <>
              <LoncengNotifikasi />
              <Link
                href={BERANDA_PERAN[sesi.peran]}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 font-semibold transition-colors duration-150 ease-keluar hover:bg-lumut"
              >
                <UserCircle aria-hidden className="size-6" />
                <span className="hidden sm:inline">{sesi.peran === "CITIZEN" ? "Akun saya" : LABEL_PERAN[sesi.peran]}</span>
                <span className="sr-only sm:hidden">Akun saya</span>
              </Link>
            </>
          ) : (
            <TombolTautan href="/masuk" varian="kedua">
              Masuk
            </TombolTautan>
          )}
        </div>
      </div>
    </header>
  );
}