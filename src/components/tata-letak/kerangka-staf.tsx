import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import type { Sesi } from "@/lib/auth";
import { LABEL_PERAN } from "@/lib/domain/laporan";
import { formatAngka } from "@/lib/format";
import { DrawerStaf } from "./drawer-staf";
import { LoncengNotifikasi } from "./lonceng-notifikasi";
import type { GrupMenuStaf } from "./navigasi";
import { TautanAktif } from "./tautan-aktif";
import { TombolKeluar } from "./tombol-keluar";

/**
 * Kerangka admin & supervisor: sidebar di ≥1024 px, drawer di bawahnya;
 * topbar berisi notifikasi dan akun. Menu dikelompokkan menurut pekerjaan
 * ("Antrean" paling atas); grup tanpa butir tersedia tidak ditampilkan.
 */
function MenuStaf({ menu, beranda }: { menu: GrupMenuStaf[]; beranda: string }) {
  const grup = menu.map((g) => ({ ...g, butir: g.butir.filter((b) => b.tersedia) })).filter((g) => g.butir.length > 0);
  return (
    <nav aria-label="Menu staf" className="flex flex-col gap-6 p-4">
      {grup.map((g) => (
        <div key={g.judul}>
          <p className="mb-1 px-3 text-kecil-staf font-semibold text-aspal-2">{g.judul}</p>
          <ul className="flex flex-col">
            {g.butir.map((b) => {
              const Ikon = b.ikon;
              return (
                <li key={b.href}>
                  <TautanAktif
                    href={b.href}
                    persis={b.href === beranda}
                    className="flex min-h-11 items-center gap-3 rounded-sm px-3 text-aspal hover:bg-abu"
                    kelasAktif="bg-abu font-semibold"
                  >
                    <Ikon aria-hidden className="size-5 shrink-0" />
                    <span className="flex-1">{b.label}</span>
                    {typeof b.hitung === "number" && b.hitung > 0 && (
                      <span className="rounded-sm bg-aspal px-1.5 text-kecil-staf font-bold text-putih tabular-nums">
                        {formatAngka(b.hitung)}
                      </span>
                    )}
                  </TautanAktif>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function KerangkaStaf({
  sesi,
  menu,
  beranda,
  children,
}: {
  sesi: Sesi;
  menu: GrupMenuStaf[];
  beranda: string;
  children: ReactNode;
}) {
  return (
    <div className="latar-staf flex min-h-dvh flex-col text-staf">
      <header className="tanpa-cetak sticky top-0 z-30 border-b border-garis bg-putih/95">
        {/* Pita rebung tipis di atas header: penanda motif Nusantara di area staf. */}
        <div aria-hidden className="rebung-warna h-1.5 bg-[length:16px_6px]" />
        <div className="flex min-h-14 items-center gap-2 px-2 md:px-4">
          <DrawerStaf>
            <MenuStaf menu={menu} beranda={beranda} />
          </DrawerStaf>
          <Logo href={beranda} ukuran="kecil" />
          <span className="hidden text-kecil-staf text-aspal-2 sm:inline">{LABEL_PERAN[sesi.peran]}</span>
          <div className="ml-auto flex items-center gap-1">
            <LoncengNotifikasi />
            <span className="hidden max-w-48 truncate px-2 text-kecil-staf md:inline">{sesi.namaLengkap}</span>
            <TombolKeluar ringkas />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="tanpa-cetak hidden w-64 shrink-0 border-r border-garis bg-putih/80 lg:block">
          <div className="sticky top-16">
            <MenuStaf menu={menu} beranda={beranda} />
          </div>
        </aside>
        <main id="isi" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
