import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PetaLaporan, type TitikMinimal } from "@/components/peta/peta-laporan";
import { CapSelesai } from "@/components/ui/cap-selesai";
import { ChipBerulang, ChipPrioritas, ChipSla, ChipStatus, ChipTindakan } from "@/components/ui/chip";
import { AreaTeks, KotakCentang, Masukan, Pilihan, Radio, RingkasanError } from "@/components/ui/isian";
import { Kartu } from "@/components/ui/kartu";
import { KerangkaDaftar, LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { LogResi, type KejadianLog } from "@/components/ui/log-resi";
import { Logo } from "@/components/ui/logo";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { Resi } from "@/components/ui/resi";
import {
  ButirRingkas,
  DaftarRingkas,
  Tabel,
  TabelBaris,
  TabelJudulSel,
  TabelKepala,
  TabelSel,
} from "@/components/ui/tabel";
import { Tombol, TombolTautan } from "@/components/ui/tombol";
import { warna } from "@/lib/design/tokens";
import { KATEGORI_LAPORAN } from "@/lib/domain/kategori";
import { LABEL_PRIORITAS, PRIORITAS, STATUS_LAPORAN, type StatusSla } from "@/lib/domain/laporan";
import { formatAngka, formatPersen } from "@/lib/format";
import { cx } from "@/lib/cx";
import { NavBawah } from "@/components/tata-letak/nav-bawah";
import { NAV_PUBLIK } from "@/components/tata-letak/navigasi";
import { DemoInteraktif, DemoTombolMemuat } from "./demo-interaktif";

export const metadata: Metadata = {
  title: "Sistem desain",
  description: "Token, tipografi, dan komponen dasar ONE PORTAL yang dibuat sendiri oleh tim.",
};

const BAGIAN = [
  { id: "warna", judul: "Warna" },
  { id: "tipografi", judul: "Tipografi" },
  { id: "ruang", judul: "Ruang dan bentuk" },
  { id: "tombol", judul: "Tombol" },
  { id: "isian", judul: "Kolom isian" },
  { id: "chip", judul: "Chip status" },
  { id: "pelat", judul: "Pelat kategori" },
  { id: "kartu", judul: "Kartu" },
  { id: "tabel", judul: "Tabel" },
  { id: "keadaan", judul: "Kosong, gagal, memuat" },
  { id: "umpan-balik", judul: "Toast, dialog, cap" },
  { id: "resi", judul: "Resi dan log lacak" },
] as const;

const WARNA: Array<{ token: string; kelas: string; hex: string; untuk: string; teksTerang?: boolean }> = [
  { token: "aspal", kelas: "bg-aspal", hex: warna.aspal, untuk: "Teks utama, tombol utama, pelat kategori", teksTerang: true },
  { token: "aspal-2", kelas: "bg-aspal-2", hex: warna.aspal2, untuk: "Teks pendukung, status menunggu", teksTerang: true },
  { token: "putih", kelas: "bg-putih", hex: warna.putih, untuk: "Latar utama, kolom isian" },
  { token: "abu", kelas: "bg-abu", hex: warna.abu, untuk: "Latar panel, latar chip" },
  { token: "garis", kelas: "bg-garis", hex: warna.garis, untuk: "Pemisah, border kartu" },
  { token: "garis-tegas", kelas: "bg-garis-tegas", hex: warna.garisTegas, untuk: "Border kolom isian, checkbox", teksTerang: true },
  { token: "kuning-rambu", kelas: "bg-kuning", hex: warna.kuning, untuk: "Hanya: Lapor masalah, Perlu tindakan Anda, fokus" },
  { token: "biru-petunjuk", kelas: "bg-biru", hex: warna.biru, untuk: "Tautan, sedang dikerjakan", teksTerang: true },
  { token: "hijau-selesai", kelas: "bg-hijau", hex: warna.hijau, untuk: "Hanya status selesai", teksTerang: true },
  { token: "oranye", kelas: "bg-oranye", hex: warna.oranye, untuk: "Prioritas tinggi, laporan berulang", teksTerang: true },
  { token: "merah", kelas: "bg-merah", hex: warna.merah, untuk: "Darurat, terlambat, error, bahaya", teksTerang: true },
  { token: "medan-merah", kelas: "bg-medan-merah", hex: warna.medanMerah, untuk: "Logo Medan Untuk Semua, hero beranda", teksTerang: true },
  { token: "medan-biru", kelas: "bg-medan-biru", hex: warna.medanBiru, untuk: "Logo Medan Untuk Semua, hero beranda", teksTerang: true },
];

const SPASI = [
  { px: 4, kelas: "w-1" },
  { px: 8, kelas: "w-2" },
  { px: 12, kelas: "w-3" },
  { px: 16, kelas: "w-4" },
  { px: 24, kelas: "w-6" },
  { px: 32, kelas: "w-8" },
  { px: 48, kelas: "w-12" },
  { px: 64, kelas: "w-16" },
  { px: 96, kelas: "w-24" },
];

const SLA_CONTOH: Array<{ sla: StatusSla; ket?: string }> = [
  { sla: "TEPAT_WAKTU", ket: "sisa 2 hari" },
  { sla: "HAMPIR_JATUH_TEMPO", ket: "sisa 5 jam" },
  { sla: "TERLAMBAT", ket: "lewat 1 hari" },
  { sla: "SELESAI_TEPAT_WAKTU" },
  { sla: "SELESAI_TERLAMBAT" },
];

// Kasus emas OP-2026-00182 (waktu dalam UTC; tampil 09.10–16.25 WIB).
const LOG_CONTOH: KejadianLog[] = [
  { id: "1", waktu: "2026-10-14T02:10:00Z", judul: "Laporan diterima", aktor: "Pelapor", status: "SUBMITTED" },
  {
    id: "2",
    waktu: "2026-10-14T02:25:00Z",
    judul: "Laporan diverifikasi",
    keterangan: "Prioritas tinggi: dekat sekolah dan membahayakan pengendara.",
    aktor: "Admin",
    status: "VERIFIED",
  },
  { id: "3", waktu: "2026-10-14T02:40:00Z", judul: "Ditugaskan ke petugas", aktor: "Admin", status: "ASSIGNED" },
  { id: "4", waktu: "2026-10-14T06:20:00Z", judul: "Mulai dikerjakan", aktor: "Petugas Dinas SDABMBK", status: "IN_PROGRESS" },
  {
    id: "5",
    waktu: "2026-10-14T09:00:00Z",
    judul: "Bukti penyelesaian dikirim",
    keterangan: "Lubang ditambal aspal dingin seluas ±2 m².",
    aktor: "Petugas Dinas SDABMBK",
    status: "UNDER_REVIEW",
  },
  { id: "6", waktu: "2026-10-14T09:25:00Z", judul: "Bukti disetujui, laporan selesai", aktor: "Admin", status: "RESOLVED" },
];

/** Titik contoh untuk pratinjau peta (bukan data laporan). */
const TITIK_CONTOH: TitikMinimal[] = [
  { id: "c1", kode: "OP-2026-90001", judul: "Jalan berlubang depan sekolah", status: "IN_PROGRESS", kategoriSlug: "jalan-rusak", lat: 3.5871, lng: 98.6722 },
  { id: "c2", kode: "OP-2026-90002", judul: "Sampah menumpuk di parit", status: "SUBMITTED", kategoriSlug: "sampah", lat: 3.5879, lng: 98.6731 },
  { id: "c3", kode: "OP-2026-90003", judul: "Lampu jalan mati", status: "ASSIGNED", kategoriSlug: "lampu-jalan", lat: 3.5866, lng: 98.6715 },
  { id: "c4", kode: "OP-2026-90004", judul: "Genangan setelah hujan", status: "RESOLVED", kategoriSlug: "drainase-banjir", lat: 3.5885, lng: 98.6709 },
  { id: "c5", kode: "OP-2026-90005", judul: "Pohon tumbang menutup jalan", status: "RESOLVED", kategoriSlug: "pohon-bencana", lat: 3.5862, lng: 98.6738 },
  { id: "c6", kode: "OP-2026-90006", judul: "Taman kota rusak", status: "VERIFIED", kategoriSlug: "fasilitas-umum", lat: 3.6245, lng: 98.7102 },
  { id: "c7", kode: "OP-2026-90007", judul: "Air bersih tidak mengalir", status: "UNDER_REVIEW", kategoriSlug: "air-bersih", lat: 3.5481, lng: 98.6544 },
  { id: "c8", kode: "OP-2026-90008", judul: "Parkir liar di trotoar", status: "REJECTED", kategoriSlug: "lalu-lintas", lat: 3.6102, lng: 98.6398 },
  { id: "c9", kode: "OP-2026-90009", judul: "Pelayanan loket lambat", status: "FORWARDED", kategoriSlug: "pelayanan-publik", lat: 3.6566, lng: 98.6752 },
  { id: "c10", kode: "OP-2026-90010", judul: "Jalan rusak di tikungan", status: "IN_PROGRESS", kategoriSlug: "jalan-rusak", lat: 3.5702, lng: 98.7015 },
];
function Bagian({ id, judul, pengantar, children }: { id: string; judul: string; pengantar?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-24 border-t border-garis pt-12">
      <h2 id={`${id}-judul`} className="text-h2">
        {judul}
      </h2>
      {pengantar && <p className="mt-2 max-w-baca text-aspal-2">{pengantar}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SubJudul({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-h3">{children}</h3>;
}

export default function HalamanDesain() {
  return (
    <div className="mx-auto w-full max-w-daftar px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">Sistem desain ONE PORTAL</h1>
        <p className="max-w-baca">
          ONE PORTAL dirancang seperti papan informasi publik: terbaca dari jauh, warnanya punya arti, tanpa hiasan.
          Warna diambil dari rambu lalu lintas, bukti laporan meniru resi kurir, dan tanda selesai meniru cap kantor
          kelurahan. Semua halaman hanya memakai token dan komponen di halaman ini.
        </p>
        <p className="text-kecil text-aspal-2">
          Sumber tertulis: berkas DESIGN.md di repositori. Halaman ini dibuat tim, bukan diambil dari template.
        </p>
      </header>

      <nav aria-label="Isi halaman" className="mt-8 rounded-md bg-abu p-4">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
          {BAGIAN.map((b) => (
            <li key={b.id}>
              <a href={`#${b.id}`} className="tautan inline-flex min-h-11 items-center">
                {b.judul}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12 flex flex-col gap-12">
        <Bagian
          id="warna"
          judul="Warna"
          pengantar="Warna kuat hanya untuk aksi dan status; selebihnya aspal, putih, dan abu. Warna selalu disertai teks dan ikon, tidak pernah berdiri sendiri."
        >
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WARNA.map((w) => (
              <li key={w.token} className="flex items-stretch gap-3">
                <span
                  aria-hidden
                  className={cx("w-16 shrink-0 rounded-sm border border-garis", w.kelas)}
                />
                <span className="flex flex-col py-1">
                  <span className="font-semibold">{w.token}</span>
                  <span className="font-kode text-kecil text-aspal-2">{w.hex}</span>
                  <span className="text-kecil text-aspal-2">{w.untuk}</span>
                </span>
              </li>
            ))}
          </ul>
          <SubJudul>Pemetaan status</SubJudul>
          <p className="mb-3 max-w-baca text-aspal-2">
            Sama di chip, titik peta, timeline, dan grafik: menunggu ditangani abu tua, sedang dikerjakan biru, selesai
            hijau, ditolak dan terlambat merah.
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_LAPORAN.map((s) => (
              <ChipStatus key={s} status={s} />
            ))}
          </div>
        </Bagian>

        <Bagian
          id="tipografi"
          judul="Tipografi"
          pengantar="Atkinson Hyperlegible Next dibuat Braille Institute untuk pembaca dengan penglihatan rendah, cocok untuk warga lansia. Versi Mono hanya dipakai untuk kode laporan agar 0/O dan 1/I/l tidak tertukar saat dibacakan lewat telepon."
        >
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-kecil text-aspal-2">H1, 30–40 px, tebal 700</p>
              <p className="text-h1 font-bold">Laporkan jalan rusak di Medan Denai</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">H2, 24–30 px</p>
              <p className="text-h2 font-bold">Baru saja selesai</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">H3, 20–22 px</p>
              <p className="text-h3 font-bold">Persyaratan</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">Teks publik, 17 px di HP dan 18 px di laptop, line-height 1,55</p>
              <p className="max-w-baca">
                Laporkan jalan rusak, sampah, atau lampu jalan mati. Anda akan dikabari sampai selesai, dan bukti foto
                penyelesaiannya bisa dilihat siapa saja di peta kota.
              </p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">Teks staf, 16 px</p>
              <p className="max-w-baca text-staf">46 laporan masuk hari ini, 31 selesai, 7 melewati tenggat.</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">Teks kecil, minimal 15 px (staf 14 px)</p>
              <p className="text-kecil">Terakhir diperbarui 13 Okt 2026, 09.10 WIB</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">Kode laporan, Atkinson Hyperlegible Mono</p>
              <p className="font-kode text-kode-besar font-bold">OP-2026-00182</p>
              <p className="mt-1 font-kode text-h3">O0 Il1 S5 B8</p>
            </div>
            <div>
              <p className="text-kecil text-aspal-2">Angka tabel, tabular</p>
              <p className="tabular-nums">
                {formatAngka(1234)}, {formatAngka(87)}, {formatPersen(0.875)}
              </p>
            </div>
            <p className="max-w-baca">
              Tautan di dalam teks selalu biru dan bergaris bawah, misalnya{" "}
              <a href="#tipografi" className="tautan">
                lihat syarat KTP-el
              </a>
              . Semua judul, tombol, dan status memakai sentence case.
            </p>
          </div>
        </Bagian>

        <Bagian
          id="ruang"
          judul="Ruang dan bentuk"
          pengantar="Skala spasi 4/8/12/16/24/32/48/64/96. Radius 4 px untuk tombol, input, dan chip; 8 px untuk kartu dan dialog; 12 px hanya di sisi atas bottom sheet."
        >
          <ul className="flex flex-col gap-2">
            {SPASI.map((s) => (
              <li key={s.px} className="flex items-center gap-3">
                <span className="w-12 text-right text-kecil tabular-nums text-aspal-2">{s.px} px</span>
                <span aria-hidden className={cx("h-4 bg-aspal", s.kelas)} />
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden className="size-16 rounded-sm border-2 border-aspal" />
              <span className="text-kecil text-aspal-2">4 px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden className="size-16 rounded-md border-2 border-aspal" />
              <span className="text-kecil text-aspal-2">8 px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden className="h-16 w-24 rounded-t-lg border-2 border-b-0 border-aspal" />
              <span className="text-kecil text-aspal-2">12 px, sisi atas sheet</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden className="size-16 rounded-md bg-putih shadow-lapis" />
              <span className="text-kecil text-aspal-2">Bayangan lapisan</span>
            </div>
          </div>
        </Bagian>

        <Bagian
          id="tombol"
          judul="Tombol"
          pengantar="Label tombol menyebut hasilnya. Kuning hanya untuk Lapor masalah. Tinggi minimal 44 px; ukuran besar 56 px untuk petugas di lapangan."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Tombol varian="lapor">Lapor masalah</Tombol>
              <Tombol>Kirim laporan</Tombol>
              <Tombol varian="kedua">Simpan draf</Tombol>
              <Tombol varian="ketiga">Lihat syarat KTP-el</Tombol>
              <Tombol varian="bahaya">Tolak laporan</Tombol>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DemoTombolMemuat />
              <Tombol disabled>Kirim laporan</Tombol>
              <TombolTautan href="#tombol" varian="kedua">
                Lacak laporan
              </TombolTautan>
            </div>
            <div className="flex max-w-form flex-col gap-3">
              <p className="text-kecil text-aspal-2">Ukuran besar (petugas)</p>
              <Tombol ukuran="besar" lebarPenuh>
                Kirim bukti selesai
              </Tombol>
            </div>
            <p className="text-kecil text-aspal-2">
              Tekan Tab untuk melihat fokus keyboard: cincin aspal 2 px dikelilingi kuning 3 px.
            </p>
            <div className="flex max-w-form flex-col gap-3">
              <p className="text-kecil text-aspal-2">
                Navigasi bawah di HP. Tab Lapor di tengah memakai pelat kuning, bukan tombol bulat melayang.
              </p>
              <NavBawah butir={NAV_PUBLIK} pratinjau />
            </div>
          </div>
        </Bagian>

        <Bagian
          id="isian"
          judul="Kolom isian"
          pengantar="Label di atas kolom, petunjuk di bawah label, pesan error di bawah kolom. Ringkasan error tampil di atas form dan menaut ke kolom yang salah."
        >
          <form className="flex max-w-form flex-col gap-6" action="#isian">
            <RingkasanError
              galat={[
                { id: "contoh-judul", pesan: "Judul laporan minimal 10 karakter" },
                { id: "contoh-kecamatan", pesan: "Pilih kecamatan lokasi masalah" },
              ]}
            />
            <Masukan
              name="contoh-judul"
              label="Judul laporan"
              petunjuk="Tulis singkat apa masalahnya, misalnya: Lubang besar di depan sekolah dasar."
              error="Judul laporan minimal 10 karakter"
              defaultValue="Lubang"
              wajib
            />
            <Masukan name="contoh-hp" label="Nomor HP" type="tel" inputMode="tel" autoComplete="tel" opsional />
            <Pilihan name="contoh-kecamatan" label="Kecamatan" error="Pilih kecamatan lokasi masalah" defaultValue="" wajib>
              <option value="" disabled>
                Pilih kecamatan
              </option>
              <option>Medan Denai</option>
              <option>Medan Tuntungan</option>
            </Pilihan>
            <AreaTeks
              name="contoh-deskripsi"
              label="Deskripsi"
              petunjuk="Jelaskan sejak kapan, seberapa parah, dan siapa yang terdampak."
              defaultValue="Lubang sedalam ±20 cm, sudah dua minggu. Banyak pengendara motor terjatuh saat hujan."
              penghitung={{ panjang: 89, maks: 1000 }}
            />
            <fieldset className="flex flex-col">
              <legend className="mb-1 font-semibold">Privasi</legend>
              <KotakCentang
                name="contoh-anonim"
                label="Sembunyikan identitas saya"
                keterangan="Petugas dan publik tidak melihat nama Anda."
              />
              <KotakCentang name="contoh-rahasia" label="Laporan rahasia" keterangan="Tidak tampil di peta dan daftar publik." defaultChecked />
            </fieldset>
            <fieldset className="flex flex-col">
              <legend className="mb-1 font-semibold">Prioritas</legend>
              {PRIORITAS.map((p, i) => (
                <Radio key={p} name="contoh-prioritas" value={p} label={LABEL_PRIORITAS[p]} defaultChecked={i === 1} />
              ))}
            </fieldset>
          </form>
        </Bagian>

        <Bagian
          id="chip"
          judul="Chip status"
          pengantar="Ikon berwarna dengan teks aspal di atas abu. Latar penuh hanya untuk Darurat dan Perlu tindakan Anda."
        >
          <div className="flex flex-col gap-6">
            <div>
              <SubJudul>Prioritas</SubJudul>
              <div className="flex flex-wrap gap-2">
                {PRIORITAS.map((p) => (
                  <ChipPrioritas key={p} prioritas={p} />
                ))}
              </div>
            </div>
            <div>
              <SubJudul>SLA</SubJudul>
              <div className="flex flex-wrap gap-2">
                {SLA_CONTOH.map((s) => (
                  <ChipSla key={s.sla} sla={s.sla} keterangan={s.ket} />
                ))}
              </div>
            </div>
            <div>
              <SubJudul>Penanda</SubJudul>
              <div className="flex flex-wrap gap-2">
                <ChipBerulang />
                <ChipTindakan />
              </div>
            </div>
          </div>
        </Bagian>

        <Bagian
          id="pelat"
          judul="Pelat kategori"
          pengantar="Piktogram putih di atas persegi aspal, seperti rambu. Dipakai di form lapor, daftar laporan, dan di dalam titik peta."
        >
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {KATEGORI_LAPORAN.map((k) => (
              <li key={k.slug} className="flex items-center gap-3">
                <PelatKategori slug={k.slug} ukuran="besar" />
                <span className="font-semibold">{k.nama}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            <PelatKategori slug="jalan-rusak" ukuran="kecil" />
            <PelatKategori slug="jalan-rusak" ukuran="sedang" />
            <PelatKategori slug="jalan-rusak" ukuran="besar" />
            <span className="text-kecil text-aspal-2">24 / 32 / 48 px</span>
          </div>
        </Bagian>

        <Bagian
          id="kartu"
          judul="Kartu"
          pengantar="Kartu hanya untuk objek yang bisa diklik. Saat disorot, border berubah gelap; kartu tidak membesar atau terangkat."
        >
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <li>
              <Kartu href="#kartu" className="flex items-start gap-3">
                <PelatKategori slug="jalan-rusak" />
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="font-kode text-kecil text-aspal-2">OP-2026-00182</span>
                  <span className="font-semibold">Jalan berlubang dalam di depan sekolah</span>
                  <span className="text-kecil text-aspal-2">Medan Denai, Kelurahan Denai</span>
                  <span className="flex flex-wrap gap-2">
                    <ChipStatus status="IN_PROGRESS" />
                    <ChipPrioritas prioritas="HIGH" />
                  </span>
                </span>
              </Kartu>
            </li>
            <li>
              <Kartu href="#kartu" className="flex flex-col gap-2">
                <span className="font-semibold">Pembuatan KTP-el</span>
                <span className="text-kecil text-aspal-2">Disdukcapil, gratis, selesai 1 hari kerja</span>
                <span className="text-kecil">5 persyaratan</span>
              </Kartu>
            </li>
          </ul>
        </Bagian>

        <Bagian
          id="tabel"
          judul="Tabel"
          pengantar="Angka rata kanan dengan angka tabular. Di HP, tabel diganti daftar ringkas berisi tiga info dan status."
        >
          <div className="hidden md:block">
            <Tabel label="Contoh rapor instansi">
              <TabelKepala>
                <tr>
                  <TabelJudulSel menempel>Instansi</TabelJudulSel>
                  <TabelJudulSel angka>Laporan</TabelJudulSel>
                  <TabelJudulSel angka>Selesai</TabelJudulSel>
                  <TabelJudulSel angka>Tepat waktu</TabelJudulSel>
                  <TabelJudulSel angka>Berulang</TabelJudulSel>
                </tr>
              </TabelKepala>
              <tbody>
                <TabelBaris>
                  <TabelSel menempel>Dinas SDABMBK</TabelSel>
                  <TabelSel angka>{formatAngka(1284)}</TabelSel>
                  <TabelSel angka>{formatPersen(0.812)}</TabelSel>
                  <TabelSel angka>{formatPersen(0.745)}</TabelSel>
                  <TabelSel angka>{formatAngka(17)}</TabelSel>
                </TabelBaris>
                <TabelBaris>
                  <TabelSel menempel>Dinas Lingkungan Hidup</TabelSel>
                  <TabelSel angka>{formatAngka(906)}</TabelSel>
                  <TabelSel angka>{formatPersen(0.874)}</TabelSel>
                  <TabelSel angka>{formatPersen(0.81)}</TabelSel>
                  <TabelSel angka>{formatAngka(9)}</TabelSel>
                </TabelBaris>
              </tbody>
            </Tabel>
            <p className="mt-2 text-kecil text-aspal-2">Data simulasi prototipe.</p>
          </div>
          <div className="md:hidden">
            <DaftarRingkas label="Contoh daftar laporan">
              <ButirRingkas
                href="#tabel"
                depan={<PelatKategori slug="jalan-rusak" />}
                judul="Jalan berlubang dalam di depan sekolah"
                info={["OP-2026-00182", "Medan Denai", "14 Okt"]}
                status={<ChipStatus status="IN_PROGRESS" />}
              />
              <ButirRingkas
                href="#tabel"
                depan={<PelatKategori slug="sampah" />}
                judul="Tumpukan sampah di pinggir parit"
                info={["OP-2026-00179", "Medan Area", "13 Okt"]}
                status={<ChipStatus status="RESOLVED" />}
              />
            </DaftarRingkas>
          </div>
        </Bagian>

        <Bagian
          id="keadaan"
          judul="Kosong, gagal, memuat"
          pengantar="Setiap daftar punya tiga keadaan ini. Kalimatnya spesifik dan selalu ada satu aksi."
        >
          <div className="flex flex-col gap-6">
            <LayarKosong
              pesan="Belum ada laporan di Medan Tuntungan dalam 7 hari terakhir."
              aksi={<TombolTautan href="#keadaan" varian="kedua">Lihat 30 hari terakhir</TombolTautan>}
            />
            <PesanGagal
              judul="Daftar laporan belum termuat"
              pesan="Koneksi ke server terputus. Coba lagi dalam beberapa detik."
              aksi={<Tombol varian="kedua">Coba lagi</Tombol>}
            />
            <KerangkaDaftar baris={3} />
          </div>
        </Bagian>

        <Bagian
          id="umpan-balik"
          judul="Toast, dialog, cap"
          pengantar="Setiap aksi memberi umpan balik. Aksi berisiko meminta konfirmasi. Cap SELESAI muncul sekali saat admin menyetujui bukti, lalu menetap."
        >
          <DemoInteraktif />
        </Bagian>

        <Bagian
          id="resi"
          judul="Resi dan log lacak"
          pengantar="Setelah melapor, warga menerima resi seperti resi kurir. Halaman lacak memakai log yang sama dengan cek resi: tanggal dan jam di kiri, kejadian di kanan, terbaru di atas."
        >
          <div className="flex flex-col gap-12">
            <Resi
              kode="OP-2026-00182"
              urlLacak="https://oneportal.example/lacak/OP-2026-00182"
              dibuatPada="2026-10-14T02:10:00Z"
              rincian={[
                { label: "Kategori", nilai: "Jalan rusak" },
                { label: "Lokasi", nilai: "Medan Denai, Kelurahan Denai" },
              ]}
              selesaiPada="2026-10-14T09:25:00Z"
            />
            <div>
              <SubJudul>Log lacak</SubJudul>
              <LogResi kejadian={LOG_CONTOH} />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Logo ukuran="besar" />
              <Logo />
              <Logo ukuran="kecil" />
            </div>
            <CapSelesai tanggal="2026-10-14T09:25:00Z" ukuran="kecil" />
          </div>
        </Bagian>

        <Bagian
          id="peta"
          judul="Peta"
          pengantar="Peta gratis (MapLibre + OpenFreeMap) yang diwarnai ulang ke palet natural. Warna pin = kelompok status, ikon = kategori, jumlah di lingkaran hijau = laporan berdekatan. Titik di bawah ini hanya contoh."
        >
          <PetaLaporan titik={TITIK_CONTOH} className="h-96 rounded-lg border border-garis" zoomAwal={12.5} pusat={{ lat: 3.598, lng: 98.675 }} label="Contoh peta laporan" />
        </Bagian>
      </div>
    </div>
  );
}
