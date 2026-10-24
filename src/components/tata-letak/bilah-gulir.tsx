"use client";

import { useEffect, useRef } from "react";

/**
 * Bilah tipis emas di bawah header yang memanjang mengikuti posisi gulir.
 * Ditulis langsung ke `transform` lewat rAF (tanpa render ulang React), dan
 * disembunyikan untuk pengguna `prefers-reduced-motion`.
 */
export function BilahGulir() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let antre = 0;
    const perbarui = () => {
      antre = 0;
      const maks = document.documentElement.scrollHeight - innerHeight;
      el.style.transform = `scaleX(${maks > 0 ? Math.min(1, scrollY / maks) : 0})`;
    };
    const jadwal = () => {
      if (!antre) antre = requestAnimationFrame(perbarui);
    };
    perbarui();
    addEventListener("scroll", jadwal, { passive: true });
    addEventListener("resize", jadwal, { passive: true });
    return () => {
      removeEventListener("scroll", jadwal);
      removeEventListener("resize", jadwal);
      if (antre) cancelAnimationFrame(antre);
    };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden motion-reduce:hidden">
      <div ref={ref} className="bilah-emas h-full origin-left scale-x-0 will-change-transform" />
    </div>
  );
}
