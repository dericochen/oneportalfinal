"use client";

import { useState } from "react";
import { type MediaUnggah, UnggahFoto, untukServer } from "@/components/laporan/unggah-foto";
import { useAksi } from "@/components/staf/panel-aksi";
import { AreaTeks, KotakCentang, Masukan } from "@/components/ui/isian";
import { Tombol } from "@/components/ui/tombol";
import type { StatusLaporan } from "@/lib/domain/laporan";

/** Hari ini dalam WIB (YYYY-MM-DD) untuk batas tanggal pengerjaan. */
const hariIniWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function FormProgres({ id, idPengguna }: { id: string; idPengguna: string }) {
  const { jalankan, memuat } = useAksi(id);
  const [catatan, setCatatan] = useState("");
  const [foto, setFoto] = useState<MediaUnggah[]>([]);
  const [tampil, setTampil] = useState(true);
  return (
    <section className="flex flex-col gap-4 rounded-md border-2 border-garis p-4">
      <h2 className="text-h3">Tambah progres</h2>
      <AreaTeks name="progres" label="Catatan progres" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} petunjuk="Contoh: Material sudah tiba, penambalan dimulai besok pagi." />
      <UnggahFoto idPengguna={idPengguna} nilai={foto} ubah={setFoto} label="Foto progres" maks={5} kamera />
      <KotakCentang name="tampil" label="Tampilkan ke warga" keterangan="Catatan dan foto muncul di halaman lacak." checked={tampil} onChange={(e) => setTampil(e.target.checked)} />
      <Tombol
        varian="kedua"
        ukuran="besar"
        memuat={memuat === "add_progress"}
        teksMemuat="Menyimpan…"
        onClick={async () => {
          if (await jalankan("add_progress", { note: catatan, show_to_citizen: tampil, media: untukServer(foto) }, "Progres tersimpan")) {
            setCatatan("");
            setFoto([]);
          }
        }}
      >
        Simpan progres
      </Tombol>
    </section>
  );
}

function FormBukti({ id, idPengguna }: { id: string; idPengguna: string }) {
  const { jalankan, memuat } = useAksi(id);
  const [sebelum, setSebelum] = useState<MediaUnggah[]>([]);
  const [sesudah, setSesudah] = useState<MediaUnggah[]>([]);
  const [uraian, setUraian] = useState("");
  const [tanggal, setTanggal] = useState(hariIniWib());
  const [benar, setBenar] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim() {
    const g =
      sebelum.length === 0
        ? "Lampirkan minimal 1 foto sebelum dikerjakan."
        : sesudah.length === 0
          ? "Lampirkan minimal 1 foto sesudah dikerjakan."
          : uraian.trim().length < 30
            ? "Jelaskan pekerjaan minimal 30 karakter."
            : !tanggal || tanggal > hariIniWib()
              ? "Tanggal pengerjaan tidak boleh di masa depan."
              : !benar
                ? "Centang pernyataan bahwa bukti ini benar."
                : null;
    setGalat(g);
    if (g) return;
    await jalankan(
      "submit_proof",
      { before: untukServer(sebelum), after: untukServer(sesudah), description: uraian, work_date: tanggal, declaration: true },
      "Bukti terkirim, menunggu ditinjau admin",
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border-2 border-aspal p-4">
      <h2 className="text-h3">Kirim bukti selesai</h2>
      <p className="text-aspal-2">Admin memeriksa bukti ini. Laporan baru dinyatakan selesai setelah admin menyetujuinya.</p>
      <UnggahFoto idPengguna={idPengguna} nilai={sebelum} ubah={setSebelum} label="Foto sebelum dikerjakan" petunjuk="Ambil dari sudut yang sama dengan foto sesudah." kamera />
      <UnggahFoto idPengguna={idPengguna} nilai={sesudah} ubah={setSesudah} label="Foto sesudah dikerjakan" kamera />
      <AreaTeks
        name="uraian"
        label="Pekerjaan yang dilakukan"
        rows={4}
        value={uraian}
        onChange={(e) => setUraian(e.target.value)}
        penghitung={{ panjang: uraian.length, maks: 2000 }}
        maxLength={2000}
        petunjuk="Minimal 30 karakter. Contoh: Lubang ditambal aspal dingin seluas ±2 m², permukaan diratakan."
      />
      <Masukan name="tanggal_kerja" type="date" label="Tanggal pengerjaan" value={tanggal} max={hariIniWib()} onChange={(e) => setTanggal(e.target.value)} />
      <KotakCentang name="benar" label="Saya menyatakan foto dan keterangan ini benar" checked={benar} onChange={(e) => setBenar(e.target.checked)} />
      {galat && (
        <p role="alert" className="font-semibold text-merah">
          {galat}
        </p>
      )}
      <Tombol ukuran="besar" lebarPenuh memuat={memuat === "submit_proof"} teksMemuat="Mengirim bukti…" onClick={kirim}>
        Kirim bukti selesai
      </Tombol>
    </section>
  );
}

export function PanelAksiPetugas({ id, status, idPengguna }: { id: string; status: StatusLaporan; idPengguna: string }) {
  const { jalankan, memuat } = useAksi(id);
  if (status === "ASSIGNED") {
    return (
      <Tombol ukuran="besar" lebarPenuh memuat={memuat === "start"} teksMemuat="Memulai…" onClick={() => jalankan("start", {}, "Pekerjaan dimulai")}>
        Mulai kerjakan
      </Tombol>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <div className="flex flex-col gap-6">
        <FormBukti id={id} idPengguna={idPengguna} />
        <FormProgres id={id} idPengguna={idPengguna} />
      </div>
    );
  }
  if (status === "UNDER_REVIEW") {
    return <p className="rounded-md bg-abu p-4">Bukti sudah terkirim dan sedang ditinjau admin. Anda akan dikabari lewat notifikasi.</p>;
  }
  return null;
}
