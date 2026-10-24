import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { KELOMPOK_STATUS, type KelompokStatus, type StatusLaporan } from "@/lib/domain/laporan";
import { formatJam, formatTanggal } from "@/lib/format";

/**
 * Log riwayat bergaya cek resi kurir: kolom kiri tanggal dan jam, kolom
 * kanan kejadian. Terbaru di atas. Label aktor berupa peran/instansi,
 * bukan nama pribadi.
 */
export type KejadianLog = {
  id: string;
  waktu: string | Date;
  judul: string;
  keterangan?: ReactNode;
  /** Mis. "Admin", "Petugas Dinas SDABMBK", "Pelapor", "Sistem". */
  aktor?: string;
  /** Status hasil kejadian, menentukan warna titik. */
  status?: StatusLaporan;
  /** Catatan internal: hanya dikirim ke komponen bila penonton adalah staf. */
  internal?: boolean;
};

const warnaTitik: Record<KelompokStatus, string> = {
  menunggu: "bg-aspal-2",
  dikerjakan: "bg-biru",
  selesai: "bg-hijau",
  ditolak: "bg-merah",
  dialihkan: "bg-aspal-2",
};

export function LogResi({ kejadian, className }: { kejadian: KejadianLog[]; className?: string }) {
  const urut = [...kejadian].sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
  return (
    <ol className={cx("flex flex-col", className)}>
      {urut.map((k, i) => {
        const terbaru = i === 0;
        const titik = k.status ? warnaTitik[KELOMPOK_STATUS[k.status]] : "bg-garis-tegas";
        return (
          <li key={k.id} className="grid grid-cols-[5.5rem_1.5rem_1fr] md:grid-cols-[8rem_1.5rem_1fr]">
            <div className="pt-0.5 pb-6 text-right text-kecil text-aspal-2">
              <time dateTime={new Date(k.waktu).toISOString()} className="flex flex-col">
                <span className={cx(terbaru && "font-semibold text-aspal")}>{formatTanggal(k.waktu)}</span>
                <span>{formatJam(k.waktu)} WIB</span>
              </time>
            </div>
            <div aria-hidden className="relative flex justify-center">
              {i < urut.length - 1 && <span className="absolute top-3 bottom-0 w-0.5 bg-garis" />}
              <span
                className={cx(
                  "relative mt-1.5 size-3 rounded-full",
                  terbaru ? cx(titik, "ring-4 ring-abu") : "bg-garis-tegas",
                )}
              />
            </div>
            <div className="min-w-0 pb-6">
              <p className={cx("break-words", terbaru ? "font-bold" : "font-semibold")}>
                {k.judul}
                {k.internal && (
                  <span className="ml-2 rounded-sm bg-abu px-1.5 py-0.5 text-kecil font-normal text-aspal-2">Catatan internal</span>
                )}
              </p>
              {k.keterangan && <div className="mt-1 break-words text-aspal-2">{k.keterangan}</div>}
              {k.aktor && <p className="mt-1 text-kecil text-aspal-2">oleh {k.aktor}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
