import { Phone } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PitaRebungHutan } from "@/components/ui/hiasan";
import { LogoMedan } from "@/components/ui/logo-medan";
import { ambilPengaturan } from "@/lib/pengaturan";
import { NAV_PUBLIK, tersediaSaja } from "./navigasi";

/**
 * Footer semua halaman: hijau hutan bercorak ragi hotang, bertepi pucuk
 * rebung. Memuat logo, tautan utama, nomor darurat, kontak, dan disclaimer
 * prototipe, ditambah atribusi data peta.
 */
export async function FooterSitus() {
  const p = await ambilPengaturan();
  const nav = tersediaSaja(NAV_PUBLIK);
  return (
    <footer className="mt-16 text-putih">
      <PitaRebungHutan />
      <div className="corak-ragi">
        <div className="mx-auto grid w-full max-w-situs gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] md:px-6">
          <div className="flex flex-col items-start gap-4">
            <LogoMedan className="text-h3" />
            <p className="max-w-baca text-kecil text-lumut">{p["footer.disclaimer"]}</p>
          </div>
          <nav aria-label="Tautan situs" className="flex flex-col gap-1">
            <p className="mb-1 font-bold">Jelajahi</p>
            {nav.map((b) => (
              <Link
                key={b.href}
                href={b.href}
                className="inline-flex min-h-11 items-center self-start text-lumut underline-offset-4 transition-colors duration-150 ease-keluar hover:text-putih hover:underline"
              >
                {b.label}
              </Link>
            ))}
            <Link
              href="/masuk"
              className="inline-flex min-h-11 items-center self-start text-lumut underline-offset-4 transition-colors duration-150 ease-keluar hover:text-putih hover:underline"
            >
              Masuk
            </Link>
          </nav>
          <div className="flex flex-col items-start gap-1">
            <p className="mb-1 font-bold">Butuh bantuan?</p>
            <a
              href={`tel:${p["darurat.nomor"]}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-putih px-3 font-bold transition-colors duration-150 ease-keluar hover:bg-putih hover:text-hutan"
            >
              <Phone aria-hidden weight="fill" className="size-5" />
              Darurat: {p["darurat.nomor"]}
            </a>
            {p["kontak.telepon"] && (
              <a href={`tel:${p["kontak.telepon"].replace(/[^0-9+]/g, "")}`} className="inline-flex min-h-11 items-center text-lumut underline underline-offset-4 hover:text-putih">
                {p["kontak.telepon"]}
              </a>
            )}
            {p["kontak.email"] && (
              <a href={`mailto:${p["kontak.email"]}`} className="inline-flex min-h-11 items-center text-lumut underline underline-offset-4 hover:text-putih">
                {p["kontak.email"]}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-putih/20">
          <div className="mx-auto flex w-full max-w-situs flex-wrap items-center justify-between gap-2 px-4 py-4 text-kecil text-lumut md:px-6">
            <p>ONE PORTAL, layanan publik Kota Medan.</p>
            <p>
              Peta:{" "}
              <a href="https://www.openstreetmap.org/copyright" className="underline underline-offset-4 hover:text-putih" target="_blank" rel="noopener noreferrer">
                © kontributor OpenStreetMap
              </a>
              ,{" "}
              <a href="https://openfreemap.org" className="underline underline-offset-4 hover:text-putih" target="_blank" rel="noopener noreferrer">
                OpenFreeMap
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}