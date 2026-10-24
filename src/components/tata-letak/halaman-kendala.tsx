import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { TombolTautan } from "@/components/ui/tombol";

/**
 * Isi bersama halaman 403/404/500: kalimat jelas + jalan keluar, tanpa
 * ilustrasi. Dipakai di luar layout publik, jadi membawa logo sendiri.
 */
export function HalamanKendala({
  kode,
  judul,
  pesan,
  aksi,
}: {
  kode: string;
  judul: string;
  pesan: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-garis">
        <div className="mx-auto flex min-h-16 w-full max-w-daftar items-center px-4 md:px-6">
          <Logo href="/" />
        </div>
      </header>
      <main id="isi" tabIndex={-1} className="mx-auto flex w-full max-w-daftar flex-1 flex-col gap-6 px-4 py-12 md:px-6">
        <p className="font-kode text-aspal-2">Kode {kode}</p>
        <h1 className="max-w-baca text-h1">{judul}</h1>
        <p className="max-w-baca">{pesan}</p>
        <div className="flex flex-wrap gap-3">
          {aksi ?? (
            <TombolTautan href="/" varian="utama">
              Ke beranda
            </TombolTautan>
          )}
        </div>
        <p className="text-kecil text-aspal-2">
          Butuh bantuan segera? Untuk keadaan darurat hubungi{" "}
          <Link href="tel:112" className="tautan">
            112
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
