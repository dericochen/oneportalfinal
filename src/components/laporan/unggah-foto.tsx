"use client";

import { Camera, Trash, UploadSimple } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { muatGambar, perkecil } from "@/lib/gambar";
import { buatKlienBrowser } from "@/lib/supabase/client";

/**
 * Unggah foto langsung dari browser ke Supabase Storage (bucket privat
 * "laporan", folder milik pengguna; RLS menolak folder lain). Sebelum
 * diunggah, foto dikompres di browser (maks 1600 px, ±1 MB) lewat canvas,
 * yang sekaligus membuang metadata EXIF (lokasi GPS, merek HP). Thumbnail
 * 320 px dibuat untuk peta dan daftar.
 */
export type MediaUnggah = {
  path: string;
  thumb_path: string;
  mime_type: "image/jpeg";
  size_bytes: number;
  width: number;
  height: number;
  /** Hanya untuk pratinjau di browser. */
  pratinjau: string;
};

const MAKS_SISI = 1600;
const SISI_THUMB = 320;

const namaAcak = () => crypto.randomUUID().replace(/-/g, "");

export function UnggahFoto({
  idPengguna,
  nilai,
  ubah,
  maks = 5,
  label,
  petunjuk,
  error,
  kamera = false,
}: {
  idPengguna: string;
  nilai: MediaUnggah[];
  ubah: (m: MediaUnggah[]) => void;
  maks?: number;
  label: string;
  petunjuk?: string;
  error?: string;
  /** Buka kamera belakang langsung (untuk petugas). */
  kamera?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [proses, setProses] = useState(0);
  const [galat, setGalat] = useState<string | null>(null);
  const sisa = maks - nilai.length;

  async function pilih(berkas: FileList | null) {
    if (!berkas?.length) return;
    setGalat(null);
    const daftar = [...berkas].slice(0, sisa);
    if (berkas.length > sisa) setGalat(`Maksimal ${maks} foto. ${berkas.length - sisa} foto tidak ditambahkan.`);
    setProses(daftar.length);
    const supabase = buatKlienBrowser();
    const baru: MediaUnggah[] = [];
    for (const f of daftar) {
      try {
        if (!f.type.startsWith("image/")) throw new Error("bukan gambar");
        if (f.size > 25 * 1024 * 1024) throw new Error("terlalu besar");
        const gambar = await muatGambar(f);
        let besar = await perkecil(gambar, MAKS_SISI, 0.82);
        if (besar.blob.size > 1_100_000) besar = await perkecil(gambar, MAKS_SISI, 0.68);
        const kecil = await perkecil(gambar, SISI_THUMB, 0.75);
        const nama = namaAcak();
        const path = `${idPengguna}/${nama}.jpg`;
        const thumb = `${idPengguna}/${nama}-t.jpg`;
        const [a, b] = await Promise.all([
          supabase.storage.from("laporan").upload(path, besar.blob, { contentType: "image/jpeg", upsert: false }),
          supabase.storage.from("laporan").upload(thumb, kecil.blob, { contentType: "image/jpeg", upsert: false }),
        ]);
        if (a.error || b.error) {
          // Bersihkan unggahan yang berhasil jika pasangannya gagal agar tidak
          // meninggalkan berkas yatim di Storage.
          const hapus = [
            ...(a.error ? [] : [path]),
            ...(b.error ? [] : [thumb]),
          ];
          if (hapus.length) await supabase.storage.from("laporan").remove(hapus);
          throw a.error ?? b.error;
        }
        baru.push({
          path,
          thumb_path: thumb,
          mime_type: "image/jpeg",
          size_bytes: besar.blob.size,
          width: besar.w,
          height: besar.h,
          pratinjau: URL.createObjectURL(kecil.blob),
        });
      } catch (e) {
        const m = (e as Error).message;
        setGalat(
          m === "bukan gambar"
            ? `${f.name} bukan foto. Pilih berkas JPG, PNG, atau WEBP.`
            : m === "terlalu besar"
              ? `${f.name} lebih dari 25 MB.`
              : "Foto belum terunggah karena koneksi terputus. Coba lagi, isian Anda tidak hilang.",
        );
      } finally {
        setProses((p) => p - 1);
      }
    }
    ubah([...nilai, ...baru]);
    if (input.current) input.current.value = "";
  }

  function hapus(i: number) {
    const target = nilai[i];
    if (target) URL.revokeObjectURL(target.pratinjau);
    // Hapus berkas dari Storage juga agar penghapusan lampiran tidak meninggalkan
    // file yang tidak tertaut ke laporan.
    if (target) {
      void buatKlienBrowser()
        .storage.from("laporan")
        .remove([target.path, target.thumb_path])
        .then(({ error }) => {
          if (error) setGalat("Foto dihapus dari formulir, tetapi berkas penyimpanannya belum berhasil dibersihkan.");
        })
        .catch(() => setGalat("Foto dihapus dari formulir, tetapi berkas penyimpanannya belum berhasil dibersihkan."));
    }
    ubah(nilai.filter((_, n) => n !== i));
  }

  const pesan = galat ?? error;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-semibold">{label}</legend>
      {petunjuk && <p className="text-kecil text-aspal-2">{petunjuk}</p>}
      {nilai.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {nilai.map((m, i) => (
            <li key={m.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob URL) */}
              <img src={m.pratinjau} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full rounded-sm border border-garis object-cover" />
              <button
                type="button"
                onClick={() => hapus(i)}
                aria-label={`Hapus foto ${i + 1}`}
                className="absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-sm border border-aspal bg-putih hover:bg-abu"
              >
                <Trash aria-hidden className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {sisa > 0 && (
        <label
          htmlFor={id}
          className={cx(
            "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 self-start rounded-sm border-2 border-dashed px-4 font-semibold hover:bg-abu",
            pesan ? "border-merah" : "border-garis-tegas",
            proses > 0 && "pointer-events-none opacity-60",
          )}
        >
          {kamera ? <Camera aria-hidden className="size-5" /> : <UploadSimple aria-hidden className="size-5" />}
          {proses > 0 ? `Mengunggah ${proses} foto…` : nilai.length ? "Tambah foto" : kamera ? "Ambil foto" : "Pilih foto"}
          <span className="font-normal text-aspal-2">
            ({nilai.length}/{maks})
          </span>
        </label>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        multiple={!kamera}
        capture={kamera ? "environment" : undefined}
        className="sr-only"
        onChange={(e) => pilih(e.target.files)}
      />
      {pesan && (
        <p role="alert" className="text-kecil font-semibold text-merah">
          {pesan}
        </p>
      )}
    </fieldset>
  );
}

/** Buang field pratinjau sebelum dikirim ke server. */
export const untukServer = (m: MediaUnggah[]) =>
  m.map((x) => ({ path: x.path, thumb_path: x.thumb_path, mime_type: x.mime_type, size_bytes: x.size_bytes, width: x.width, height: x.height }));
