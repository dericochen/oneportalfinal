import type { Metadata } from "next";
import Link from "next/link";
import { PengelolaSlide } from "@/components/staf/pengelola-slide";
import { PesanGagal } from "@/components/ui/keadaan";
import { wajibPeran } from "@/lib/auth";
import { ambilSemuaSlide } from "@/lib/data/slide";
import { DURASI_SLIDE_MS, MAKS_SLIDE_TAMPIL } from "@/lib/domain/slide";

export const metadata: Metadata = { title: "Slide beranda" };

/** CMS: admin mengatur foto slideshow di hero beranda. */
export default async function HalamanSlide() {
  await wajibPeran(["ADMIN"], "/admin/slide");
  const slide = await ambilSemuaSlide();
  const tampil = slide?.filter((s) => s.status === "tampil").length ?? 0;

  return (
    <div className="flex max-w-daftar flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Slide beranda</h1>
        <p className="max-w-baca text-aspal-2">
          Foto di bagian atas beranda berganti tiap {DURASI_SLIDE_MS / 1000} detik, sesuai urutan di bawah. Atur foto, urutan,
          tautan, dan jadwal tampil di sini.{" "}
          <Link href="/" className="tautan">
            Lihat beranda
          </Link>
        </p>
      </header>

      {slide === null ? (
        <PesanGagal judul="Daftar slide belum termuat" pesan="Data tidak dapat diambil. Muat ulang halaman ini." />
      ) : (
        <>
          {tampil === 0 && (
            <p className="rounded-md border-2 border-aspal p-4">
              Belum ada slide yang tampil. Beranda sementara memakai tiga slide teks bawaan.
            </p>
          )}
          {tampil > MAKS_SLIDE_TAMPIL && (
            <p role="status" className="rounded-md border-2 border-oranye p-4">
              Ada {tampil} slide yang tampil, tetapi beranda hanya menampilkan {MAKS_SLIDE_TAMPIL} yang teratas. Nonaktifkan atau hapus
              sisanya.
            </p>
          )}
          <PengelolaSlide slide={slide} />
        </>
      )}
    </div>
  );
}
