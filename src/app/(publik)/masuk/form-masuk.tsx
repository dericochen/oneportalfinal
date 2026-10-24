"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { type HasilForm, masuk } from "@/aksi/auth";
import { Masukan, PesanError } from "@/components/ui/isian";
import { TombolKirim } from "@/components/ui/tombol-kirim";

/**
 * Satu form masuk untuk semua peran. Sistem membaca peran akun dari database
 * lalu membuka halamannya: warga ke /akun, admin ke /admin, petugas ke
 * /petugas, supervisor ke /supervisor. Tidak ada pilihan peran di sini.
 */
export function FormMasuk({ lanjut }: { lanjut?: string }) {
  const [hasil, aksi] = useActionState<HasilForm, FormData>(masuk, {});
  const [lihat, setLihat] = useState(false);
  return (
    <form action={aksi} noValidate className="flex flex-col gap-5">
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      {hasil.galat && (
        <div role="alert" className="animate-geser-masuk rounded-md border-2 border-merah bg-putih p-4">
          <PesanError>{hasil.galat}</PesanError>
        </div>
      )}
      <Masukan
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        defaultValue={hasil.nilai?.email}
        error={hasil.kolom?.email}
        wajib
      />
      <div className="relative">
        <Masukan
          name="kata_sandi"
          type={lihat ? "text" : "password"}
          label="Kata sandi"
          autoComplete="current-password"
          error={hasil.kolom?.kata_sandi}
          className="[&_input]:pr-12"
          wajib
        />
        <button
          type="button"
          onClick={() => setLihat((l) => !l)}
          aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={lihat}
          className="absolute top-9 right-1 inline-flex size-11 items-center justify-center rounded-md text-aspal-2 transition-colors hover:text-hutan"
        >
          {lihat ? <EyeSlash aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </div>
      <TombolKirim teksMemuat="Memeriksa…" lebarPenuh ukuran="besar">
        Masuk
      </TombolKirim>
    </form>
  );
}
