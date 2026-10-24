import QRCode from "qrcode";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { warna } from "@/lib/design/tokens";
import { formatWaktu } from "@/lib/format";
import { CapSelesai } from "./cap-selesai";
import { Logo } from "./logo";
import { TombolSalin } from "./tombol-salin";

/**
 * Momen khas 2: resi laporan, seperti resi pengiriman kurir. Kode Mono besar
 * + tombol salin, garis putus-putus seperti sobekan, QR ke halaman lacak,
 * tanggal, dan kalimat "Simpan atau screenshot resi ini".
 */
export async function Resi({
  kode,
  urlLacak,
  dibuatPada,
  rincian,
  selesaiPada,
  className,
}: {
  kode: string;
  /** URL absolut halaman lacak, isi QR. */
  urlLacak: string;
  dibuatPada: string | Date;
  rincian: Array<{ label: string; nilai: ReactNode }>;
  /** Jika laporan sudah selesai, cap SELESAI ikut tampil di resi. */
  selesaiPada?: string | Date | null;
  className?: string;
}) {
  const svgQr = await QRCode.toString(urlLacak, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: warna.aspal, light: warna.putih },
  });
  const srcQr = `data:image/svg+xml;utf8,${encodeURIComponent(svgQr)}`;

  return (
    <article
      aria-label={`Resi laporan ${kode}`}
      className={cx("relative w-full max-w-form rounded-md border-2 border-aspal bg-putih", className)}
    >
      <header className="flex items-center justify-between gap-4 border-b border-garis px-4 py-3 md:px-6">
        <Logo ukuran="kecil" />
        <p className="text-kecil text-aspal-2">Bukti laporan</p>
      </header>

      <div className="flex flex-col gap-4 px-4 py-6 md:px-6">
        <div>
          <p className="text-kecil text-aspal-2">Kode laporan</p>
          <p className="font-kode text-kode-besar font-bold tracking-wide break-all">{kode}</p>
        </div>
        <TombolSalin teks={kode} className="self-start tanpa-cetak" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-aspal-2">Dikirim</dt>
          <dd>{formatWaktu(dibuatPada)}</dd>
          {rincian.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-aspal-2">{r.label}</dt>
              <dd className="min-w-0 break-words">{r.nilai}</dd>
            </div>
          ))}
        </dl>
        {selesaiPada && <CapSelesai tanggal={selesaiPada} ukuran="kecil" className="self-end" />}
      </div>

      {/* Garis sobekan */}
      <div aria-hidden className="border-t-2 border-dashed border-garis-tegas" />

      <div className="flex items-center gap-4 px-4 py-4 md:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- QR SVG data URL, bukan gambar remote */}
        <img src={srcQr} alt={`QR untuk melacak laporan ${kode}`} width={112} height={112} className="size-28 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Simpan atau screenshot resi ini.</p>
          <p className="text-kecil text-aspal-2">Pindai QR atau masukkan kode di halaman Lacak untuk melihat perkembangannya.</p>
        </div>
      </div>
    </article>
  );
}
