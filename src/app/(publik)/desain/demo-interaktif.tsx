"use client";

import { useState } from "react";
import { CapSelesai } from "@/components/ui/cap-selesai";
import { DialogKonfirmasi } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";

/** Bagian interaktif halaman /desain: toast, dialog konfirmasi, animasi cap. */
export function DemoInteraktif() {
  const toast = useToast();
  const [kunciCap, setKunciCap] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        <Tombol varian="kedua" onClick={() => toast.sukses("Laporan terkirim", "Kode OP-2026-00182. Simpan resi Anda.")}>
          Tampilkan toast sukses
        </Tombol>
        <Tombol
          varian="kedua"
          onClick={() =>
            toast.gagal("Foto belum terunggah", "Koneksi terputus. Coba lagi, isian Anda tidak hilang.")
          }
        >
          Tampilkan toast gagal
        </Tombol>
        <Tombol varian="kedua" onClick={() => toast.info("Ada 3 laporan baru", "Antrean verifikasi diperbarui.")}>
          Tampilkan toast info
        </Tombol>
      </div>

      <div>
        <DialogKonfirmasi
          pemicu={<Tombol varian="bahaya">Hapus layanan</Tombol>}
          judul="Hapus layanan Pembuatan KTP-el?"
          pesan="Layanan akan disembunyikan dari halaman publik. Anda bisa memulihkannya dari daftar data terhapus."
          labelKonfirmasi="Ya, hapus layanan"
          teksMemuat="Menghapus…"
          onKonfirmasi={async () => {
            await new Promise((r) => setTimeout(r, 700));
            toast.sukses("Layanan dihapus", "Pulihkan kapan saja dari Tampilkan data terhapus.");
          }}
        />
      </div>

      <div className="flex flex-col items-start gap-3">
        <div className="flex min-h-36 items-center">
          <CapSelesai key={kunciCap} tanggal="2026-10-14T09:25:00Z" baru={kunciCap > 0} />
        </div>
        <Tombol varian="kedua" onClick={() => setKunciCap((k) => k + 1)}>
          Putar ulang animasi cap
        </Tombol>
      </div>
    </div>
  );
}

/** Demo state memuat tombol. */
export function DemoTombolMemuat() {
  const [memuat, setMemuat] = useState(false);
  return (
    <Tombol
      memuat={memuat}
      teksMemuat="Mengirim…"
      onClick={() => {
        setMemuat(true);
        setTimeout(() => setMemuat(false), 1500);
      }}
    >
      Kirim laporan
    </Tombol>
  );
}
