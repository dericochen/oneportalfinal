import Link from "next/link";
import { cx } from "@/lib/cx";

/**
 * Wordmark ONE PORTAL: Atkinson Hyperlegible Next ExtraBold; huruf O pertama
 * diganti tanda titik lokasi. Datar, satu warna.
 */
function TandaO({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 26" aria-hidden className={cx("inline-block h-[1.02em] w-auto shrink-0", className)}>
      {/* Pin lokasi berlubang: membaca sebagai huruf O */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M10 0C4.5 0 0 4.4 0 9.9 0 17 10 26 10 26s10-9 10-16.1C20 4.4 15.5 0 10 0Zm0 4.6a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6Z"
      />
    </svg>
  );
}

const ukuranTeks = { kecil: "text-kecil", normal: "text-h3", besar: "text-h2" } as const;

export function Logo({
  ukuran = "normal",
  href,
  className,
}: {
  ukuran?: keyof typeof ukuranTeks;
  href?: string;
  className?: string;
}) {
  const isi = (
    <span
      className={cx("inline-flex items-end gap-[0.06em] leading-none font-extrabold tracking-tight whitespace-nowrap", ukuranTeks[ukuran], className)}
    >
      <TandaO />
      <span aria-hidden>NE PORTAL</span>
      <span className="sr-only">ONE PORTAL</span>
    </span>
  );
  if (!href) return isi;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center" aria-label="ONE PORTAL, ke beranda">
      {isi}
    </Link>
  );
}
