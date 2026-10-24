"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Muncul perlahan saat masuk layar (naik 22 px sambil memudar). Tanpa skrip,
 * konten tetap tampil penuh (lihat `[data-muncul]` di globals.css), dan
 * `prefers-reduced-motion` mematikan geraknya. `tunda` 1–5 memberi jeda
 * bertahap untuk daftar atau deretan kartu.
 */
export function Muncul({
  children,
  className,
  tunda = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  tunda?: 0 | 1 | 2 | 3 | 4 | 5;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.terlihat = "";
      return;
    }
    const io = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) {
          el.dataset.terlihat = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag ref={ref} data-muncul="" data-tunda={tunda || undefined} className={className}>
      {children}
    </Tag>
  );
}
