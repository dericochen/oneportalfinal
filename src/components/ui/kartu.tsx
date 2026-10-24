import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

/**
 * Kartu hanya untuk objek yang bisa diklik (laporan, layanan, tugas), jadi
 * selalu berupa tautan. Saat disorot kartu terangkat 2 px dengan bayangan
 * embun dan tepi berubah hijau. Tanpa kartu di dalam kartu, tanpa garis warna
 * di sisi kiri.
 */
export function Kartu({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "block rounded-lg border border-garis bg-putih p-4 transition-[transform,box-shadow,border-color] duration-200 ease-keluar hover:-translate-y-0.5 hover:border-hutan hover:shadow-angkat",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}