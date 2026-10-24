"use client";

import { List, X } from "@phosphor-icons/react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

/** Drawer menu staf untuk layar < 1024 px. Menu dirender di server (children). */
export function DrawerStaf({ children }: { children: ReactNode }) {
  const path = usePathname();
  // Drawer otomatis tertutup setelah berpindah halaman: status "buka" hanya
  // berlaku untuk path tempat drawer dibuka.
  const [bukaDi, setBukaDi] = useState<string | null>(null);
  const buka = bukaDi === path;
  const setBuka = (b: boolean) => setBukaDi(b ? path : null);

  return (
    <RadixDialog.Root open={buka} onOpenChange={setBuka}>
      <RadixDialog.Trigger
        aria-label="Buka menu"
        className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-abu lg:hidden"
      >
        <List aria-hidden className="size-6" />
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-aspal/60 data-[state=open]:animate-muncul" />
        <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-putih shadow-lapis data-[state=open]:animate-muncul">
          <div className="flex items-center justify-between border-b border-garis px-4 py-2">
            <RadixDialog.Title className="font-bold">Menu</RadixDialog.Title>
            <RadixDialog.Close aria-label="Tutup menu" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-abu">
              <X aria-hidden className="size-5" />
            </RadixDialog.Close>
          </div>
          <RadixDialog.Description className="sr-only">Navigasi area staf</RadixDialog.Description>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
