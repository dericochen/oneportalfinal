"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";
import { DURASI_SLIDE_MS, type Slide } from "@/lib/domain/slide";

/**
 * Latar hero beranda: foto slide (dikelola admin di /admin/slide) memenuhi
 * seluruh hero, berganti otomatis tiap 2 detik dengan memudar halus dan zoom
 * pelan (Ken Burns). Tanpa tombol. Agar tetap aman:
 * - diam di foto pertama bila pengguna memilih `prefers-reduced-motion`;
 * - berhenti saat tab tidak aktif atau hero di luar layar (hemat baterai);
 * - berhenti saat kursor/fokus ada di keterangan slide (supaya tautannya bisa diklik);
 * - foto bersifat dekoratif (alt kosong); judul slide dibacakan lewat daftar tersembunyi.
 */
const QUERY_GERAK = "(prefers-reduced-motion: reduce)";

function useGerakDikurangi() {
  return useSyncExternalStore(
    (ubah) => {
      const m = window.matchMedia(QUERY_GERAK);
      m.addEventListener("change", ubah);
      return () => m.removeEventListener("change", ubah);
    },
    () => window.matchMedia(QUERY_GERAK).matches,
    () => false,
  );
}

function useTabTerlihat() {
  return useSyncExternalStore(
    (ubah) => {
      document.addEventListener("visibilitychange", ubah);
      return () => document.removeEventListener("visibilitychange", ubah);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
}

/** Arah zoom bergantian supaya tiap foto terasa bergerak berbeda. */
const ASAL_ZOOM = ["origin-center", "origin-top-left", "origin-bottom-right", "origin-top-right", "origin-bottom-left"];

function TautanKeterangan({ s }: { s: Slide }) {
  if (!s.tautan || !s.labelTautan) return null;
  const kelas = "font-semibold text-kuning underline decoration-2 underline-offset-4 hover:text-putih";
  return s.tautan.startsWith("/") ? (
    <Link href={s.tautan} className={kelas}>
      {s.labelTautan}
    </Link>
  ) : (
    <a href={s.tautan} className={kelas} rel="noopener noreferrer">
      {s.labelTautan}
    </a>
  );
}

export function LatarSlideHero({ slide }: { slide: Slide[] }) {
  const foto = slide.filter((s) => s.gambar);
  // Bila belum ada foto, keterangan slide teks tetap bergantian di atas latar bercorak.
  const daftar = foto.length > 0 ? foto : slide;
  const n = daftar.length;
  const [indeks, setIndeks] = useState(0);
  const [tahan, setTahan] = useState(false);
  const [terlihat, setTerlihat] = useState(true);
  const kurangiGerak = useGerakDikurangi();
  const tabAktif = useTabTerlihat();
  const akar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = akar.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => setTerlihat(e.some((x) => x.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jalan = n > 1 && !kurangiGerak && tabAktif && terlihat && !tahan;
  useEffect(() => {
    if (!jalan) return;
    const t = window.setInterval(() => setIndeks((i) => (i + 1) % n), DURASI_SLIDE_MS);
    return () => window.clearInterval(t);
  }, [jalan, n]);

  const aktif = n ? indeks % n : 0;
  const kini = daftar[aktif];

  return (
    <div ref={akar} className="absolute inset-0 -z-10 overflow-hidden">
      {/* Lapisan foto: memudar 1,2 detik, zoom pelan selama tampil. */}
      {foto.map((s, i) => (
        <div
          key={s.id}
          aria-hidden
          className={cx(
            "absolute inset-0 transition-opacity duration-[1200ms] ease-in-out will-change-[opacity]",
            i === aktif ? "opacity-100" : "opacity-0",
          )}
        >
          <div
            // Kunci berubah tiap kali tampil agar animasi zoom dimulai ulang.
            key={i === aktif ? `aktif-${indeks}` : "diam"}
            className={cx("absolute inset-0", ASAL_ZOOM[i % ASAL_ZOOM.length], i === aktif && !kurangiGerak && "animate-ken-burns")}
          >
            <Image
              src={s.gambar!}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              loading={i < 2 ? "eager" : undefined}
              className="object-cover"
            />
          </div>
        </div>
      ))}

      {/* Tirai gelap agar teks putih selalu terbaca di atas foto apa pun. */}
      <div aria-hidden className={cx("absolute inset-0", foto.length ? "tirai-hero" : "tirai-hero-tipis")} />

      {/* Daftar slide untuk pembaca layar (tidak bergerak). */}
      <ul className="sr-only" aria-label="Sorotan Medan Untuk Semua">
        {slide.map((s) => (
          <li key={s.id}>
            {s.judul}
            {s.keterangan ? `. ${s.keterangan}` : ""}
          </li>
        ))}
      </ul>

      {kini && (
        // Kartu keterangan di kanan atas (laptop). Di HP disembunyikan agar tidak menutupi
        // tombol; judul slide tetap tersedia lewat daftar tersembunyi di atas.
        <div
          className="absolute top-12 right-6 z-10 hidden w-80 lg:block xl:right-[calc((100vw-70rem)/2+1.5rem)]"
          onMouseEnter={() => setTahan(true)}
          onMouseLeave={() => setTahan(false)}
          onFocus={() => setTahan(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setTahan(false);
          }}
        >
          <div className="flex flex-col gap-2 rounded-lg border border-putih/25 bg-hutan/80 p-4 text-putih shadow-angkat">
            <p key={`judul-${kini.id}-${indeks}`} className="animate-geser-masuk font-bold [overflow-wrap:anywhere]">
              {kini.judul}
            </p>
            {kini.keterangan && (
              <p key={`ket-${kini.id}-${indeks}`} className="animate-geser-masuk tunda-1 text-kecil text-lumut">
                {kini.keterangan}
              </p>
            )}
            <TautanKeterangan s={kini} />
            {n > 1 && (
              <span aria-hidden className="mt-1 flex gap-1.5">
                {daftar.map((s, i) => (
                  <span key={s.id} className="relative h-1 flex-1 overflow-hidden rounded-sm bg-putih/25">
                    {i === aktif && (
                      <span
                        key={indeks}
                        className={cx("absolute inset-0 origin-left bg-kuning", jalan ? "animate-progres" : "scale-x-100")}
                      />
                    )}
                    {i < aktif && <span className="absolute inset-0 bg-putih/60" />}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
