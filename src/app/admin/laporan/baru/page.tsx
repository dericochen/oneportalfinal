import type { Metadata } from "next";
import Link from "next/link";
import { FormLaporan } from "@/components/laporan/form-laporan";
import { PesanGagal } from "@/components/ui/keadaan";
import { wajibPeran } from "@/lib/auth";
import { ambilOpsiForm } from "@/lib/data/opsi-form";

export const metadata: Metadata = { title: "Catat laporan baru" };

/** CMS: admin mencatat laporan dari telepon, loket, atau media sosial, lengkap dengan foto. */
export default async function HalamanLaporanBaru() {
  const sesi = await wajibPeran(["ADMIN"], "/admin/laporan/baru");
  const opsi = await ambilOpsiForm();
  return (
    <div className="flex max-w-form flex-col gap-6">
      <Link href="/admin/laporan" className="tautan self-start">
        Kembali ke daftar laporan
      </Link>
      <header>
        <h1 className="text-h1">Catat laporan baru</h1>
        <p className="mt-1 text-aspal-2">
          Untuk laporan yang masuk lewat telepon, loket, atau media sosial. Laporan masuk ke antrean verifikasi seperti laporan dari warga.
        </p>
      </header>
      {opsi ? (
        <FormLaporan idPengguna={sesi.id} kategori={opsi.kategori} wilayah={opsi.wilayah} mode="admin" />
      ) : (
        <PesanGagal judul="Form belum termuat" pesan="Data kategori dan wilayah tidak dapat diambil. Muat ulang halaman ini." />
      )}
    </div>
  );
}
