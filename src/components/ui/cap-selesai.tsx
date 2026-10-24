import { cx } from "@/lib/cx";
import { formatTanggal } from "@/lib/format";

/**
 * Momen khas 3: cap "SELESAI". Stempel hijau miring −4° dengan tepi sedikit
 * tidak rata (filter displacement halus). `baru` memutar animasi masuk sekali,
 * dipakai tepat setelah admin menyetujui bukti. Hanya dipakai di resi, halaman
 * lacak, dan panel laporan selesai di peta.
 */
export function CapSelesai({
  tanggal,
  baru,
  ukuran = "normal",
  className,
}: {
  tanggal: string | Date;
  baru?: boolean;
  ukuran?: "kecil" | "normal";
  className?: string;
}) {
  const teksTanggal = formatTanggal(tanggal);
  return (
    <span
      role="img"
      aria-label={`Cap selesai, disetujui ${teksTanggal}`}
      className={cx("inline-block text-hijau", ukuran === "kecil" ? "w-36" : "w-52", baru && "animate-cap", className)}
    >
      <svg viewBox="0 0 220 104" className="block h-auto w-full overflow-visible" aria-hidden>
        <defs>
          <filter id="tepi-cap" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="derau" />
            <feDisplacementMap in="SourceGraphic" in2="derau" scale="2.4" />
          </filter>
        </defs>
        <g transform="rotate(-4 110 52)" filter="url(#tepi-cap)" fill="none" stroke="currentColor">
          <rect x="6" y="8" width="208" height="88" rx="6" strokeWidth="5" />
          <rect x="14" y="16" width="192" height="72" rx="3" strokeWidth="1.6" />
          <text
            x="110"
            y="60"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontFamily="var(--font-atkinson), sans-serif"
            fontWeight="800"
            fontSize="40"
            letterSpacing="4"
          >
            SELESAI
          </text>
          <text
            x="110"
            y="79"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontFamily="var(--font-atkinson), sans-serif"
            fontWeight="700"
            fontSize="12.5"
          >
            {`Disetujui ${teksTanggal}`}
          </text>
        </g>
      </svg>
    </span>
  );
}
