"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { Tombol, TombolTautan } from "@/components/ui/tombol";

/** 500: galat tak terduga saat merender halaman. */
export default function Galat({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-garis">
        <div className="mx-auto flex min-h-16 w-full max-w-daftar items-center px-4 md:px-6">
          <Logo href="/" />
        </div>
      </header>
      <main id="isi" className="mx-auto flex w-full max-w-daftar flex-1 flex-col gap-6 px-4 py-12 md:px-6">
        <p className="font-kode text-aspal-2">Kode 500</p>
        <h1 className="max-w-baca text-h1">Halaman ini gagal dimuat</h1>
        <p className="max-w-baca">
          Ada gangguan di server kami, bukan kesalahan Anda. Isian yang sudah dikirim tetap tersimpan. Coba muat ulang dalam
          beberapa detik.
        </p>
        {error.digest && <p className="text-kecil text-aspal-2">Kode kejadian untuk tim: <span className="font-kode">{error.digest}</span></p>}
        <div className="flex flex-wrap gap-3">
          <Tombol onClick={() => retry()}>Coba lagi</Tombol>
          <TombolTautan href="/" varian="kedua">
            Ke beranda
          </TombolTautan>
        </div>
      </main>
    </div>
  );
}
