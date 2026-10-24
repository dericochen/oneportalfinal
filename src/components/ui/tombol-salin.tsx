"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { cx } from "@/lib/cx";
import { useToast } from "./toast";

/** Tombol salin teks (kode laporan) ke clipboard. */
export function TombolSalin({ teks, label = "Salin kode", className }: { teks: string; label?: string; className?: string }) {
  const toast = useToast();
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      toast.sukses("Kode disalin", `${teks} siap ditempel.`);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      toast.gagal("Kode belum tersalin", "Browser menolak akses clipboard. Tekan lama kode lalu pilih Salin.");
    }
  }

  const Ikon = tersalin ? Check : Copy;
  return (
    <button
      type="button"
      onClick={salin}
      className={cx(
        "inline-flex min-h-11 items-center gap-2 rounded-sm border-2 border-aspal bg-putih px-3 font-semibold hover:bg-abu",
        className,
      )}
    >
      <Ikon aria-hidden weight="bold" className="size-5" />
      <span>{tersalin ? "Tersalin" : label}</span>
    </button>
  );
}
