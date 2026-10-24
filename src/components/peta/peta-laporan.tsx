"use client";

import Supercluster from "supercluster";
import { useEffect, useMemo, useState } from "react";
import { IKON_KATEGORI } from "@/components/ui/pelat-kategori";
import { cx } from "@/lib/cx";
import { KELOMPOK_STATUS, type KelompokStatus, type StatusLaporan } from "@/lib/domain/laporan";
import type { SlugKategori } from "@/lib/domain/kategori";
import { formatAngka } from "@/lib/format";
import { PUSAT_MEDAN } from "./gaya-peta";
import { CadanganPeta, KanvasPeta, PenandaPeta, usePeta } from "./kanvas-peta";

/**
 * Titik laporan di peta gratis (MapLibre + OpenFreeMap). Warna pin = kelompok
 * status (DESIGN.md), ikon kategori di dalam pin (tidak mengandalkan warna
 * saja). Momen khas 4: laporan Selesai pada zoom ≥15 berubah menjadi
 * thumbnail foto "sesudah" berbingkai hijau. Titik berdekatan dikelompokkan
 * (cluster) dengan jumlahnya; ketuk cluster untuk memperbesar.
 */
export type TitikMinimal = {
  id: string;
  kode: string;
  judul: string;
  status: StatusLaporan;
  kategoriSlug: string;
  lat: number;
  lng: number;
  thumbSesudah?: string | null;
};

const WARNA_KELOMPOK: Record<KelompokStatus, string> = {
  menunggu: "bg-aspal-2",
  dikerjakan: "bg-biru",
  selesai: "bg-hijau",
  ditolak: "bg-merah",
  dialihkan: "bg-aspal-2",
};

const ZOOM_BUKTI = 15;

function PinTitik({
  t,
  zoom,
  tampilkanBukti,
  terpilih,
  onPilih,
}: {
  t: TitikMinimal;
  zoom: number;
  tampilkanBukti: boolean;
  terpilih: boolean;
  onPilih?: (id: string) => void;
}) {
  const Ikon = IKON_KATEGORI[t.kategoriSlug as SlugKategori] ?? IKON_KATEGORI.lainnya;
  const warna = WARNA_KELOMPOK[KELOMPOK_STATUS[t.status]];
  const bukti = tampilkanBukti && t.status === "RESOLVED" && t.thumbSesudah && zoom >= ZOOM_BUKTI;
  const nama = `${t.kode}: ${t.judul}`;

  return (
    <PenandaPeta lat={t.lat} lng={t.lng} anchor="bottom" zIndex={terpilih ? 900 : 1}>
      <button
        type="button"
        onClick={() => onPilih?.(t.id)}
        aria-label={nama}
        aria-pressed={terpilih}
        title={nama}
        className={cx(
          "group relative block animate-pin cursor-pointer pb-2 transition-transform duration-200 ease-keluar hover:-translate-y-0.5",
          terpilih && "z-10 scale-125",
        )}
      >
        {terpilih && <span aria-hidden className="absolute top-0 left-1/2 size-9 -translate-x-1/2 animate-cincin rounded-full border-2 border-kuning" />}
        {bukti ? (
          <span className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL kedaluwarsa, tidak perlu optimasi */}
            <img
              src={t.thumbSesudah!}
              alt={`Foto sesudah perbaikan ${t.kode}`}
              width={56}
              height={42}
              loading="lazy"
              className="block h-[42px] w-14 rounded-sm border-2 border-hijau bg-pasir object-cover shadow-embun"
            />
            <span aria-hidden className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-hijau bg-putih" />
          </span>
        ) : (
          <span className={cx("relative flex size-9 items-center justify-center rounded-full border-2 border-putih text-putih shadow-embun", warna)}>
            <Ikon aria-hidden weight="fill" className="size-[18px]" />
            <span aria-hidden className={cx("absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-putih", warna)} />
          </span>
        )}
      </button>
    </PenandaPeta>
  );
}

function PinCluster({ lat, lng, jumlah, onKlik }: { lat: number; lng: number; jumlah: number; onKlik: () => void }) {
  const ukuran = jumlah >= 50 ? "size-14 text-staf" : jumlah >= 10 ? "size-12 text-kecil" : "size-10 text-kecil-staf";
  return (
    <PenandaPeta lat={lat} lng={lng} zIndex={500 + jumlah}>
      <button
        type="button"
        onClick={onKlik}
        aria-label={`${formatAngka(jumlah)} laporan berdekatan, ketuk untuk memperbesar`}
        className={cx(
          "flex animate-pin cursor-pointer items-center justify-center rounded-full border-2 border-putih bg-hutan font-bold text-putih shadow-embun ring-4 ring-lumut/70 transition-transform duration-200 ease-keluar hover:scale-105",
          ukuran,
        )}
      >
        {formatAngka(jumlah)}
      </button>
    </PenandaPeta>
  );
}

type Pandangan = { zoom: number; batas: [number, number, number, number] };

/** Zoom dan batas peta saat ini; diperbarui setelah peta selesai bergerak. */
function usePandangan(): Pandangan {
  const { peta } = usePeta();
  const baca = (): Pandangan => {
    const b = peta.getBounds();
    return { zoom: peta.getZoom(), batas: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] };
  };
  const [p, setP] = useState<Pandangan>(baca);
  useEffect(() => {
    const perbarui = () => setP(baca());
    peta.on("moveend", perbarui);
    peta.on("resize", perbarui);
    return () => {
      peta.off("moveend", perbarui);
      peta.off("resize", perbarui);
    };
    // baca hanya bergantung pada peta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peta]);
  return p;
}

function LapisTitik({
  titik,
  tampilkanBukti,
  terpilih,
  onPilih,
  cluster,
}: {
  titik: TitikMinimal[];
  tampilkanBukti: boolean;
  terpilih?: string | null;
  onPilih?: (id: string) => void;
  cluster: boolean;
}) {
  const { peta } = usePeta();
  const { zoom, batas } = usePandangan();

  const indeks = useMemo(() => {
    const sc = new Supercluster<{ id: string }>({ radius: 56, maxZoom: ZOOM_BUKTI - 1, minPoints: 2 });
    sc.load(titik.map((t) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [t.lng, t.lat] }, properties: { id: t.id } })));
    return sc;
  }, [titik]);
  const peta_id = useMemo(() => new Map(titik.map((t) => [t.id, t])), [titik]);

  const fitur = useMemo(() => {
    if (!cluster) return titik.map((t) => ({ kunci: t.id, titik: t }));
    return indeks.getClusters(batas, Math.floor(zoom)).map((f) => {
      if ("cluster" in f.properties && f.properties.cluster) return { kunci: `c${f.properties.cluster_id}`, cluster: f };
      return { kunci: (f.properties as { id: string }).id, titik: peta_id.get((f.properties as { id: string }).id)! };
    });
  }, [cluster, indeks, batas, zoom, titik, peta_id]);

  return (
    <>
      {fitur.map((f) => {
        if ("cluster" in f && f.cluster) {
          const [lng, lat] = f.cluster.geometry.coordinates;
          const props = f.cluster.properties as { cluster_id: number; point_count: number };
          return (
            <PinCluster
              key={f.kunci}
              lat={lat}
              lng={lng}
              jumlah={props.point_count}
              onKlik={() =>
                peta.easeTo({ center: [lng, lat], zoom: Math.min(indeks.getClusterExpansionZoom(props.cluster_id) + 0.25, 18), essential: false })
              }
            />
          );
        }
        const t = (f as { titik: TitikMinimal }).titik;
        return <PinTitik key={f.kunci} t={t} zoom={zoom} tampilkanBukti={tampilkanBukti} terpilih={terpilih === t.id} onPilih={onPilih} />;
      })}
    </>
  );
}

/** Arahkan peta ke titik terpilih dengan animasi terbang. */
function IkutiTerpilih({ titik, terpilih }: { titik: TitikMinimal[]; terpilih?: string | null }) {
  const { peta } = usePeta();
  useEffect(() => {
    const t = titik.find((x) => x.id === terpilih);
    if (t) peta.flyTo({ center: [t.lng, t.lat], zoom: Math.max(peta.getZoom(), 15.5), speed: 1.3, essential: false });
    // hanya saat pilihan berubah, bukan saat daftar disaring
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peta, terpilih]);
  return null;
}

export function PetaLaporan({
  titik,
  className,
  zoomAwal = 12,
  pusat = PUSAT_MEDAN,
  tampilkanBukti = true,
  terpilih,
  onPilih,
  cluster = true,
  label = "Peta laporan Kota Medan",
  interaktif = true,
}: {
  titik: TitikMinimal[];
  className?: string;
  zoomAwal?: number;
  pusat?: { lat: number; lng: number };
  tampilkanBukti?: boolean;
  terpilih?: string | null;
  onPilih?: (id: string) => void;
  cluster?: boolean;
  label?: string;
  /** false = gestur koperasi: halaman tetap bisa digulir di atas peta. */
  interaktif?: boolean;
}) {
  return (
    <KanvasPeta
      pusat={pusat}
      zoom={zoomAwal}
      label={label}
      className={className}
      koperasi={!interaktif}
      cadangan={<CadanganPeta jumlah={titik.length} className="absolute inset-0" />}
    >
      <LapisTitik titik={titik} tampilkanBukti={tampilkanBukti} terpilih={terpilih} onPilih={onPilih} cluster={cluster} />
      <IkutiTerpilih titik={titik} terpilih={terpilih} />
    </KanvasPeta>
  );
}
