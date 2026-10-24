"use client";

import { MapPin, PencilSimple, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { simpanAlamatSaya } from "@/aksi/alamat";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { ALAMAT_KOSONG, formatAlamat, type NilaiAlamat, type OpsiKecamatan } from "@/lib/domain/alamat";
import { IsianAlamat } from "./isian-alamat";

/** Kartu alamat domisili di halaman akun warga: tampil, isi (akun lama), atau ubah. */
export function AlamatSaya({ alamat, wilayah }: { alamat: NilaiAlamat | null; wilayah: OpsiKecamatan[] }) {
  const router = useRouter();
  const toast = useToast();
  const [ubah, setUbah] = useState(!alamat);
  const [nilai, setNilai] = useState<NilaiAlamat>(alamat ?? ALAMAT_KOSONG);
  const [galat, setGalat] = useState<Partial<Record<keyof NilaiAlamat, string>>>({});
  const [memuat, setMemuat] = useState(false);

  if (!ubah && alamat) {
    return (
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-garis bg-putih p-4">
        <MapPin aria-hidden weight="duotone" className="mt-0.5 size-6 shrink-0 text-hutan" />
        <p className="min-w-0 flex-1">{formatAlamat(alamat, wilayah)}</p>
        <Tombol varian="kedua" ikon={<PencilSimple aria-hidden className="size-5" />} onClick={() => setUbah(true)}>
          Ubah alamat
        </Tombol>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-lg border-2 border-hutan bg-putih p-4 md:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setMemuat(true);
        const h = await simpanAlamatSaya(nilai);
        setMemuat(false);
        if (!h.ok) {
          setGalat(h.kolom ?? {});
          toast.gagal("Alamat belum tersimpan", h.galat);
          return;
        }
        setGalat({});
        toast.sukses("Alamat domisili tersimpan");
        setUbah(false);
        router.refresh();
      }}
    >
      {!alamat && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-kuning/30 p-3 font-semibold">
          <WarningCircle aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0" />
          Akun Anda belum punya alamat domisili. Lengkapi sekarang agar data akun sesuai syarat pendaftaran.
        </p>
      )}
      <IsianAlamat awalan="saya-" wilayah={wilayah} awal={alamat ?? undefined} galat={galat} ubah={setNilai} />
      <div className="flex gap-3">
        <Tombol type="submit" memuat={memuat} teksMemuat="Menyimpan…">
          Simpan alamat
        </Tombol>
        {alamat && (
          <Tombol varian="ketiga" onClick={() => setUbah(false)}>
            Batal
          </Tombol>
        )}
      </div>
    </form>
  );
}
