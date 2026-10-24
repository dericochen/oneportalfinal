"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Tombol } from "./tombol";

/**
 * Tombol submit yang otomatis masuk state memuat selama Server Action berjalan.
 * Jika `name`/`value` diisi, hanya tombol yang ditekan yang menampilkan memuat.
 */
export function TombolKirim({
  teksMemuat = "Memproses…",
  name,
  value,
  ...rest
}: Omit<ComponentProps<typeof Tombol>, "type" | "memuat"> & { teksMemuat?: string }) {
  const { pending, data } = useFormStatus();
  const ditekan = pending && (!name || data?.get(name) === value);
  return (
    <Tombol
      type="submit"
      name={name}
      value={value}
      memuat={ditekan}
      teksMemuat={teksMemuat}
      disabled={pending || rest.disabled}
      {...rest}
    />
  );
}
