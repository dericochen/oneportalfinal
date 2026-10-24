import type { Metadata } from "next";
import { FormLaporan } from "@/components/laporan/form-laporan";
import { PesanGagal } from "@/components/ui/keadaan";
import { TombolTautan } from "@/components/ui/tombol";
import { wajibMasuk } from "@/lib/auth";
import { ambilOpsiForm } from "@/lib/data/opsi-form";

export const metadata: Metadata = { title: "Lapor masalah" };

export default async function HalamanLapor() {
  const sesi = await wajibMasuk("/lapor");
  if (sesi.peran !== "CITIZEN") {
    return (
      <div className="mx-auto flex max-w-form flex-col items-start gap-4 px-4 py-12">
        <h1 className="text-h1">Lapor dari akun warga</h1>
        <p>
          Anda masuk sebagai staf. {sesi.peran === "ADMIN" ? "Laporan dari telepon atau loket dicatat lewat CMS." : "Gunakan akun warga untuk membuat laporan."}
        </p>
        {sesi.peran === "ADMIN" && <TombolTautan href="/admin/laporan/baru">Catat laporan di CMS</TombolTautan>}
      </div>
    );
  }
  const opsi = await ambilOpsiForm();
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-8 px-4 py-8 md:py-12">
      <header>
        <h1 className="text-h1">Lapor masalah</h1>
        <p className="mt-2 text-aspal-2">Laporan diperiksa admin, ditugaskan ke petugas, dan dinyatakan selesai setelah ada bukti foto.</p>
      </header>
      {opsi ? (
        <FormLaporan idPengguna={sesi.id} kategori={opsi.kategori} wilayah={opsi.wilayah} mode="warga" />
      ) : (
        <PesanGagal judul="Form belum termuat" pesan="Data kategori dan wilayah tidak dapat diambil. Muat ulang halaman ini." />
      )}
    </div>
  );
}
