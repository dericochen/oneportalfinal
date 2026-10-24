import { cx } from "@/lib/cx";

/**
 * Hiasan natural (murni dekoratif, selalu aria-hidden): daun, ranting, dan
 * kelompok daun melayang untuk hero. Warna mengikuti `currentColor`, jadi cukup
 * beri kelas teks (mis. `text-daun/40`). Gerak memakai transform saja dan
 * dimatikan oleh `prefers-reduced-motion`.
 */

const JALUR_DAUN = "M0 0C20-22 24-52 0-90-24-52-20-22 0 0Z";

/** Satu daun berurat tengah. */
export function Daun({ className }: { className?: string }) {
  return (
    <svg viewBox="-28 -96 56 100" aria-hidden focusable="false" className={className}>
      <path d={JALUR_DAUN} fill="currentColor" />
      <path d="M0-4V-78" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-putih/45" />
    </svg>
  );
}

const DAUN_RANTING = [
  { x: 40, y: 236, r: -72, s: 0.52 },
  { x: 54, y: 208, r: 58, s: 0.58 },
  { x: 68, y: 170, r: -66, s: 0.62 },
  { x: 84, y: 144, r: 60, s: 0.62 },
  { x: 98, y: 106, r: -62, s: 0.58 },
  { x: 110, y: 78, r: 54, s: 0.52 },
  { x: 119, y: 48, r: -48, s: 0.46 },
  { x: 123, y: 24, r: 6, s: 0.44 },
];

/** Ranting melengkung dengan delapan daun. */
export function RantingDaun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 300" aria-hidden focusable="false" className={className}>
      <path d="M12 296C50 220 70 150 123 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {DAUN_RANTING.map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.r}) scale(${d.s})`}>
          <path d={JALUR_DAUN} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Daun-daun yang melayang pelan di latar hero. Letakkan di dalam wadah `relative overflow-hidden`. */
export function DaunMelayang({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Daun className="absolute top-[8%] left-[4%] h-24 w-auto animate-melayang-1 text-daun/45" />
      <Daun className="absolute top-[58%] left-[10%] h-14 w-auto animate-melayang-2 text-lumut/25" />
      <Daun className="absolute top-[14%] left-[46%] h-16 w-auto animate-melayang-3 text-emas/35" />
      <Daun className="absolute top-[70%] left-[52%] h-20 w-auto animate-melayang-1 text-daun/35" />
      <Daun className="absolute top-[6%] right-[6%] h-12 w-auto animate-melayang-2 text-lumut/30" />
      <Daun className="absolute right-[3%] bottom-[18%] h-28 w-auto animate-melayang-3 text-daun/40" />
      <RantingDaun className="absolute -bottom-6 -left-6 h-56 w-auto origin-bottom-left animate-goyang text-daun/30" />
    </div>
  );
}

/** Deret pucuk rebung hijau yang menempel di atas bagian berlatar hutan (footer). */
export function PitaRebungHutan({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rebung-hutan h-4 w-full", className)} />;
}
