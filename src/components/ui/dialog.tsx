"use client";

import { X } from "@phosphor-icons/react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { type ReactNode, useState } from "react";
import { cx } from "@/lib/cx";
import { Tombol } from "./tombol";

/*
 * Dialog (Radix). Di HP tampil sebagai bottom sheet (radius 12 px hanya di
 * sisi atas), di ≥768 px sebagai dialog di tengah (radius 8 px).
 */

export function Dialog({
  buka,
  ubahBuka,
  judul,
  deskripsi,
  pemicu,
  children,
}: {
  buka?: boolean;
  ubahBuka?: (b: boolean) => void;
  judul: string;
  deskripsi?: ReactNode;
  pemicu?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={buka} onOpenChange={ubahBuka}>
      {pemicu && <RadixDialog.Trigger asChild>{pemicu}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-aspal/60 data-[state=open]:animate-muncul" />
        <RadixDialog.Content
          className={cx(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-lg bg-putih p-6 pb-aman shadow-lapis",
            "data-[state=open]:animate-sheet",
            "md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-form md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-md md:pb-6",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="text-h3 font-bold">{judul}</RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Tutup"
              className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm hover:bg-abu"
            >
              <X aria-hidden className="size-5" />
            </RadixDialog.Close>
          </div>
          {deskripsi ? (
            <RadixDialog.Description className="mt-2 text-aspal-2">{deskripsi}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{judul}</RadixDialog.Description>
          )}
          <div className="mt-6">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Konfirmasi untuk aksi berisiko. Tombol konfirmasi menyebut hasilnya. */
export function DialogKonfirmasi({
  pemicu,
  judul,
  pesan,
  labelKonfirmasi,
  teksMemuat = "Memproses…",
  bahaya = true,
  onKonfirmasi,
}: {
  pemicu: ReactNode;
  judul: string;
  pesan: ReactNode;
  labelKonfirmasi: string;
  teksMemuat?: string;
  bahaya?: boolean;
  onKonfirmasi: () => Promise<boolean | void> | boolean | void;
}) {
  const [buka, setBuka] = useState(false);
  const [memuat, setMemuat] = useState(false);

  async function konfirmasi() {
    setMemuat(true);
    try {
      const hasil = await onKonfirmasi();
      if (hasil !== false) setBuka(false);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <Dialog buka={buka} ubahBuka={setBuka} judul={judul} deskripsi={pesan} pemicu={pemicu}>
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Tombol varian="kedua" onClick={() => setBuka(false)} disabled={memuat}>
          Batal
        </Tombol>
        <Tombol varian={bahaya ? "bahaya" : "utama"} onClick={konfirmasi} memuat={memuat} teksMemuat={teksMemuat}>
          {labelKonfirmasi}
        </Tombol>
      </div>
    </Dialog>
  );
}
