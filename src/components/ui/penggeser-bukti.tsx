"use client";

import { useRef } from "react";
import { cx } from "@/lib/cx";

/**
 * Penggeser sebelum–sesudah (momen khas 4): dua foto bertumpuk, pegangan
 * vertikal. Dikendalikan input range sungguhan (bisa keyboard & pembaca layar).
 * Posisi diatur lewat variabel CSS dari ref, tanpa inline style di JSX.
 */
export function PenggeserBukti({
  sebelum,
  sesudah,
  labelSebelum,
  labelSesudah,
  alt,
  className,
}: {
  sebelum: string;
  sesudah: string;
  labelSebelum: string;
  labelSesudah: string;
  alt: string;
  className?: string;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const atur = (nilai: number) => wadah.current?.style.setProperty("--posisi", `${nilai}%`);

  return (
    <div
      ref={wadah}
      className={cx(
        "penggeser-bukti relative aspect-[4/3] w-full overflow-hidden rounded-md border border-garis bg-abu select-none",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
      <img src={sesudah} alt={`Sesudah: ${alt}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
      <div className="penggeser-sebelum absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
        <img src={sebelum} alt={`Sebelum: ${alt}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
      </div>
      <div aria-hidden className="penggeser-pegangan pointer-events-none absolute inset-y-0 w-0.5 bg-putih">
        <span className="absolute top-1/2 left-1/2 flex h-10 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border-2 border-aspal bg-putih">
          <span className="h-5 w-0.5 bg-aspal" />
        </span>
      </div>
      <span className="absolute top-2 left-2 rounded-sm bg-aspal px-2 py-0.5 text-kecil-staf font-semibold text-putih">{labelSebelum}</span>
      <span className="absolute top-2 right-2 rounded-sm bg-hijau px-2 py-0.5 text-kecil-staf font-semibold text-putih">{labelSesudah}</span>
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        aria-label="Geser untuk membandingkan foto sebelum dan sesudah"
        onInput={(e) => atur(Number(e.currentTarget.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
