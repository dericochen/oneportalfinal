import { z } from "zod";

/**
 * Alamat domisili saat ini, wajib saat membuat akun (pendaftaran warga dan
 * akun yang dibuat supervisor). Database memvalidasi ulang lewat
 * app_private.save_address (migrasi 8).
 */
export type NilaiAlamat = {
  alamat: string;
  rt: string;
  rw: string;
  kodePos: string;
  kecamatan: string;
  kelurahan: string;
};

export type OpsiKecamatan = { kode: string; nama: string; kelurahan: Array<{ kode: string; nama: string }> };

export const KOLOM_ALAMAT = ["alamat", "rt", "rw", "kodePos", "kecamatan", "kelurahan"] as const satisfies ReadonlyArray<keyof NilaiAlamat>;

export const ALAMAT_KOSONG: NilaiAlamat = { alamat: "", rt: "", rw: "", kodePos: "", kecamatan: "", kelurahan: "" };

const nomorRtRw = (nama: "RT" | "RW", contoh: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, { error: `${nama} diisi angka 1 sampai 3 digit, contoh: ${contoh}.` })
    .refine((v) => Number(v) > 0, { error: `${nama} tidak boleh 000.` })
    .transform((v) => v.padStart(3, "0"));

export const skemaAlamat = z
  .object({
    alamat: z
      .string()
      .trim()
      .min(5, { error: "Tulis alamat domisili (jalan, nomor rumah, gang), minimal 5 karakter." })
      .max(300, { error: "Alamat paling panjang 300 karakter." }),
    rt: nomorRtRw("RT", "003"),
    rw: nomorRtRw("RW", "005"),
    kodePos: z.string().trim().regex(/^\d{5}$/, { error: "Kode pos terdiri dari 5 angka, contoh: 20228." }),
    kecamatan: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, { error: "Pilih kecamatan domisili." }),
    kelurahan: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, { error: "Pilih kelurahan domisili." }),
  })
  // Kode kelurahan Kemendagri diawali kode kecamatannya (12.71.01 -> 12.71.01.1001).
  .refine((d) => d.kelurahan.startsWith(`${d.kecamatan}.`), {
    error: "Kelurahan tidak berada di kecamatan yang dipilih.",
    path: ["kelurahan"],
  });

export type AlamatSah = z.output<typeof skemaAlamat>;

/** Ambil isian alamat dari FormData (form pendaftaran). */
export function bacaAlamat(data: FormData): NilaiAlamat {
  return Object.fromEntries(KOLOM_ALAMAT.map((k) => [k, String(data.get(k) ?? "")])) as NilaiAlamat;
}

/** Semua kolom alamat kosong (boleh dilewati saat supervisor mengubah akun lama). */
export const alamatKosong = (a: NilaiAlamat) => KOLOM_ALAMAT.every((k) => !a[k].trim());

/** Payload `domicile` untuk database. */
export function payloadAlamat(a: AlamatSah) {
  return {
    address: a.alamat,
    rt: a.rt,
    rw: a.rw,
    postal_code: a.kodePos,
    district_code: a.kecamatan,
    village_code: a.kelurahan,
  };
}

/** Baris tabel profile_addresses -> nilai form. */
export function dariBaris(b: {
  address: string;
  rt: string;
  rw: string;
  postal_code: string;
  district_code: string;
  village_code: string;
}): NilaiAlamat {
  return { alamat: b.address, rt: b.rt, rw: b.rw, kodePos: b.postal_code, kecamatan: b.district_code, kelurahan: b.village_code };
}

/** "Jl. Denai No. 5, RT 003/RW 005, Kel. Denai, Kec. Medan Denai, Kota Medan 20228" */
export function formatAlamat(a: NilaiAlamat, wilayah: OpsiKecamatan[]): string {
  const kec = wilayah.find((w) => w.kode === a.kecamatan);
  const kel = kec?.kelurahan.find((k) => k.kode === a.kelurahan);
  return [
    a.alamat,
    `RT ${a.rt}/RW ${a.rw}`,
    kel ? `Kel. ${kel.nama}` : null,
    kec ? `Kec. ${kec.nama}` : null,
    `Kota Medan ${a.kodePos}`,
  ]
    .filter(Boolean)
    .join(", ");
}

/** "Kel. Denai, Kec. Medan Denai" untuk daftar ringkas. */
export function ringkasWilayah(a: NilaiAlamat, wilayah: OpsiKecamatan[]): string {
  const kec = wilayah.find((w) => w.kode === a.kecamatan);
  const kel = kec?.kelurahan.find((k) => k.kode === a.kelurahan);
  return [kel && `Kel. ${kel.nama}`, kec && `Kec. ${kec.nama}`].filter(Boolean).join(", ");
}
