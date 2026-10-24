import Image from "next/image";
import { cx } from "@/lib/cx";

/**
 * Logo "Medan Untuk Semua" (berkas asli di public/logo-medan-transparan.png, 500x88,
 * latar transparan, huruf putih). Ditaruh langsung di atas latar hero tanpa piring putih;
 * bayangan lembut menjaga tepinya tetap terbaca di latar gelap maupun terang.
 * Lebar mengikuti `font-size` elemen, jadi cukup beri kelas teks (mis. `text-h1`).
 */
export function LogoMedan({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex leading-none", className)}>
      <Image
        src="/logo-medan-transparan.png"
        alt="Medan Untuk Semua"
        width={500}
        height={88}
        preload
        className="bayang-logo h-auto w-[8.5em] max-w-full"
      />
    </span>
  );
}
