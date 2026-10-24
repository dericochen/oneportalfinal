import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import { PenyediaToast } from "@/components/ui/toast";
import { warna } from "@/lib/design/tokens";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Mono hanya untuk kode laporan (OP-2026-00182).
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ONE PORTAL, layanan publik Kota Medan",
    template: "%s | ONE PORTAL",
  },
  description:
    "Cari syarat layanan, laporkan masalah kota, dan lacak penanganannya sampai ada bukti foto selesai. Prototipe untuk Lomba Web Development IT Fest UMK 2026.",
  applicationName: "ONE PORTAL",
};

export const viewport: Viewport = {
  themeColor: warna.aspal,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${atkinson.variable} ${atkinsonMono.variable}`}>
      <body className="min-h-dvh bg-putih text-publik text-aspal antialiased">
        <a
          href="#isi"
          className="sr-only z-50 rounded-sm bg-kuning px-4 py-3 font-semibold text-aspal focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Langsung ke isi
        </a>
        <PenyediaToast>{children}</PenyediaToast>
      </body>
    </html>
  );
}
