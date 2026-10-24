import type { Metadata } from "next";
import { HalamanKendala } from "@/components/tata-letak/halaman-kendala";
import { TombolTautan } from "@/components/ui/tombol";
import { ambilSesi } from "@/lib/auth";
import { BERANDA_PERAN, LABEL_PERAN } from "@/lib/domain/laporan";

export const metadata: Metadata = { title: "Akses ditolak" };

/** 403: sudah masuk, tetapi perannya tidak berhak membuka halaman ini. */
export default async function AksesDitolak() {
  const sesi = await ambilSesi();
  return (
    <HalamanKendala
      kode="403"
      judul="Anda tidak memiliki akses ke halaman ini"
      pesan={
        sesi
          ? `Anda masuk sebagai ${LABEL_PERAN[sesi.peran].toLowerCase()}. Halaman ini khusus untuk peran lain. Kembali ke halaman Anda, atau keluar lalu masuk dengan akun yang sesuai.`
          : "Halaman ini khusus untuk peran tertentu. Masuk dengan akun yang sesuai untuk membukanya."
      }
      aksi={
        <>
          <TombolTautan href={sesi ? BERANDA_PERAN[sesi.peran] : "/masuk"}>
            {sesi ? "Kembali ke halaman saya" : "Masuk"}
          </TombolTautan>
          <TombolTautan href="/" varian="kedua">
            Ke beranda
          </TombolTautan>
        </>
      }
    />
  );
}
