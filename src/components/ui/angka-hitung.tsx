"use client";

import { useEffect, useRef } from "react";

/**
 * Angka yang menghitung naik dari 0 saat pertama kali terlihat. Teks yang
 * dirender server sudah berisi angka akhir, jadi mesin pencari, pembaca layar,
 * dan pengguna tanpa skrip atau dengan `prefers-reduced-motion` langsung
 * melihat nilai sebenarnya.
 */
const angkaId = new Intl.NumberFormat("id-ID");

function format(jenis: "angka" | "persen" | "desimal", nilai: number) {
  if (jenis === "persen") return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(nilai * 100)}%`;
  if (jenis === "desimal") return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(nilai);
  return angkaId.format(Math.round(nilai));
}

export function AngkaHitung({
  nilai,
  jenis = "angka",
  durasi = 1300,
  className,
}: {
  nilai: number;
  /** angka = bilangan bulat id-ID; persen = 0–1 ditampilkan sebagai %; desimal = satu desimal. */
  jenis?: "angka" | "persen" | "desimal";
  /** Milidetik. */
  durasi?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (nilai === 0) return;

    let rAF = 0;
    const io = new IntersectionObserver(
      (entri) => {
        if (!entri.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const mulai = performance.now();
        const langkah = (sekarang: number) => {
          const t = Math.min(1, (sekarang - mulai) / durasi);
          const mudah = 1 - Math.pow(1 - t, 3); // easeOutCubic
          el.textContent = format(jenis, nilai * mudah);
          if (t < 1) rAF = requestAnimationFrame(langkah);
        };
        el.textContent = format(jenis, 0);
        rAF = requestAnimationFrame(langkah);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rAF);
      el.textContent = format(jenis, nilai);
    };
  }, [nilai, jenis, durasi]);

  return (
    <span ref={ref} className={className}>
      {format(jenis, nilai)}
    </span>
  );
}
