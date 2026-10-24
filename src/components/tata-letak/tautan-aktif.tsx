"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { cx } from "@/lib/cx";

/**
 * Tautan navigasi yang tahu dirinya sedang aktif (aria-current="page").
 * Isi (ikon + label) dirender di server dan dikirim sebagai children.
 * `persis`: aktif hanya bila path sama persis (untuk tautan beranda area).
 * Tautan ber-query (mis. ?antrean=terhapus) aktif hanya bila query-nya cocok;
 * tautan tanpa query tidak aktif saat halaman sedang memakai query `antrean`
 * milik tautan lain di menu yang sama.
 */
type Props = { href: string; persis?: boolean; className?: string; kelasAktif?: string; children: ReactNode };

function Isi({ href, persis, className, kelasAktif, children, sp }: Props & { sp: URLSearchParams | null }) {
  const path = usePathname();
  const [jalur, query] = href.split("?");
  let aktif = persis ? path === jalur : path === jalur || path.startsWith(`${jalur}/`);
  if (aktif && sp) {
    const q = new URLSearchParams(query ?? "");
    if (query) aktif = [...q].every(([k, v]) => sp.get(k) === v);
    else if (path === jalur && sp.get("antrean") === "terhapus") aktif = false;
  }
  return (
    <Link href={href} aria-current={aktif ? "page" : undefined} className={cx(className, aktif && kelasAktif)}>
      {children}
    </Link>
  );
}

function DenganQuery(p: Props) {
  const sp = useSearchParams();
  return <Isi {...p} sp={sp} />;
}

export function TautanAktif(p: Props) {
  // useSearchParams butuh Suspense; cadangan memakai pencocokan path saja.
  return (
    <Suspense fallback={<Isi {...p} sp={null} />}>
      <DenganQuery {...p} />
    </Suspense>
  );
}
