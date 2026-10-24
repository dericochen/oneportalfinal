"use client";

import { useRef, useState } from "react";
import { AreaTeks, Masukan, Pilihan } from "@/components/ui/isian";
import { ALAMAT_KOSONG, type NilaiAlamat, type OpsiKecamatan } from "@/lib/domain/alamat";

/**
 * Isian alamat domisili saat ini: alamat, RT, RW, kode pos, kecamatan,
 * kelurahan (Kota Medan). Kolomnya tidak terkendali (defaultValue) dan bernama
 * sama dengan kunci NilaiAlamat, jadi bisa dibaca lewat FormData (form
 * pendaftaran) atau lewat `ubah` (form yang dikirim dengan JavaScript).
 */
export function IsianAlamat({
  wilayah,
  awal,
  galat,
  ubah,
  awalan = "",
  judul = "Alamat domisili saat ini",
  keterangan = "Alamat tempat tinggal sekarang di Kota Medan. Tidak pernah ditampilkan ke publik.",
}: {
  wilayah: OpsiKecamatan[];
  awal?: Partial<NilaiAlamat>;
  galat?: Partial<Record<keyof NilaiAlamat, string | undefined>>;
  ubah?: (nilai: NilaiAlamat) => void;
  /** Awalan id kolom bila ada lebih dari satu isian alamat di halaman. */
  awalan?: string;
  judul?: string;
  keterangan?: string;
}) {
  const nilai = useRef<NilaiAlamat>({ ...ALAMAT_KOSONG, ...awal });
  const [kec, setKec] = useState(awal?.kecamatan ?? "");
  const kelurahan = wilayah.find((w) => w.kode === kec)?.kelurahan ?? [];

  function set(kunci: keyof NilaiAlamat, isi: string) {
    nilai.current = { ...nilai.current, [kunci]: isi };
    ubah?.(nilai.current);
  }
  const angkaSaja = (e: React.ChangeEvent<HTMLInputElement>, kunci: keyof NilaiAlamat) => {
    e.target.value = e.target.value.replace(/\D/g, "");
    set(kunci, e.target.value);
  };

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-h3">{judul}</legend>
      <p className="-mt-2 text-kecil text-aspal-2">{keterangan}</p>
      <AreaTeks
        id={`${awalan}alamat`}
        name="alamat"
        label="Alamat"
        petunjuk="Nama jalan, nomor rumah, gang, atau lingkungan. Contoh: Jl. Denai Gg. Mawar No. 12, Lingkungan III."
        rows={2}
        maxLength={300}
        autoComplete="street-address"
        defaultValue={awal?.alamat}
        onChange={(e) => set("alamat", e.target.value)}
        error={galat?.alamat}
        wajib
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Masukan
          id={`${awalan}rt`}
          name="rt"
          label="RT"
          inputMode="numeric"
          maxLength={3}
          placeholder="003"
          defaultValue={awal?.rt}
          onChange={(e) => angkaSaja(e, "rt")}
          error={galat?.rt}
          wajib
        />
        <Masukan
          id={`${awalan}rw`}
          name="rw"
          label="RW"
          inputMode="numeric"
          maxLength={3}
          placeholder="005"
          defaultValue={awal?.rw}
          onChange={(e) => angkaSaja(e, "rw")}
          error={galat?.rw}
          wajib
        />
        <Masukan
          id={`${awalan}kodePos`}
          name="kodePos"
          label="Kode pos"
          inputMode="numeric"
          maxLength={5}
          placeholder="20228"
          autoComplete="postal-code"
          defaultValue={awal?.kodePos}
          onChange={(e) => angkaSaja(e, "kodePos")}
          error={galat?.kodePos}
          className="col-span-2 sm:col-span-1"
          wajib
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Pilihan
          id={`${awalan}kecamatan`}
          name="kecamatan"
          label="Kecamatan"
          defaultValue={awal?.kecamatan ?? ""}
          onChange={(e) => {
            setKec(e.target.value);
            set("kecamatan", e.target.value);
            set("kelurahan", "");
          }}
          error={galat?.kecamatan}
          wajib
        >
          <option value="">Pilih kecamatan</option>
          {wilayah.map((w) => (
            <option key={w.kode} value={w.kode}>
              {w.nama}
            </option>
          ))}
        </Pilihan>
        <Pilihan
          // Ganti kecamatan: kolom kelurahan dibuat ulang agar pilihannya kosong lagi.
          key={kec}
          id={`${awalan}kelurahan`}
          name="kelurahan"
          label="Kelurahan"
          defaultValue={kec === awal?.kecamatan ? (awal?.kelurahan ?? "") : ""}
          onChange={(e) => set("kelurahan", e.target.value)}
          disabled={!kec}
          error={galat?.kelurahan}
          wajib
        >
          <option value="">{kec ? "Pilih kelurahan" : "Pilih kecamatan dulu"}</option>
          {kelurahan.map((k) => (
            <option key={k.kode} value={k.kode}>
              {k.nama}
            </option>
          ))}
        </Pilihan>
      </div>
    </fieldset>
  );
}
