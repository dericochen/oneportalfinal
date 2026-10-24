import { WarningCircle } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Empty state: satu kalimat yang membantu + satu aksi. Tanpa ilustrasi. */
export function LayarKosong({ pesan, aksi, className }: { pesan: ReactNode; aksi?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-start gap-4 rounded-md border border-dashed border-garis-tegas p-6", className)}>
      <p className="max-w-baca">{pesan}</p>
      {aksi}
    </div>
  );
}

/** Error state dengan penjelasan spesifik dan tombol coba lagi (diisi pemanggil). */
export function PesanGagal({
  judul,
  pesan,
  aksi,
  className,
}: {
  judul: string;
  pesan?: ReactNode;
  aksi?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cx("flex flex-col items-start gap-3 rounded-md border-2 border-merah p-6", className)}>
      <p className="flex items-center gap-2 font-bold">
        <WarningCircle aria-hidden weight="fill" className="size-5 text-merah" />
        {judul}
      </p>
      {pesan && <p className="max-w-baca text-aspal-2">{pesan}</p>}
      {aksi}
    </div>
  );
}

/** Skeleton: blok abu statis (tanpa shimmer). */
export function Kerangka({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block rounded-sm bg-abu", className)} />;
}

/** Kerangka daftar: n baris ringkas, dengan teks untuk pembaca layar. */
export function KerangkaDaftar({ baris = 4, label = "Memuat daftar" }: { baris?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col divide-y divide-garis rounded-md border border-garis">
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Kerangka className="size-8" />
          <div className="flex flex-1 flex-col gap-2">
            <Kerangka className="h-5 w-3/5" />
            <Kerangka className="h-4 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
