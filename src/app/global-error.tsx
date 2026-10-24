"use client";

import "./globals.css";

/**
 * Galat di root layout. Menggantikan seluruh dokumen, jadi tidak bisa memakai
 * font dari layout; tampil dengan font sistem tetapi token warna tetap sama.
 */
export default function GalatGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <body className="bg-putih text-aspal">
        <title>Halaman gagal dimuat | ONE PORTAL</title>
        <main className="mx-auto flex min-h-dvh w-full max-w-daftar flex-col justify-center gap-6 px-4 py-12">
          <p className="font-bold">ONE PORTAL</p>
          <h1 className="text-h1">Halaman ini gagal dimuat</h1>
          <p className="max-w-baca">
            Ada gangguan di server kami, bukan kesalahan Anda. Coba muat ulang dalam beberapa detik. Untuk keadaan darurat
            hubungi 112.
          </p>
          {error.digest && <p className="text-kecil text-aspal-2">Kode kejadian untuk tim: {error.digest}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex min-h-11 items-center rounded-sm border-2 border-aspal bg-aspal px-4 font-semibold text-putih"
            >
              Coba lagi
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- router tidak tersedia saat root layout gagal */}
            <a href="/" className="inline-flex min-h-11 items-center rounded-sm border-2 border-aspal px-4 font-semibold">
              Ke beranda
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
