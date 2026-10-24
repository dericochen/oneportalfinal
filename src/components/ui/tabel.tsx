import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * Tabel: tampil penuh di ≥768 px. Di HP, halaman menyediakan `DaftarRingkas`
 * (3 info + status) sebagai pengganti. Angka rata kanan dengan tabular-nums.
 * Kolom pertama menempel saat tabel digulir horizontal di tablet.
 */

export function Tabel({ className, children, label, ...rest }: ComponentProps<"table"> & { label: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-garis" role="region" aria-label={label} tabIndex={0}>
      <table className={cx("w-full border-collapse text-left", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TabelKepala({ children }: { children: ReactNode }) {
  return <thead className="border-b-2 border-aspal bg-abu">{children}</thead>;
}

export function TabelBaris({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={cx("border-b border-garis last:border-b-0", className)} {...rest} />;
}

export function TabelSel({
  className,
  angka,
  menempel,
  ...rest
}: ComponentProps<"td"> & { angka?: boolean; menempel?: boolean }) {
  return (
    <td
      className={cx(
        "px-3 py-3 align-top",
        angka && "text-right tabular-nums",
        menempel && "sticky left-0 bg-putih",
        className,
      )}
      {...rest}
    />
  );
}

export function TabelJudulSel({
  className,
  angka,
  menempel,
  ...rest
}: ComponentProps<"th"> & { angka?: boolean; menempel?: boolean }) {
  return (
    <th
      scope="col"
      className={cx(
        "px-3 py-3 font-semibold whitespace-nowrap",
        angka && "text-right",
        menempel && "sticky left-0 bg-abu",
        className,
      )}
      {...rest}
    />
  );
}

/** Pengganti tabel di HP: setiap baris berupa tautan dengan 3 info + status. */
export function DaftarRingkas({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-garis rounded-md border border-garis">
      {children}
    </ul>
  );
}

export function ButirRingkas({
  href,
  judul,
  info,
  status,
  depan,
}: {
  /** Tanpa href, butir tampil sebagai teks biasa (bukan tautan). */
  href?: string;
  judul: ReactNode;
  info: ReactNode[];
  status?: ReactNode;
  depan?: ReactNode;
}) {
  const isi = (
    <>
      {depan}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold break-words">{judul}</span>
        <span className="flex flex-wrap gap-x-3 text-kecil text-aspal-2">
          {info.map((i, n) => (
            <span key={n}>{i}</span>
          ))}
        </span>
        {status && <span className="mt-1">{status}</span>}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex min-h-11 items-start gap-3 p-3 hover:bg-abu">
          {isi}
        </Link>
      ) : (
        <div className="flex min-h-11 items-start gap-3 p-3">{isi}</div>
      )}
    </li>
  );
}
