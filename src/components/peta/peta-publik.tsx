"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChipStatus } from "@/components/ui/chip";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { cx } from "@/lib/cx";
import { KATEGORI_LAPORAN } from "@/lib/domain/kategori";
import type { StatusLaporan } from "@/lib/domain/laporan";
import { formatAngka, formatTanggal } from "@/lib/format";
import { PetaLaporan } from "./peta-laporan";

export type TitikPublik = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  kategoriSlug: string;
  kategoriNama: string;
  kecamatan: string;
  lat: number;
  lng: number;
  masukPada: string;
  selesaiPada: string | null;
  thumbSesudah: string | null;
};

/** Peta mini beranda: titik laporan terbaru dan bukti selesai. */
export function PetaMini({ titik }: { titik: TitikPublik[] }) {
  return <PetaLaporan titik={titik} className="h-72 rounded-md border border-garis md:h-96" interaktif={false} />;
}

const FILTER_STATUS = [
  { nilai: "", label: "Semua status" },
  { nilai: "proses", label: "Sedang ditangani" },
  { nilai: "selesai", label: "Selesai" },
  { nilai: "diteruskan", label: "Diteruskan" },
] as const;

function cocokStatus(s: StatusLaporan, f: string) {
  if (!f) return true;
  if (f === "selesai") return s === "RESOLVED";
  if (f === "diteruskan") return s === "FORWARDED";
  return ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(s);
}

/** Halaman /peta: peta penuh + panel filter, daftar, dan detail titik. */
export function PetaPenuh({ titik, kecamatan }: { titik: TitikPublik[]; kecamatan: string[] }) {
  const [fKec, setFKec] = useState("");
  const [fKat, setFKat] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [bukti, setBukti] = useState(true);
  const [pilih, setPilih] = useState<string | null>(null);

  const tampil = useMemo(
    () =>
      titik.filter(
        (t) => (!fKec || t.kecamatan === fKec) && (!fKat || t.kategoriSlug === fKat) && cocokStatus(t.status, fStatus),
      ),
    [titik, fKec, fKat, fStatus],
  );
  const terpilih = tampil.find((t) => t.id === pilih) ?? null;
  const kelasPilihan = "min-h-11 w-full rounded-sm border-2 border-garis-tegas bg-putih px-2 text-staf";

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      <aside aria-label="Filter dan daftar laporan" className="order-2 flex flex-col border-garis lg:order-1 lg:w-96 lg:shrink-0 lg:border-r">
        <div className="flex flex-col gap-3 border-b border-garis p-4">
          <h1 className="text-h3">Peta laporan Kota Medan</h1>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <label className="flex flex-col gap-1 text-kecil font-semibold">
              Kecamatan
              <select value={fKec} onChange={(e) => setFKec(e.target.value)} className={kelasPilihan}>
                <option value="">Semua kecamatan</option>
                {kecamatan.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-kecil font-semibold">
              Kategori
              <select value={fKat} onChange={(e) => setFKat(e.target.value)} className={kelasPilihan}>
                <option value="">Semua kategori</option>
                {KATEGORI_LAPORAN.map((k) => (
                  <option key={k.slug} value={k.slug}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-kecil font-semibold lg:col-span-1">
              Status
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={kelasPilihan}>
                {FILTER_STATUS.map((s) => (
                  <option key={s.nilai} value={s.nilai}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={bukti} onChange={(e) => setBukti(e.target.checked)} className="centang-rambu size-6" />
            <span className="font-semibold">Tampilkan bukti foto saat diperbesar</span>
          </label>
          <p className="text-kecil text-aspal-2" aria-live="polite">
            {formatAngka(tampil.length)} laporan tampil. Data simulasi prototipe.
          </p>
        </div>

        {terpilih && (
          <section aria-labelledby="judul-terpilih" className="flex flex-col gap-3 border-b border-garis bg-abu p-4">
            <div className="flex items-start gap-3">
              <PelatKategori slug={terpilih.kategoriSlug} />
              <div className="min-w-0">
                <p className="font-kode text-kecil text-aspal-2">{terpilih.kode}</p>
                <h2 id="judul-terpilih" className="font-bold break-words">
                  {terpilih.judul}
                </h2>
                <p className="text-kecil text-aspal-2">
                  {terpilih.kategoriNama}, {terpilih.kecamatan}
                </p>
              </div>
            </div>
            <ChipStatus status={terpilih.status} className="self-start" />
            {terpilih.thumbSesudah && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase
              <img
                src={terpilih.thumbSesudah}
                alt={`Foto sesudah perbaikan ${terpilih.kode}`}
                className="aspect-[4/3] w-full rounded-sm border-2 border-hijau object-cover"
              />
            )}
            <p className="text-kecil">
              Masuk {formatTanggal(terpilih.masukPada)}
              {terpilih.selesaiPada && `, selesai ${formatTanggal(terpilih.selesaiPada)}`}
            </p>
            <Link href={`/lacak/${terpilih.kode}`} className="tautan self-start font-semibold">
              Lihat detail dan bukti
            </Link>
          </section>
        )}

        <ul className="max-h-96 divide-y divide-garis overflow-y-auto lg:max-h-none lg:flex-1">
          {tampil.slice(0, 200).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setPilih(t.id)}
                aria-pressed={t.id === pilih}
                className={cx("flex w-full items-start gap-3 p-3 text-left hover:bg-abu", t.id === pilih && "bg-abu")}
              >
                <PelatKategori slug={t.kategoriSlug} ukuran="kecil" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold break-words">{t.judul}</span>
                  <span className="text-kecil text-aspal-2">
                    {t.kecamatan}, {formatTanggal(t.masukPada)}
                  </span>
                  <ChipStatus status={t.status} className="self-start" />
                </span>
              </button>
            </li>
          ))}
          {tampil.length === 0 && <li className="p-4">Tidak ada laporan yang cocok dengan filter ini. Coba hapus salah satu filter.</li>}
        </ul>
      </aside>

      <div className="order-1 h-[60dvh] lg:order-2 lg:h-full lg:flex-1">
        <PetaLaporan titik={tampil} className="h-full" tampilkanBukti={bukti} terpilih={pilih} onPilih={setPilih} />
      </div>
    </div>
  );
}
