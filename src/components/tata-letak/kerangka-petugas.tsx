import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import type { Sesi } from "@/lib/auth";
import { LoncengNotifikasi } from "./lonceng-notifikasi";
import { NavBawah } from "./nav-bawah";
import { NAV_PETUGAS, tersediaSaja } from "./navigasi";
import { TautanAktif } from "./tautan-aktif";
import { TombolKeluar } from "./tombol-keluar";

/**
 * Kerangka petugas lapangan: terasa seperti aplikasi HP. Header ringkas
 * dengan nama instansi, satu kolom isi, bottom nav di HP, header di tablet+.
 */
export function KerangkaPetugas({ sesi, children }: { sesi: Sesi; children: ReactNode }) {
  const nav = tersediaSaja(NAV_PETUGAS);
  return (
    <div className="latar-staf flex min-h-dvh flex-col text-staf">
      <header className="tanpa-cetak sticky top-0 z-30 border-b border-garis bg-putih/95">
        <div aria-hidden className="rebung-warna h-1.5 bg-[length:16px_6px]" />
        <div className="mx-auto flex min-h-14 w-full max-w-form items-center gap-3 px-4 md:max-w-daftar">
          <Logo href="/petugas" ukuran="kecil" />
          <span className="truncate text-kecil-staf text-aspal-2">
            Petugas {sesi.instansi?.namaSingkat ?? "lapangan"}
          </span>
          <nav aria-label="Navigasi petugas" className="ml-4 hidden md:block">
            <ul className="flex gap-1">
              {nav.map((b) => (
                <li key={b.href}>
                  <TautanAktif
                    href={b.href}
                    persis={b.href === "/petugas"}
                    className="inline-flex min-h-11 items-center rounded-sm px-3 font-semibold text-aspal-2 hover:text-aspal"
                    kelasAktif="text-aspal underline decoration-2 underline-offset-8"
                  >
                    {b.label}
                  </TautanAktif>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center">
            <LoncengNotifikasi className="md:hidden" />
            <TombolKeluar ringkas />
          </div>
        </div>
      </header>
      <main id="isi" tabIndex={-1} className="mx-auto w-full max-w-form flex-1 px-4 pt-6 pb-24 md:max-w-daftar md:pb-8">
        {children}
      </main>
      <NavBawah butir={nav} />
    </div>
  );
}
