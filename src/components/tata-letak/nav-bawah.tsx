import { cx } from "@/lib/cx";
import type { ButirNav } from "./navigasi";
import { TautanAktif } from "./tautan-aktif";

/**
 * Bottom nav HP (<768 px). Momen khas 1: tab "Lapor" di tengah memakai pelat
 * kuning-rambu, bukan tombol bulat melayang. Memperhitungkan safe area.
 * `pratinjau`: tampil statis (tanpa posisi tetap) untuk halaman /desain.
 */
export function NavBawah({ butir, pratinjau }: { butir: ButirNav[]; pratinjau?: boolean }) {
  if (butir.length === 0) return null;
  const isi = butir.map((b) => {
    const Ikon = b.ikon;
    const dalam = b.lapor ? (
      <>
        <span className="flex size-10 items-center justify-center rounded-md border-2 border-aspal bg-kuning text-aspal">
          <Ikon aria-hidden weight="fill" className="size-6" />
        </span>
        <span className="font-semibold">{b.label}</span>
      </>
    ) : (
      <>
        <span className="flex h-8 w-14 items-center justify-center rounded-md transition-colors duration-200 ease-keluar group-aria-[current=page]:bg-lumut">
          <Ikon aria-hidden weight="regular" className="size-6" />
        </span>
        <span>{b.label}</span>
      </>
    );
    const kelas = "group flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-kecil leading-tight";
    return (
      <li key={b.href} className="flex flex-1">
        {pratinjau ? (
          <span className={kelas}>{dalam}</span>
        ) : (
          <TautanAktif
            href={b.href}
            className={cx(kelas, "text-aspal-2 hover:text-aspal")}
            kelasAktif="font-semibold text-hutan"
          >
            {dalam}
          </TautanAktif>
        )}
      </li>
    );
  });

  return (
    <nav
      aria-label={pratinjau ? "Pratinjau navigasi bawah" : "Navigasi utama"}
      className={cx(
        "border-t border-garis bg-putih",
        pratinjau ? "rounded-lg border" : "tanpa-cetak fixed inset-x-0 bottom-0 z-30 pb-aman md:hidden",
      )}
    >
      <ul className="mx-auto flex max-w-daftar items-stretch">{isi}</ul>
    </nav>
  );
}
