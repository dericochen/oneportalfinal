import type { Metadata } from "next";
import { HalamanKendala } from "@/components/tata-letak/halaman-kendala";
import { TombolTautan } from "@/components/ui/tombol";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

// Pencarian layanan dan tautan Lapor/Lacak ditambahkan saat fiturnya tersedia (Fase 1–2).
export default function TidakDitemukan() {
  return (
    <HalamanKendala
      kode="404"
      judul="Halaman ini tidak ditemukan"
      pesan="Alamatnya mungkin salah ketik, atau datanya sudah tidak tersedia. Jika Anda membuka laporan atau tugas, pastikan laporan itu milik akun yang sedang masuk."
      aksi={
        <>
          <TombolTautan href="/">Ke beranda</TombolTautan>
          <TombolTautan href="/masuk" varian="kedua">
            Masuk dengan akun lain
          </TombolTautan>
        </>
      }
    />
  );
}
