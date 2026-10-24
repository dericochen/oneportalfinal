import { cx } from "@/lib/cx";

/**
 * Ornamen Nusantara (murni dekoratif, aria-hidden), bergaya garis datar,
 * terinspirasi ragam hias Melayu Deli dan Batak:
 * - BungaTampuk: tampuk manggis, bunga delapan kelopak (tengah judul).
 * - PembatasSongket: pembatas tengah judul (garis + tampuk + belah ketupat).
 * - PitaSongket: pita songket berulang untuk pemisah antarbagian; bergerak pelan.
 * Warna mengikuti currentColor.
 */
export function BungaTampuk({ className }: { className?: string }) {
  return (
    <svg viewBox="-20 -20 40 40" aria-hidden focusable="false" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        {[0, 45, 90, 135].map((r) => (
          <path key={r} transform={`rotate(${r})`} d="M0-17C5-11 5-6 0-3-5-6-5-11 0-17ZM0 17C5 11 5 6 0 3-5 6-5 11 0 17Z" />
        ))}
        <circle r="3.2" fill="currentColor" />
      </g>
    </svg>
  );
}

export function PembatasSongket({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("flex items-center gap-2 text-emas", className)}>
      <span className="h-0.5 w-8 origin-right rounded-sm bg-current [animation:sapuan_700ms_var(--ease-keluar)_both]" />
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
        <path d="M6 0 12 6 6 12 0 6Z" fill="currentColor" />
      </svg>
      <BungaTampuk className="size-6 animate-putar-pelan" />
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
        <path d="M6 0 12 6 6 12 0 6Z" fill="currentColor" />
      </svg>
      <span className="h-0.5 w-8 origin-left rounded-sm bg-current [animation:sapuan_700ms_var(--ease-keluar)_both]" />
    </span>
  );
}

/** Pita songket penuh lebar. `nada`: emas di latar terang, putih di latar gelap. */
export function PitaSongket({ className, nada = "emas" }: { className?: string; nada?: "emas" | "hutan" | "putih" }) {
  return (
    <div
      aria-hidden
      className={cx(
        "pita-songket h-6 w-full animate-pita",
        nada === "emas" && "pita-songket-emas",
        nada === "hutan" && "pita-songket-hutan",
        nada === "putih" && "pita-songket-putih",
        className,
      )}
    />
  );
}
