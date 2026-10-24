"use client";

import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import * as RadixToast from "@radix-ui/react-toast";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { cx } from "@/lib/cx";

/*
 * Toast: pesan spesifik ("Laporan terkirim"), bukan "Berhasil!". Radix
 * mengumumkannya lewat aria-live. Gagal memakai durasi lebih lama.
 */

type JenisToast = "sukses" | "gagal" | "info";
type DataToast = { id: number; jenis: JenisToast; judul: string; isi?: string };
type Tampilkan = (t: Omit<DataToast, "id">) => void;

const KonteksToast = createContext<Tampilkan | null>(null);

export function useToast() {
  const tampilkan = useContext(KonteksToast);
  if (!tampilkan) throw new Error("useToast harus dipakai di dalam PenyediaToast");
  return useMemo(
    () => ({
      sukses: (judul: string, isi?: string) => tampilkan({ jenis: "sukses", judul, isi }),
      gagal: (judul: string, isi?: string) => tampilkan({ jenis: "gagal", judul, isi }),
      info: (judul: string, isi?: string) => tampilkan({ jenis: "info", judul, isi }),
    }),
    [tampilkan],
  );
}

const IKON = { sukses: CheckCircle, gagal: WarningCircle, info: Info } as const;
const WARNA_IKON = { sukses: "text-hijau", gagal: "text-merah", info: "text-biru" } as const;

let urutan = 0;

export function PenyediaToast({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<DataToast[]>([]);

  const tampilkan = useCallback<Tampilkan>((t) => {
    urutan += 1;
    const id = urutan;
    setDaftar((d) => [...d.slice(-2), { ...t, id }]);
  }, []);

  const hapus = (id: number) => setDaftar((d) => d.filter((t) => t.id !== id));

  return (
    <KonteksToast.Provider value={tampilkan}>
      <RadixToast.Provider swipeDirection="down" label="Notifikasi">
        {children}
        {daftar.map((t) => {
          const Ikon = IKON[t.jenis];
          return (
            <RadixToast.Root
              key={t.id}
              type={t.jenis === "gagal" ? "foreground" : "background"}
              duration={t.jenis === "gagal" ? 8000 : 5000}
              onOpenChange={(buka) => !buka && hapus(t.id)}
              className={cx(
                "flex w-full items-start gap-3 rounded-md border bg-putih p-4 shadow-lapis",
                "data-[state=open]:animate-muncul",
                t.jenis === "gagal" ? "border-2 border-merah" : "border-aspal",
              )}
            >
              <Ikon aria-hidden weight="fill" className={cx("mt-0.5 size-5 shrink-0", WARNA_IKON[t.jenis])} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <RadixToast.Title className="font-semibold">{t.judul}</RadixToast.Title>
                {t.isi && <RadixToast.Description className="text-kecil text-aspal-2">{t.isi}</RadixToast.Description>}
              </div>
              <RadixToast.Close
                aria-label="Tutup pemberitahuan"
                className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm hover:bg-abu"
              >
                <X aria-hidden className="size-5" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 pb-24 md:right-0 md:left-auto md:w-[24rem] md:pb-4" />
      </RadixToast.Provider>
    </KonteksToast.Provider>
  );
}
