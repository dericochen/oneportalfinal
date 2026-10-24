"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";

/**
 * Kata yang berganti otomatis di dalam kalimat (mis. jenis masalah kota).
 * Semua kata ditumpuk di satu sel grid, jadi lebarnya tetap (tidak membuat
 * teks di sekitarnya bergeser). Kata lama naik keluar, kata baru naik masuk.
 * Pembaca layar mendapat kalimat lengkap yang diam; gerak dimatikan untuk
 * `prefers-reduced-motion`.
 */
function useGerakDikurangi() {
  return useSyncExternalStore(
    (ubah) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", ubah);
      return () => m.removeEventListener("change", ubah);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function KataBerganti({ kata, jeda = 2200, className }: { kata: string[]; jeda?: number; className?: string }) {
  const [i, setI] = useState(0);
  const diam = useGerakDikurangi();

  useEffect(() => {
    if (diam || kata.length < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % kata.length), jeda);
    return () => window.clearInterval(t);
  }, [diam, kata.length, jeda]);

  return (
    <>
      <span className="sr-only">{kata.join(", ")}</span>
      <span aria-hidden className={cx("relative inline-grid overflow-hidden align-bottom", className)}>
        {kata.map((k, n) => {
          const posisi = n === i ? "kini" : n === (i - 1 + kata.length) % kata.length ? "lalu" : "nanti";
          return (
            <span
              key={k}
              className={cx(
                "col-start-1 row-start-1 whitespace-nowrap transition-[transform,opacity] duration-500 ease-keluar",
                posisi === "kini" && "translate-y-0 opacity-100",
                posisi === "lalu" && "-translate-y-full opacity-0",
                posisi === "nanti" && "translate-y-full opacity-0",
              )}
            >
              {k}
            </span>
          );
        })}
      </span>
    </>
  );
}
