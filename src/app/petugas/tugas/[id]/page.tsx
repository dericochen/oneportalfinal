import { ArrowSquareOut, Phone } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChipPrioritas, ChipSla, ChipStatus, ChipTindakan } from "@/components/ui/chip";
import { LogResi } from "@/components/ui/log-resi";
import { PanelAksiPetugas } from "@/components/laporan/panel-petugas";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { wajibPeran } from "@/lib/auth";
import { ambilDetailTugas } from "@/lib/data/tugas";
import { formatWaktu } from "@/lib/format";

export const metadata: Metadata = { title: "Detail tugas" };

/**
 * Detail tugas. Tugas milik petugas lain tidak terbaca (RLS) sehingga tampil
 * 404, bukan 403, agar keberadaannya tidak bocor. Tombol aksi (mulai, progres,
 * kirim bukti) ditambahkan di Fase 4.
 */
export default async function DetailTugas(props: PageProps<"/petugas/tugas/[id]">) {
  const { id } = await props.params;
  const sesi = await wajibPeran(["OFFICER"], `/petugas/tugas/${id}`);
  const t = await ambilDetailTugas(id);
  if (!t) notFound();

  const navigasi = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`;

  return (
    <article className="flex flex-col gap-6">
      <Link href="/petugas" className="tautan self-start">
        Kembali ke daftar tugas
      </Link>
      <header className="flex flex-col gap-3">
        {t.perluTindakan && <ChipTindakan className="self-start" />}
        <div className="flex items-start gap-3">
          <PelatKategori slug={t.kategoriSlug} ukuran="besar" label />
          <div className="min-w-0">
            <p className="font-kode text-aspal-2">{t.kode}</p>
            <h1 className="text-h2 break-words">{t.judul}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipStatus status={t.status} />
          {t.prioritas && <ChipPrioritas prioritas={t.prioritas} />}
          {t.sla && <ChipSla sla={t.sla} />}
        </div>
      </header>

      {t.perluTindakan && t.alasanKembali && (
        <section aria-labelledby="judul-kembali" className="rounded-md border-2 border-aspal bg-kuning p-4">
          <h2 id="judul-kembali" className="font-bold">
            Bukti dikembalikan admin
          </h2>
          <p className="mt-1">{t.alasanKembali}</p>
        </section>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
        <dt className="text-aspal-2">Lokasi</dt>
        <dd className="break-words">
          {t.alamat}, {t.kelurahan}, {t.kecamatan}
        </dd>
        <dt className="text-aspal-2">Masuk</dt>
        <dd>{formatWaktu(t.masukPada)}</dd>
        {t.tenggat && (
          <>
            <dt className="text-aspal-2">Tenggat</dt>
            <dd>{formatWaktu(t.tenggat)}</dd>
          </>
        )}
        <dt className="text-aspal-2">Pelapor</dt>
        <dd>
          {t.anonim ? (
            "Identitas disembunyikan pelapor"
          ) : t.hpPelapor ? (
            <a href={`tel:${t.hpPelapor.replace(/[^0-9+]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 tautan">
              <Phone aria-hidden className="size-5" />
              {t.hpPelapor}
            </a>
          ) : (
            "Pelapor tidak mencantumkan nomor HP"
          )}
        </dd>
      </dl>

      <a
        href={navigasi}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-sm border-2 border-aspal px-6 font-semibold hover:bg-abu"
      >
        <ArrowSquareOut aria-hidden className="size-5" />
        Navigasi ke lokasi (Google Maps)
      </a>

      <PanelAksiPetugas id={t.id} status={t.status} idPengguna={sesi.id} />

      <section aria-labelledby="judul-deskripsi">
        <h2 id="judul-deskripsi" className="text-h3">
          Deskripsi dari pelapor
        </h2>
        <p className="mt-2 max-w-baca break-words whitespace-pre-line">{t.deskripsi}</p>
      </section>

      <section aria-labelledby="judul-riwayat">
        <h2 id="judul-riwayat" className="mb-4 text-h3">
          Riwayat
        </h2>
        <LogResi kejadian={t.riwayat} />
      </section>
    </article>
  );
}
