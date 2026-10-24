"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { kirimLaporan, sarankanWilayah } from "@/aksi/laporan";
import { PemilihLokasi, type Titik } from "@/components/peta/pemilih-lokasi";
import { AreaTeks, KotakCentang, Masukan, Pilihan, Radio, RingkasanError } from "@/components/ui/isian";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { type MediaUnggah, UnggahFoto, untukServer } from "./unggah-foto";

export type OpsiKategori = { id: string; slug: string; nama: string; keterangan: string | null };
export type OpsiWilayah = { kode: string; nama: string; lat: number; lng: number; kelurahan: Array<{ kode: string; nama: string }> };

const KANAL = [
  { nilai: "PHONE", label: "Telepon" },
  { nilai: "WALK_IN", label: "Datang langsung ke loket" },
  { nilai: "SOCIAL", label: "Media sosial" },
] as const;

/**
 * Form laporan. Dipakai warga (/lapor) dan admin (CMS, laporan dari telepon/
 * loket/media sosial). Foto diunggah langsung ke Storage sebelum dikirim.
 * Server memvalidasi ulang semuanya.
 */
export function FormLaporan({
  idPengguna,
  kategori,
  wilayah,
  mode,
}: {
  idPengguna: string;
  kategori: OpsiKategori[];
  wilayah: OpsiWilayah[];
  mode: "warga" | "admin";
}) {
  const router = useRouter();
  const toast = useToast();
  const [kat, setKat] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [foto, setFoto] = useState<MediaUnggah[]>([]);
  const [titik, setTitik] = useState<Titik | null>(null);
  const [tujuPeta, setTujuPeta] = useState<Titik | null>(null);
  const [kec, setKec] = useState("");
  const [kel, setKel] = useState("");
  const [alamat, setAlamat] = useState("");
  const [anonim, setAnonim] = useState(false);
  const [rahasia, setRahasia] = useState(false);
  const [hp, setHp] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [kanal, setKanal] = useState<(typeof KANAL)[number]["nilai"]>("PHONE");
  const [namaPelapor, setNamaPelapor] = useState("");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<Array<{ id: string; pesan: string }>>([]);
  const [galatServer, setGalatServer] = useState<string | null>(null);
  const [luarKota, setLuarKota] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const ringkasan = useRef<HTMLDivElement>(null);

  const kelurahan = useMemo(() => wilayah.find((w) => w.kode === kec)?.kelurahan ?? [], [wilayah, kec]);

  // Saran kecamatan dari titik peta (dan cek di dalam Kota Medan).
  useEffect(() => {
    if (!titik) return;
    const t = window.setTimeout(async () => {
      const s = await sarankanWilayah(titik.lat, titik.lng);
      setLuarKota(!s.dalamKota);
      if (s.kode && s.kode !== kec) {
        setKec(s.kode);
        setKel("");
      }
    }, 400);
    return () => window.clearTimeout(t);
    // kec sengaja tidak jadi dependensi: saran hanya mengikuti titik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titik]);

  function pilihKecamatan(kode: string) {
    setKec(kode);
    setKel("");
    // Belum ada titik: arahkan peta ke pusat kecamatan; titik terisi setelah peta berhenti.
    if (!titik) {
      const w = wilayah.find((x) => x.kode === kode);
      if (w) setTujuPeta({ lat: w.lat, lng: w.lng });
    }
  }

  function periksa() {
    const g: Array<{ id: string; pesan: string }> = [];
    if (!kat) g.push({ id: "kategori-pertama", pesan: "Pilih kategori masalah" });
    if (judul.trim().length < 10) g.push({ id: "judul", pesan: "Judul laporan minimal 10 karakter" });
    if (deskripsi.trim().length < 20) g.push({ id: "deskripsi", pesan: "Deskripsi minimal 20 karakter" });
    if (foto.length === 0) g.push({ id: "foto", pesan: "Lampirkan minimal 1 foto masalah" });
    if (!titik) g.push({ id: "lokasi", pesan: "Tentukan titik lokasi masalah" });
    if (luarKota) g.push({ id: "lokasi", pesan: "Titik lokasi berada di luar Kota Medan" });
    if (!kec) g.push({ id: "kecamatan", pesan: "Pilih kecamatan" });
    if (!kel) g.push({ id: "kelurahan", pesan: "Pilih kelurahan" });
    if (alamat.trim().length < 5) g.push({ id: "alamat", pesan: "Isi alamat atau patokan, minimal 5 karakter" });
    if (hp && !/^\+?[0-9 -]{8,20}$/.test(hp)) g.push({ id: "hp", pesan: "Nomor HP tidak valid" });
    if (!setuju) g.push({ id: "setuju-ya", pesan: "Centang persetujuan pemrosesan data" });
    return g;
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalatServer(null);
    const g = periksa();
    setGalat(g);
    if (g.length) {
      requestAnimationFrame(() => ringkasan.current?.querySelector<HTMLElement>("[role=alert]")?.focus());
      return;
    }
    setMengirim(true);
    try {
      const hasil = await kirimLaporan({
        title: judul,
        description: deskripsi,
        category_id: kat,
        lat: titik!.lat,
        lng: titik!.lng,
        district_code: kec,
        village_code: kel,
        address: alamat,
        is_anonymous: anonim,
        is_confidential: rahasia,
        phone: hp || undefined,
        consent: true,
        media: untukServer(foto),
        ...(mode === "admin" ? { channel: kanal, intake_name: namaPelapor || undefined, intake_note: catatan || undefined } : {}),
      });
      if (!hasil.ok) {
        setGalatServer(hasil.galat);
        toast.gagal("Laporan belum terkirim", hasil.galat);
        return;
      }
      toast.sukses("Laporan terkirim", `Kode ${hasil.kode}.`);
      router.push(mode === "admin" ? `/admin/laporan/${hasil.id}` : `/lapor/resi/${hasil.kode}`);
    } catch {
      const pesan = "Terjadi gangguan saat mengirim laporan. Periksa koneksi Anda lalu coba lagi.";
      setGalatServer(pesan);
      toast.gagal("Laporan belum terkirim", pesan);
    } finally {
      setMengirim(false);
    }
  }

  const err = (id: string) => galat.find((g) => g.id === id)?.pesan;

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-10">
      <div ref={ringkasan} className="flex flex-col gap-3">
        <RingkasanError galat={galat} />
        {galatServer && (
          <p role="alert" className="rounded-md border-2 border-merah p-4 font-semibold">
            {galatServer}
          </p>
        )}
      </div>

      {mode === "admin" && (
        <section aria-labelledby="judul-kanal" className="flex flex-col gap-4 rounded-md bg-abu p-4">
          <h2 id="judul-kanal" className="text-h3">
            Sumber laporan
          </h2>
          <fieldset className="flex flex-col">
            <legend className="mb-1 font-semibold">Laporan masuk lewat</legend>
            {KANAL.map((k) => (
              <Radio key={k.nilai} name="kanal" value={k.nilai} label={k.label} checked={kanal === k.nilai} onChange={() => setKanal(k.nilai)} />
            ))}
          </fieldset>
          <Masukan
            name="nama_pelapor"
            label="Nama pelapor"
            petunjuk="Disimpan untuk keperluan internal. Tidak pernah tampil publik."
            value={namaPelapor}
            onChange={(e) => setNamaPelapor(e.target.value)}
            maxLength={120}
            opsional
          />
          <AreaTeks
            name="catatan_masuk"
            label="Catatan penerimaan"
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            maxLength={500}
            opsional
          />
        </section>
      )}

      <section aria-labelledby="judul-masalah" className="flex flex-col gap-6">
        <h2 id="judul-masalah" className="text-h2">
          1. Masalah
        </h2>
        <fieldset>
          <legend className="mb-2 font-semibold">Kategori</legend>
          {err("kategori-pertama") && <p className="mb-2 text-kecil font-semibold text-merah">{err("kategori-pertama")}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kategori.map((k, i) => (
              <label
                key={k.id}
                className={cx(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border-2 p-3 has-[:checked]:border-aspal has-[:checked]:bg-abu",
                  err("kategori-pertama") ? "border-merah" : "border-garis",
                )}
              >
                <input
                  id={i === 0 ? "kategori-pertama" : undefined}
                  type="radio"
                  name="kategori"
                  value={k.id}
                  checked={kat === k.id}
                  onChange={() => setKat(k.id)}
                  className="radio-rambu size-5 shrink-0"
                />
                <PelatKategori slug={k.slug} />
                <span className="font-semibold">{k.nama}</span>
              </label>
            ))}
          </div>
          {kategori.find((k) => k.id === kat)?.slug === "air-bersih" && (
            <p className="mt-2 text-kecil text-aspal-2">
              Air bersih perpipaan dikelola Perumda Tirtanadi. Laporan Anda tetap kami terima dan teruskan.
            </p>
          )}
        </fieldset>
        <Masukan
          name="judul"
          label="Judul laporan"
          petunjuk="Singkat dan jelas, misalnya: Lubang besar di depan sekolah dasar."
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          maxLength={120}
          error={err("judul")}
          wajib
        />
        <AreaTeks
          name="deskripsi"
          label="Deskripsi"
          petunjuk="Sejak kapan, seberapa parah, dan siapa yang terdampak."
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          maxLength={2000}
          penghitung={{ panjang: deskripsi.length, maks: 2000 }}
          error={err("deskripsi")}
          wajib
        />
        <div id="foto">
          <UnggahFoto
            idPengguna={idPengguna}
            nilai={foto}
            ubah={setFoto}
            label="Foto masalah"
            petunjuk="1 sampai 5 foto. Foto dikompres dan data lokasi di dalam berkas foto dihapus otomatis."
            error={err("foto")}
          />
        </div>
      </section>

      <section aria-labelledby="judul-lokasi" className="flex flex-col gap-6">
        <h2 id="judul-lokasi" className="text-h2">
          2. Lokasi
        </h2>
        <div id="lokasi" className="flex flex-col gap-2">
          <p className="font-semibold">Cari alamat, atau geser peta sampai pin merah tepat di lokasi masalah</p>
          <PemilihLokasi nilai={titik} ubah={setTitik} tuju={tujuPeta} />
          {(err("lokasi") || luarKota) && (
            <p className="text-kecil font-semibold text-merah">
              {luarKota ? "Titik ini berada di luar Kota Medan. Geser peta ke lokasi di dalam Kota Medan." : err("lokasi")}
            </p>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Pilihan name="kecamatan" label="Kecamatan" value={kec} onChange={(e) => pilihKecamatan(e.target.value)} error={err("kecamatan")} wajib>
            <option value="">Pilih kecamatan</option>
            {wilayah.map((w) => (
              <option key={w.kode} value={w.kode}>
                {w.nama}
              </option>
            ))}
          </Pilihan>
          <Pilihan
            name="kelurahan"
            label="Kelurahan"
            value={kel}
            onChange={(e) => setKel(e.target.value)}
            disabled={!kec}
            error={err("kelurahan")}
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
        <Masukan
          name="alamat"
          label="Alamat atau patokan"
          petunjuk="Contoh: Jl. Denai, depan masjid, sebelah warung kopi."
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          maxLength={300}
          error={err("alamat")}
          wajib
        />
      </section>

      <section aria-labelledby="judul-privasi" className="flex flex-col gap-6">
        <h2 id="judul-privasi" className="text-h2">
          3. Privasi dan kirim
        </h2>
        <fieldset className="flex flex-col">
          <legend className="sr-only">Pilihan privasi</legend>
          <KotakCentang
            name="anonim"
            label="Sembunyikan identitas pelapor"
            keterangan="Petugas dan publik tidak melihat nama dan nomor HP."
            checked={anonim}
            onChange={(e) => setAnonim(e.target.checked)}
          />
          <KotakCentang
            name="rahasia"
            label="Laporan rahasia"
            keterangan="Tidak tampil di peta dan daftar publik. Tetap ditangani seperti biasa."
            checked={rahasia}
            onChange={(e) => setRahasia(e.target.checked)}
          />
        </fieldset>
        <Masukan
          name="hp"
          type="tel"
          inputMode="tel"
          label={mode === "admin" ? "Nomor HP pelapor" : "Nomor HP"}
          petunjuk="Dipakai petugas bila perlu menanyakan lokasi."
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          error={err("hp")}
          opsional
        />
        <div>
          <KotakCentang
            name="setuju"
            value="ya"
            label={mode === "admin" ? "Pelapor sudah menyetujui datanya diproses" : "Saya setuju data laporan ini diproses"}
            keterangan="Hanya untuk menangani laporan. ONE PORTAL tidak meminta NIK."
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
          />
          {err("setuju-ya") && <p className="text-kecil font-semibold text-merah">{err("setuju-ya")}</p>}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-garis bg-putih px-4 py-3 pb-aman md:static md:mx-0 md:border-0 md:p-0">
        <Tombol type="submit" ukuran="besar" lebarPenuh memuat={mengirim} teksMemuat="Mengirim laporan…" className="md:w-auto">
          Kirim laporan
        </Tombol>
      </div>
    </form>
  );
}
