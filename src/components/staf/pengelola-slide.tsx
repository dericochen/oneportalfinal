"use client";

import { ArrowDown, ArrowUp, CalendarX, CheckCircle, Clock, EyeSlash, Eye, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState } from "react";
import { aturAktifSlide, geserSlide, hapusSlide, simpanSlide, type HasilSlide } from "@/aksi/slide";
import { Dialog, DialogKonfirmasi } from "@/components/ui/dialog";
import { AreaTeks, KotakCentang, Masukan, PesanError } from "@/components/ui/isian";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { DURASI_SLIDE_MS, type SlideAdmin, type StatusSlide } from "@/lib/domain/slide";
import { formatTanggal, formatTanggalIso } from "@/lib/format";
import { muatGambar, perkecil } from "@/lib/gambar";
import { buatKlienBrowser } from "@/lib/supabase/client";

/**
 * CMS slide beranda: daftar, urutan, aktif/nonaktif, jadwal, tambah, ubah,
 * hapus. Foto diunggah langsung dari browser ke bucket publik `konten`
 * (folder slide/), dikompres dan dibersihkan metadatanya lebih dulu.
 */

const STATUS: Record<StatusSlide, { label: string; ikon: typeof CheckCircle; warna: string }> = {
  tampil: { label: "Tampil di beranda", ikon: CheckCircle, warna: "text-hijau" },
  terjadwal: { label: "Terjadwal", ikon: Clock, warna: "text-aspal-2" },
  berakhir: { label: "Jadwal berakhir", ikon: CalendarX, warna: "text-merah" },
  nonaktif: { label: "Nonaktif", ikon: EyeSlash, warna: "text-aspal-2" },
};

function ChipSlide({ status }: { status: StatusSlide }) {
  const { label, ikon: Ikon, warna } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-abu px-2 py-0.5 text-kecil-staf font-semibold">
      <Ikon aria-hidden weight="fill" className={cx("size-4", warna)} />
      {label}
    </span>
  );
}

function jadwalTeks(s: SlideAdmin): string | null {
  if (s.mulai && s.selesai) return `Tampil ${formatTanggal(s.mulai)} sampai ${formatTanggal(s.selesai)}`;
  if (s.mulai) return `Tampil mulai ${formatTanggal(s.mulai)}`;
  if (s.selesai) return `Tampil sampai ${formatTanggal(s.selesai)}`;
  return null;
}

type Foto = { path: string; url: string; baru: boolean };

const MAKS_SISI = 1600;
const namaAcak = () => crypto.randomUUID().replace(/-/g, "");

function FormSlide({ awal, tutup, onSimpan }: { awal: SlideAdmin | null; tutup: () => void; onSimpan: () => void }) {
  const idFoto = useId();
  const input = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<Foto | null>(null);
  const toast = useToast();

  const [foto, setFotoState] = useState<Foto | null>(awal?.path && awal.gambar ? { path: awal.path, url: awal.gambar, baru: false } : null);
  const [mengunggah, setMengunggah] = useState(false);
  const [galatFoto, setGalatFoto] = useState<string | null>(null);
  const [judul, setJudul] = useState(awal?.judul ?? "");
  const [keterangan, setKeterangan] = useState(awal?.keterangan ?? "");
  const [tautan, setTautan] = useState(awal?.tautan ?? "");
  const [labelTautan, setLabelTautan] = useState(awal?.labelTautan ?? "");
  const [aktif, setAktif] = useState(awal?.aktif ?? true);
  const [mulai, setMulai] = useState(awal?.mulai ? formatTanggalIso(awal.mulai) : "");
  const [selesai, setSelesai] = useState(awal?.selesai ? formatTanggalIso(awal.selesai) : "");
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const setFoto = (f: Foto | null) => {
    fotoRef.current = f;
    setFotoState(f);
  };

  /** Buang foto yang diunggah di form ini tetapi tidak jadi dipakai. */
  async function buangBerkasBaru(f: Foto | null) {
    if (!f?.baru) return;
    try {
      await buatKlienBrowser().storage.from("konten").remove([f.path]);
    } catch {
      // Sisa berkas tidak memengaruhi beranda.
    }
  }

  async function pilihFoto(berkas: File | undefined) {
    if (!berkas) return;
    setGalatFoto(null);
    setMengunggah(true);
    try {
      if (!berkas.type.startsWith("image/")) throw new Error("bukan gambar");
      if (berkas.size > 25 * 1024 * 1024) throw new Error("terlalu besar");
      const gambar = await muatGambar(berkas);
      let hasil = await perkecil(gambar, MAKS_SISI, 0.82);
      if (hasil.blob.size > 1_100_000) hasil = await perkecil(gambar, MAKS_SISI, 0.68);
      const path = `slide/${namaAcak()}.jpg`;
      const supabase = buatKlienBrowser();
      const { error } = await supabase.storage.from("konten").upload(path, hasil.blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const url = supabase.storage.from("konten").getPublicUrl(path).data.publicUrl;
      await buangBerkasBaru(fotoRef.current);
      setFoto({ path, url, baru: true });
    } catch (e) {
      const m = (e as Error).message;
      setGalatFoto(
        m === "bukan gambar"
          ? `${berkas.name} bukan foto. Pilih berkas JPG, PNG, atau WEBP.`
          : m === "terlalu besar"
            ? `${berkas.name} lebih dari 25 MB.`
            : "Foto belum terunggah. Periksa koneksi dan pastikan Anda masuk sebagai admin, lalu coba lagi.",
      );
    } finally {
      setMengunggah(false);
      if (input.current) input.current.value = "";
    }
  }

  async function batal() {
    await buangBerkasBaru(fotoRef.current);
    fotoRef.current = null;
    tutup();
  }

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setGalat(null);
    if (!foto) {
      setGalat("Unggah foto slide terlebih dahulu.");
      return;
    }
    setMenyimpan(true);
    const h: HasilSlide = await simpanSlide({
      id: awal?.id,
      judul,
      keterangan,
      path: foto.path,
      tautan,
      labelTautan,
      aktif,
      mulai,
      selesai,
    });
    setMenyimpan(false);
    if (!h.ok) {
      setGalat(h.galat);
      return;
    }
    toast.sukses(awal ? "Slide diperbarui" : "Slide ditambahkan", aktif ? "Slide tampil di beranda sesuai jadwal." : "Slide belum tampil karena nonaktif.");
    onSimpan();
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">Foto slide</legend>
        <p className="text-kecil text-aspal-2">
          Foto asli tim, mendatar (rasio 4:3 paling pas). Wajah dan plat nomor diburamkan. Foto dikecilkan otomatis.
        </p>
        {foto && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-garis bg-abu">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau URL publik Storage */}
            <img src={foto.url} alt="Pratinjau foto slide" className="absolute inset-0 size-full object-cover" />
          </div>
        )}
        <label
          htmlFor={idFoto}
          className={cx(
            "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 self-start rounded-sm border-2 border-dashed px-4 font-semibold hover:bg-abu",
            galatFoto ? "border-merah" : "border-garis-tegas",
            mengunggah && "pointer-events-none opacity-60",
          )}
        >
          <UploadSimple aria-hidden className="size-5" />
          {mengunggah ? "Mengunggah foto…" : foto ? "Ganti foto" : "Pilih foto"}
        </label>
        <input
          ref={input}
          id={idFoto}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => pilihFoto(e.target.files?.[0])}
        />
        {galatFoto && <PesanError>{galatFoto}</PesanError>}
      </fieldset>

      <Masukan
        name="judul"
        label="Judul slide"
        petunjuk={`Singkat saja, tiap slide hanya tampil ${DURASI_SLIDE_MS / 1000} detik.`}
        value={judul}
        onChange={(e) => setJudul(e.target.value)}
        maxLength={120}
        wajib
      />
      <AreaTeks
        name="keterangan"
        label="Keterangan"
        rows={2}
        value={keterangan}
        onChange={(e) => setKeterangan(e.target.value)}
        penghitung={{ panjang: keterangan.length, maks: 200 }}
        maxLength={200}
        opsional
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan
          name="tautan"
          label="Tautan"
          petunjuk="Contoh: /lapor atau https://…"
          value={tautan}
          onChange={(e) => setTautan(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          opsional
        />
        <Masukan
          name="label_tautan"
          label="Label tautan"
          petunjuk="Contoh: Buat laporan"
          value={labelTautan}
          onChange={(e) => setLabelTautan(e.target.value)}
          maxLength={40}
          opsional
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan name="mulai" type="date" label="Tampil mulai" petunjuk="Kosong = langsung." value={mulai} onChange={(e) => setMulai(e.target.value)} opsional />
        <Masukan name="selesai" type="date" label="Tampil sampai" petunjuk="Kosong = tanpa batas." value={selesai} onChange={(e) => setSelesai(e.target.value)} opsional />
      </div>
      <KotakCentang
        name="aktif"
        label="Tampilkan di beranda"
        keterangan="Matikan untuk menyimpan sebagai draf."
        checked={aktif}
        onChange={(e) => setAktif(e.target.checked)}
      />

      {galat && (
        <div role="alert">
          <PesanError>{galat}</PesanError>
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Tombol varian="kedua" onClick={batal} disabled={menyimpan}>
          Batal
        </Tombol>
        <Tombol type="submit" memuat={menyimpan} teksMemuat="Menyimpan…" disabled={mengunggah}>
          {awal ? "Simpan perubahan" : "Tambah slide"}
        </Tombol>
      </div>
    </form>
  );
}

export function PengelolaSlide({ slide }: { slide: SlideAdmin[] }) {
  const router = useRouter();
  const toast = useToast();
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [form, setForm] = useState<{ awal: SlideAdmin | null } | null>(null);

  async function jalankan(kunci: string, aksi: () => Promise<HasilSlide>, sukses?: string): Promise<boolean> {
    setSibuk(kunci);
    const h = await aksi();
    setSibuk(null);
    if (!h.ok) {
      toast.gagal("Belum berhasil", h.galat);
      return false;
    }
    if (sukses) toast.sukses(sukses);
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Tombol onClick={() => setForm({ awal: null })} ikon={<Plus aria-hidden weight="bold" className="size-5" />}>
          Tambah slide
        </Tombol>
      </div>

      {slide.length === 0 ? (
        <p className="rounded-md border border-dashed border-garis-tegas p-6">
          Belum ada slide. Tambahkan foto pertama; sampai itu beranda memakai tiga slide teks bawaan.
        </p>
      ) : (
        <ol aria-label="Daftar slide" className="divide-y divide-garis rounded-md border border-garis">
          {slide.map((s, i) => {
            const jadwal = jadwalTeks(s);
            return (
              <li key={s.id} className="flex flex-col gap-4 p-4 sm:flex-row">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-sm border border-garis bg-abu sm:w-44">
                  {s.gambar && <Image src={s.gambar} alt={`Foto slide: ${s.judul}`} fill sizes="176px" className="object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-semibold break-words">
                      <span className="text-aspal-2 tabular-nums">{i + 1}. </span>
                      {s.judul}
                    </p>
                    <ChipSlide status={s.status} />
                  </div>
                  {s.keterangan && <p className="text-kecil-staf text-aspal-2">{s.keterangan}</p>}
                  {jadwal && <p className="text-kecil-staf text-aspal-2">{jadwal}</p>}
                  {s.tautan && (
                    <p className="text-kecil-staf break-all text-aspal-2">
                      Tautan: {s.labelTautan} ({s.tautan})
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Tombol
                      varian="kedua"
                      aria-label={`Naikkan urutan ${s.judul}`}
                      disabled={i === 0 || sibuk !== null}
                      memuat={sibuk === `naik-${s.id}`}
                      onClick={() => jalankan(`naik-${s.id}`, () => geserSlide(s.id, "naik"))}
                      ikon={<ArrowUp aria-hidden className="size-5" />}
                    >
                      Naik
                    </Tombol>
                    <Tombol
                      varian="kedua"
                      aria-label={`Turunkan urutan ${s.judul}`}
                      disabled={i === slide.length - 1 || sibuk !== null}
                      memuat={sibuk === `turun-${s.id}`}
                      onClick={() => jalankan(`turun-${s.id}`, () => geserSlide(s.id, "turun"))}
                      ikon={<ArrowDown aria-hidden className="size-5" />}
                    >
                      Turun
                    </Tombol>
                    <Tombol
                      varian="kedua"
                      aria-label={`Ubah ${s.judul}`}
                      disabled={sibuk !== null}
                      onClick={() => setForm({ awal: s })}
                      ikon={<PencilSimple aria-hidden className="size-5" />}
                    >
                      Ubah
                    </Tombol>
                    <Tombol
                      varian="kedua"
                      aria-label={`${s.aktif ? "Nonaktifkan" : "Aktifkan"} ${s.judul}`}
                      disabled={sibuk !== null}
                      memuat={sibuk === `aktif-${s.id}`}
                      onClick={() =>
                        jalankan(`aktif-${s.id}`, () => aturAktifSlide(s.id, !s.aktif), s.aktif ? "Slide dinonaktifkan" : "Slide diaktifkan")
                      }
                      ikon={s.aktif ? <EyeSlash aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
                    >
                      {s.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </Tombol>
                    <DialogKonfirmasi
                      pemicu={
                        <Tombol varian="kedua" aria-label={`Hapus ${s.judul}`} disabled={sibuk !== null} ikon={<Trash aria-hidden className="size-5" />}>
                          Hapus
                        </Tombol>
                      }
                      judul="Hapus slide ini?"
                      pesan={`"${s.judul}" tidak lagi tampil di beranda dan fotonya dihapus dari penyimpanan. Tindakan ini tidak bisa dibatalkan.`}
                      labelKonfirmasi="Hapus slide"
                      teksMemuat="Menghapus…"
                      onKonfirmasi={() => jalankan(`hapus-${s.id}`, () => hapusSlide(s.id), "Slide dihapus")}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog
        buka={form !== null}
        ubahBuka={(b) => {
          // Penutupan lewat Esc atau area luar tidak membersihkan foto yang belum disimpan:
          // hanya tombol Batal yang melakukannya. Sisa berkas kecil dan tidak tampil di mana pun.
          if (!b) setForm(null);
        }}
        judul={form?.awal ? "Ubah slide" : "Tambah slide"}
        deskripsi="Slide tampil di beranda sesuai urutan di daftar."
      >
        {form && (
          <FormSlide
            key={form.awal?.id ?? "baru"}
            awal={form.awal}
            tutup={() => setForm(null)}
            onSimpan={() => {
              setForm(null);
              router.refresh();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
