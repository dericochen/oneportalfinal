import { CheckCircle, MapPin, Megaphone } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DaunMelayang } from "@/components/ui/hiasan";
import { LogoMedan } from "@/components/ui/logo-medan";
import { ambilSesi } from "@/lib/auth";
import { BERANDA_PERAN } from "@/lib/domain/laporan";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };

const POIN = [
  { ikon: Megaphone, teks: "Laporkan masalah kota lengkap dengan foto dan titik lokasi." },
  { ikon: MapPin, teks: "Pantau setiap tahap penanganannya dengan kode resi." },
  { ikon: CheckCircle, teks: "Selesai berarti ada bukti foto sebelum dan sesudah." },
] as const;

export default async function HalamanMasuk(props: PageProps<"/masuk">) {
  const sp = await props.searchParams;
  const lanjut = typeof sp.lanjut === "string" ? sp.lanjut : undefined;
  const baruKeluar = sp.keluar === "1";

  const sesi = await ambilSesi();
  if (sesi) redirect(BERANDA_PERAN[sesi.peran]);

  return (
    <div className="mx-auto grid w-full max-w-situs gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-stretch">
      {/* Panel bercorak Nusantara (hiasan + ringkasan manfaat). */}
      <section
        aria-label="Tentang ONE PORTAL"
        className="relative isolate hidden overflow-hidden rounded-tl-daun rounded-br-daun rounded-tr-lg rounded-bl-lg corak-ragi p-10 text-putih lg:flex lg:flex-col lg:justify-between"
      >
        <DaunMelayang />
        <div className="relative flex flex-col gap-6">
          <LogoMedan className="animate-naik self-start text-h1" />
          <h2 className="animate-naik tunda-1 max-w-md text-hero font-extrabold">Satu pintu untuk merawat kota bersama.</h2>
        </div>
        <ul className="relative flex flex-col gap-4">
          {POIN.map((p, i) => {
            const Ikon = p.ikon;
            return (
              <li key={p.teks} className={`animate-naik flex items-start gap-3 ${["tunda-2", "tunda-3", "tunda-4"][i]}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-tl-daun rounded-br-daun rounded-tr-md rounded-bl-md bg-putih/15 text-kuning">
                  <Ikon aria-hidden weight="fill" className="size-5" />
                </span>
                <span className="pt-2 text-lumut">{p.teks}</span>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="rebung-warna absolute inset-x-0 bottom-0 h-4" />
      </section>

      <div className="flex flex-col justify-center gap-6 rounded-lg border border-garis bg-putih p-6 shadow-angkat md:p-8">
        <div className="animate-naik">
          <h1 className="text-h1 text-hutan">Masuk</h1>
          <p className="mt-2 text-aspal-2">
            {lanjut
              ? "Masuk dulu untuk melanjutkan ke halaman yang Anda buka."
              : "Satu pintu masuk untuk warga dan petugas. Anda langsung diarahkan ke halaman sesuai akun Anda."}
          </p>
        </div>
        {baruKeluar && (
          <p role="status" className="animate-geser-masuk rounded-md bg-lumut-2 p-4">
            Anda sudah keluar. Sampai jumpa lagi.
          </p>
        )}
        <div className="animate-naik tunda-1">
          <FormMasuk lanjut={lanjut} />
        </div>
        <div className="animate-naik tunda-2 flex flex-col gap-2 border-t border-garis pt-5">
          <p>
            Belum punya akun?{" "}
            <Link href={lanjut ? `/daftar?lanjut=${encodeURIComponent(lanjut)}` : "/daftar"} className="tautan font-semibold">
              Daftar sebagai warga
            </Link>
          </p>
          <p className="text-kecil text-aspal-2">Akun admin, petugas lapangan, dan supervisor dibuatkan oleh supervisor, tidak bisa didaftarkan sendiri.</p>
        </div>
      </div>
    </div>
  );
}
