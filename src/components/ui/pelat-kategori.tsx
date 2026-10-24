import {
  Buildings,
  DotsThreeOutline,
  Drop,
  Lightbulb,
  Park,
  RoadHorizon,
  TrafficSign,
  Trash,
  Tree,
  Waves,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cx } from "@/lib/cx";
import { KATEGORI_LAPORAN, type SlugKategori } from "@/lib/domain/kategori";

/** Piktogram putih (Fill) di atas persegi hijau hutan, seperti rambu. */
export const IKON_KATEGORI: Record<SlugKategori, Icon> = {
  "jalan-rusak": RoadHorizon,
  "drainase-banjir": Waves,
  sampah: Trash,
  "lampu-jalan": Lightbulb,
  "air-bersih": Drop,
  "fasilitas-umum": Park,
  "lalu-lintas": TrafficSign,
  "pohon-bencana": Tree,
  "pelayanan-publik": Buildings,
  lainnya: DotsThreeOutline,
};

const ukuran = {
  kecil: { kotak: "size-6", ikon: "size-4" },
  sedang: { kotak: "size-8", ikon: "size-5" },
  besar: { kotak: "size-12", ikon: "size-8" },
} as const;

export function PelatKategori({
  slug,
  ukuran: u = "sedang",
  label,
  className,
}: {
  slug: string;
  ukuran?: keyof typeof ukuran;
  /** Jika diisi, nama kategori dibacakan pembaca layar. Default: dekoratif. */
  label?: boolean;
  className?: string;
}) {
  const Ikon = IKON_KATEGORI[slug as SlugKategori] ?? DotsThreeOutline;
  const nama = KATEGORI_LAPORAN.find((k) => k.slug === slug)?.nama ?? "Lainnya";
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label ? nama : undefined}
      aria-hidden={label ? undefined : true}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-md bg-hutan text-putih", ukuran[u].kotak, className)}
    >
      <Ikon weight="fill" className={ukuran[u].ikon} />
    </span>
  );
}
