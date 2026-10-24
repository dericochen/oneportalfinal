import { Check } from "@phosphor-icons/react/ssr";
import { cx } from "@/lib/cx";
import { LABEL_STATUS, type StatusLaporan, TAHAP_LACAK } from "@/lib/domain/laporan";
import { formatTanggalPendek } from "@/lib/format";

/** Bar 6 tahap di halaman lacak: Diterima → … → Selesai. */
export function BarTahap({
  status,
  waktu,
}: {
  status: StatusLaporan;
  waktu: Partial<Record<StatusLaporan, string | null>>;
}) {
  const indeks = TAHAP_LACAK.indexOf(status);
  return (
    <ol aria-label="Tahap penanganan" className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {TAHAP_LACAK.map((t, i) => {
        const lewat = indeks >= 0 && i < indeks;
        const kini = i === indeks;
        const selesai = kini && t === "RESOLVED";
        return (
          <li key={t} className="flex flex-col gap-2" aria-current={kini ? "step" : undefined}>
            <span aria-hidden className="flex items-center">
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                  selesai && "border-hijau bg-hijau text-putih",
                  kini && !selesai && "border-biru bg-biru text-putih",
                  lewat && "border-aspal bg-aspal text-putih",
                  !lewat && !kini && "border-garis-tegas bg-putih",
                )}
              >
                {(lewat || selesai) && <Check weight="bold" className="size-4" />}
              </span>
              {i < TAHAP_LACAK.length - 1 && <span className={cx("h-0.5 flex-1", lewat || kini ? "bg-aspal" : "bg-garis")} />}
            </span>
            <span className={cx("text-kecil leading-tight", kini ? "font-bold" : lewat ? "" : "text-aspal-2")}>
              {LABEL_STATUS[t]}
              {(lewat || kini) && waktu[t] && <span className="block text-aspal-2">{formatTanggalPendek(waktu[t]!)}</span>}
              <span className="sr-only">{kini ? " (tahap saat ini)" : lewat ? " (selesai)" : " (belum)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
