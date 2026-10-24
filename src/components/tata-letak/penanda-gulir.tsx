"use client";

import { useEffect } from "react";

/**
 * Menandai header saat halaman sudah digulir (`data-header-gulir="ya"`), jadi
 * header mendapat bayangan lembut. Pakai rAF + listener pasif agar gulir tetap mulus.
 */
export function PenandaGulir({ target }: { target: string }) {
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    let antre = 0;
    const perbarui = () => {
      antre = 0;
      el.dataset.headerGulir = window.scrollY > 8 ? "ya" : "tidak";
    };
    const saatGulir = () => {
      if (!antre) antre = requestAnimationFrame(perbarui);
    };
    perbarui();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => {
      window.removeEventListener("scroll", saatGulir);
      if (antre) cancelAnimationFrame(antre);
    };
  }, [target]);
  return null;
}
