import { FooterSitus } from "@/components/tata-letak/footer-situs";
import { HeaderPublik } from "@/components/tata-letak/header-publik";
import { NavBawah } from "@/components/tata-letak/nav-bawah";
import { NAV_PUBLIK, tersediaSaja } from "@/components/tata-letak/navigasi";
import { cx } from "@/lib/cx";

/**
 * Layout publik & warga: header, isi di atas latar putih bercorak Nusantara
 * (tipis, tidak mengganggu teks), footer hijau, bottom nav di HP.
 */
export default function LayoutPublik({ children }: LayoutProps<"/">) {
  const nav = tersediaSaja(NAV_PUBLIK);
  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderPublik />
      <main id="isi" tabIndex={-1} className={cx("latar-nusantara flex-1", nav.length > 0 && "pb-20 md:pb-0")}>
        {children}
      </main>
      <div className={cx(nav.length > 0 && "pb-20 md:pb-0")}>
        <FooterSitus />
      </div>
      <NavBawah butir={nav} />
    </div>
  );
}