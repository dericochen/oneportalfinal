import { ArrowBendUpRight, GitMerge, Repeat, XCircle } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarTahap } from "@/components/laporan/bar-tahap";
import { CapSelesai } from "@/components/ui/cap-selesai";
import { ChipPrioritas, ChipSla, ChipStatus } from "@/components/ui/chip";
import { PesanGagal } from "@/components/ui/keadaan";
import { LogResi } from "@/components/ui/log-resi";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { PenggeserBukti } from "@/components/ui/penggeser-bukti";
import { TombolSalin } from "@/components/ui/tombol-salin";
import { ambilLacak, type DataLacak } from "@/lib/data/publik";
import { POLA_KODE_LAPORAN, type Prioritas } from "@/lib/domain/laporan";
import { formatAngka, formatDurasi, formatTanggal, formatTanggalPendek, formatWaktu } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/lacak/[kode]">): Promise<Metadata> {
  const { kode } = await props.params;
  return { title: `Lacak ${decodeURIComponent(kode).toUpperCase()}`, robots: { index: false } };
}

/** Satu kalimat jelas tentang posisi laporan saat ini. */
function kalimatStatus(d: DataLacak): string {
  const instansi = d.instansiSingkat ?? "instansi terkait";
  switch (d.status) {
    case "SUBMITTED":
      return `Laporan diterima pada ${formatWaktu(d.waktu.masuk!)} dan menunggu diverifikasi admin.`;
    case "VERIFIED":
      return `Laporan sudah diverifikasi dan akan ditangani ${instansi}.`;
    case "ASSIGNED":
      return `Ditugaskan ke petugas ${instansi} sejak ${formatWaktu(d.waktu.ditugaskan!)}.`;
    case "IN_PROGRESS":
      return `Sedang dikerjakan petugas ${instansi} sejak ${formatWaktu(d.waktu.mulai!)}.`;
    case "UNDER_REVIEW":
      return "Petugas sudah mengirim bukti foto. Admin sedang memeriksanya sebelum laporan dinyatakan selesai.";
    case "RESOLVED":
      return `Selesai pada ${formatWaktu(d.waktu.selesai!)}. Bukti foto sudah diperiksa dan disetujui admin.`;
    case "REJECTED":
      return "Laporan ini tidak dapat ditindaklanjuti.";
    case "FORWARDED":
      return `Masalah ini bukan kewenangan Pemko Medan dan sudah diteruskan ke ${d.diteruskan?.nama ?? "instansi berwenang"}.`;
    case "MERGED":
      return "Laporan ini digabungkan dengan laporan lain yang menangani masalah yang sama.";
  }
}

export default async function HalamanLacakKode(props: PageProps<"/lacak/[kode]">) {
  const kode = decodeURIComponent((await props.params).kode).toUpperCase();
  if (!POLA_KODE_LAPORAN.test(kode)) notFound();
  const d = await ambilLacak(kode);
  if (d === "galat") {
    return (
      <div className="mx-auto max-w-daftar px-4 py-12">
        <PesanGagal judul="Status laporan belum termuat" pesan="Server data tidak dapat dihubungi. Muat ulang halaman ini." />
      </div>
    );
  }
  if (!d) notFound();

  const sebelum = d.foto.find((f) => f.jenis === "BEFORE");
  const sesudah = d.foto.find((f) => f.jenis === "AFTER");
  const fotoAwal = d.foto.filter((f) => f.jenis === "INITIAL");
  const fotoProgres = d.foto.filter((f) => f.jenis === "PROGRESS");
  const selesai = d.status === "RESOLVED";
  const lama = d.waktu.selesai && d.waktu.masuk ? (Date.parse(d.waktu.selesai) - Date.parse(d.waktu.masuk)) / 3600e3 : null;

  return (
    <div className="mx-auto flex w-full max-w-daftar flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-col gap-4">
        <Link href="/lacak" className="tautan self-start">
          Lacak kode lain
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-kode text-kode-besar font-bold break-all">{d.kode}</h1>
          <TombolSalin teks={d.kode} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipStatus status={d.status} />
          {d.prioritas && <ChipPrioritas prioritas={d.prioritas as Prioritas} />}
          {d.sla && <ChipSla sla={d.sla} />}
        </div>
        <p className="max-w-baca text-h3 font-semibold">{kalimatStatus(d)}</p>
      </header>

      {selesai && (
        <section id="bukti" aria-labelledby="judul-bukti" className="flex scroll-mt-24 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="judul-bukti" className="text-h2">
              Bukti penyelesaian
            </h2>
            <CapSelesai tanggal={d.waktu.selesai!} />
          </div>
          {sebelum && sesudah ? (
            <PenggeserBukti
              sebelum={sebelum.url}
              sesudah={sesudah.url}
              labelSebelum={`Sebelum, ${formatTanggalPendek(d.waktu.masuk!)}`}
              labelSesudah={`Sesudah, ${formatTanggalPendek(d.waktu.selesai!)}`}
              alt={d.judul ?? d.kode}
              className="max-w-3xl"
            />
          ) : (
            <p className="text-aspal-2">Foto bukti laporan ini tidak ditampilkan untuk publik.</p>
          )}
          <dl className="grid max-w-3xl grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="text-aspal-2">Selesai</dt>
            <dd>{formatWaktu(d.waktu.selesai!)}</dd>
            {lama !== null && (
              <>
                <dt className="text-aspal-2">Lama penanganan</dt>
                <dd>{formatDurasi(lama)}</dd>
              </>
            )}
            {d.instansi && (
              <>
                <dt className="text-aspal-2">Dikerjakan oleh</dt>
                <dd>{d.instansi}</dd>
              </>
            )}
            {d.bukti && (
              <>
                <dt className="text-aspal-2">Pekerjaan</dt>
                <dd className="break-words">{d.bukti.deskripsi}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {d.status === "REJECTED" && (
        <section className="flex gap-3 rounded-md border-2 border-merah p-4">
          <XCircle aria-hidden weight="fill" className="size-6 shrink-0 text-merah" />
          <div>
            <h2 className="font-bold">Alasan penolakan</h2>
            <p className="mt-1">{d.alasanTolak}</p>
          </div>
        </section>
      )}
      {d.status === "FORWARDED" && d.diteruskan && (
        <section className="flex gap-3 rounded-md border-2 border-aspal p-4">
          <ArrowBendUpRight aria-hidden weight="bold" className="size-6 shrink-0" />
          <div className="flex flex-col gap-1">
            <h2 className="font-bold">Diteruskan ke {d.diteruskan.nama}</h2>
            {d.diteruskan.catatan && <p>{d.diteruskan.catatan}</p>}
            {d.diteruskan.telepon && (
              <a href={`tel:${d.diteruskan.telepon.replace(/[^0-9+]/g, "")}`} className="tautan">
                Hubungi {d.diteruskan.telepon}
              </a>
            )}
            {d.diteruskan.situs && (
              <a href={d.diteruskan.situs} className="tautan" rel="noopener noreferrer" target="_blank">
                Situs {d.diteruskan.nama}
              </a>
            )}
          </div>
        </section>
      )}
      {d.status === "MERGED" && d.kodeInduk && (
        <section className="flex gap-3 rounded-md border-2 border-aspal p-4">
          <GitMerge aria-hidden weight="bold" className="size-6 shrink-0" />
          <p>
            Ikuti perkembangannya di laporan{" "}
            <Link href={`/lacak/${d.kodeInduk}`} className="tautan font-kode font-semibold">
              {d.kodeInduk}
            </Link>
            .
          </p>
        </section>
      )}
      {d.sebelumnya && (
        <section className="flex gap-3 rounded-md border-2 border-oranye p-4">
          <Repeat aria-hidden weight="bold" className="size-6 shrink-0 text-oranye" />
          <p>
            Laporan berulang. Masalah di titik ini pernah tercatat selesai
            {d.sebelumnya.selesaiPada && ` pada ${formatTanggal(d.sebelumnya.selesaiPada)}`} lewat laporan{" "}
            <Link href={`/lacak/${d.sebelumnya.kode}`} className="tautan font-kode font-semibold">
              {d.sebelumnya.kode}
            </Link>
            .
          </p>
        </section>
      )}

      {!["REJECTED", "FORWARDED", "MERGED"].includes(d.status) && (
        <section aria-labelledby="judul-tahap">
          <h2 id="judul-tahap" className="sr-only">
            Tahap penanganan
          </h2>
          <BarTahap
            status={d.status}
            waktu={{
              SUBMITTED: d.waktu.masuk,
              VERIFIED: d.waktu.diverifikasi,
              ASSIGNED: d.waktu.ditugaskan,
              IN_PROGRESS: d.waktu.mulai,
              UNDER_REVIEW: d.waktu.bukti,
              RESOLVED: d.waktu.selesai,
            }}
          />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="judul-riwayat">
          <h2 id="judul-riwayat" className="mb-4 text-h2">
            Riwayat
          </h2>
          <LogResi kejadian={d.riwayat} />
        </section>

        <aside aria-labelledby="judul-info" className="flex flex-col gap-4">
          <h2 id="judul-info" className="text-h3">
            Keterangan
          </h2>
          <div className="flex items-center gap-3">
            <PelatKategori slug={d.kategoriSlug} />
            <span className="font-semibold">{d.kategoriNama}</span>
          </div>
          {d.judul && <p className="font-semibold break-words">{d.judul}</p>}
          <dl className="flex flex-col gap-2">
            <div>
              <dt className="text-kecil text-aspal-2">Lokasi</dt>
              <dd className="break-words">
                {d.alamat ? `${d.alamat}, ` : ""}
                {d.kelurahan}, {d.kecamatan}
              </dd>
            </div>
            {d.instansi && (
              <div>
                <dt className="text-kecil text-aspal-2">Instansi</dt>
                <dd>{d.instansi}</dd>
              </div>
            )}
            {d.tenggat && !selesai && (
              <div>
                <dt className="text-kecil text-aspal-2">Target selesai</dt>
                <dd>{formatWaktu(d.tenggat)}</dd>
              </div>
            )}
            <div>
              <dt className="text-kecil text-aspal-2">Warga terdampak</dt>
              <dd>{formatAngka(d.terdampak)} warga</dd>
            </div>
          </dl>
          {d.deskripsi && <p className="text-aspal-2 break-words whitespace-pre-line">{d.deskripsi}</p>}
          {!d.tampil && (
            <p className="text-kecil text-aspal-2">
              Judul, deskripsi, dan foto tampil untuk publik setelah laporan diverifikasi dan bila pelapor tidak memilih laporan rahasia.
            </p>
          )}
        </aside>
      </div>

      {(fotoAwal.length > 0 || fotoProgres.length > 0) && (
        <section aria-labelledby="judul-foto" className="flex flex-col gap-4">
          <h2 id="judul-foto" className="text-h2">
            Dokumentasi
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[...fotoAwal, ...fotoProgres].map((f, i) => (
              <li key={i} className="flex flex-col gap-1">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
                  <img src={f.thumb} alt={f.jenis === "INITIAL" ? "Foto dari pelapor" : "Foto perkembangan pekerjaan"} loading="lazy" className="aspect-[4/3] w-full rounded-sm border border-garis object-cover" />
                </a>
                <span className="text-kecil text-aspal-2">{f.jenis === "INITIAL" ? "Foto pelapor" : "Progres pekerjaan"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
