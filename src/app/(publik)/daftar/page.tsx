import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PesanGagal } from "@/components/ui/keadaan";
import { ambilSesi } from "@/lib/auth";
import { ambilWilayah } from "@/lib/data/wilayah";
import { BERANDA_PERAN } from "@/lib/domain/laporan";
import { FormDaftar } from "./form-daftar";

export const metadata: Metadata = { title: "Daftar" };

export default async function HalamanDaftar(props: PageProps<"/daftar">) {
  const sp = await props.searchParams;
  const lanjut = typeof sp.lanjut === "string" ? sp.lanjut : undefined;
  const sesi = await ambilSesi();
  if (sesi) redirect(BERANDA_PERAN[sesi.peran]);
  const wilayah = await ambilWilayah();

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6 px-4 py-8 md:py-12">
      <div className="animate-naik flex flex-col gap-6 rounded-lg border border-garis bg-putih p-6 shadow-angkat md:p-8">
        <div>
          <h1 className="text-h1 text-hutan">Daftar sebagai warga</h1>
          <p className="mt-2 text-aspal-2">Dengan akun, Anda bisa melapor dan menerima kabar sampai laporan selesai.</p>
          <p className="mt-2 rounded-md bg-lumut-2 p-3 text-kecil">
            Pendaftaran ini hanya untuk warga. Akun admin, petugas lapangan, dan supervisor dibuatkan oleh supervisor.
          </p>
        </div>
        {wilayah ? (
          <FormDaftar lanjut={lanjut} wilayah={wilayah} />
        ) : (
          <PesanGagal judul="Form pendaftaran belum termuat" pesan="Daftar kecamatan dan kelurahan tidak dapat dimuat. Muat ulang halaman ini." />
        )}
        <p className="border-t border-garis pt-5">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="tautan font-semibold">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
