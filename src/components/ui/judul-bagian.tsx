import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { BungaTampuk } from "./ornamen";

/**
 * Judul bagian halaman publik: tampuk manggis kecil + judul hijau hutan, garis
 * emas yang tergambar saat muncul (hiasan), dan paragraf pengantar opsional.
 * Satu pola untuk semua bagian supaya ritme halaman konsisten.
 */
export function JudulBagian({
  id,
  judul,
  children,
  className,
  tingkat = 2,
}: {
  id?: string;
  judul: ReactNode;
  children?: ReactNode;
  className?: string;
  tingkat?: 1 | 2;
}) {
  const Judul = tingkat === 1 ? "h1" : "h2";
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <span aria-hidden className="flex items-center gap-2 text-emas">
        <BungaTampuk className="size-5 animate-putar-pelan" />
        <span className="h-px w-10 bg-emas/60" />
      </span>
      <Judul id={id} className={cx("text-hutan", tingkat === 1 ? "text-h1" : "text-h2")}>
        {judul}
      </Judul>
      <span aria-hidden className="garis-judul block h-1 w-14 rounded-sm bg-emas" />
      {children && <p className="max-w-baca text-aspal-2">{children}</p>}
    </div>
  );
}
