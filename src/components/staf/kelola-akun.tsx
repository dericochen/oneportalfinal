"use client";

import { Key, PencilSimple, UserPlus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buatAkun, gantiSandi, ubahAkun } from "@/aksi/akun";
import { IsianAlamat } from "@/components/akun/isian-alamat";
import { KotakCentang, Masukan, Pilihan } from "@/components/ui/isian";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { ALAMAT_KOSONG, formatAlamat, type NilaiAlamat, type OpsiKecamatan, ringkasWilayah } from "@/lib/domain/alamat";
import { LABEL_PERAN, type Peran } from "@/lib/domain/laporan";
import { formatTanggal } from "@/lib/format";

export type BarisAkun = {
  id: string;
  email: string;
  nama: string;
  hp: string;
  peran: Peran;
  instansiId: string | null;
  instansi: string | null;
  aktif: boolean;
  demo: boolean;
  tugasAktif: number;
  dibuat: string;
  terakhirMasuk: string | null;
  /** Alamat domisili saat ini; null untuk akun lama yang belum mengisinya. */
  alamat: NilaiAlamat | null;
};
type Instansi = { id: string; nama: string };

const URUTAN_PERAN: Peran[] = ["ADMIN", "OFFICER", "SUPERVISOR", "CITIZEN"];
const KETERANGAN_PERAN: Record<Peran, string> = {
  ADMIN: "Verifikasi, tugaskan, setujui bukti, kelola konten",
  OFFICER: "Mengerjakan tugas dari instansinya",
  SUPERVISOR: "Memantau semua laporan dan mengelola akun",
  CITIZEN: "Membuat dan melacak laporan",
};

/** Sandi acak yang mudah dibacakan: tanpa huruf/angka yang mirip (0/O, 1/l/I). */
function sandiAcak() {
  const h = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = "23456789";
  const ambil = (s: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => s[x % s.length]).join("");
  return `${ambil(h, 6)}${ambil(a, 3)}${ambil(h, 3)}`;
}

function PilihPeran({ nilai, ubah, instansi, nilaiInstansi, ubahInstansi, id }: {
  nilai: Peran;
  ubah: (p: Peran) => void;
  instansi: Instansi[];
  nilaiInstansi: string;
  ubahInstansi: (v: string) => void;
  id: string;
}) {
  return (
    <>
      <fieldset>
        <legend className="mb-2 font-semibold">Peran</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {URUTAN_PERAN.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-garis p-3 transition-colors duration-200 has-[:checked]:border-hutan has-[:checked]:bg-lumut-2"
            >
              <input type="radio" name={`peran-${id}`} checked={nilai === p} onChange={() => ubah(p)} className="radio-rambu mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block font-semibold">{LABEL_PERAN[p]}</span>
                <span className="block text-kecil-staf text-aspal-2">{KETERANGAN_PERAN[p]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {nilai === "OFFICER" && (
        <Pilihan name={`instansi-${id}`} label="Instansi petugas" value={nilaiInstansi} onChange={(e) => ubahInstansi(e.target.value)} wajib>
          <option value="">Pilih instansi</option>
          {instansi.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </Pilihan>
      )}
    </>
  );
}

function FormBaru({ instansi, wilayah, selesai }: { instansi: Instansi[]; wilayah: OpsiKecamatan[] | null; selesai: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState<NilaiAlamat>(ALAMAT_KOSONG);
  const [peran, setPeran] = useState<Peran>("ADMIN");
  const [ins, setIns] = useState("");
  const [sandi, setSandi] = useState(sandiAcak);
  const [memuat, setMemuat] = useState(false);
  const [dibuat, setDibuat] = useState<{ email: string; sandi: string } | null>(null);

  if (dibuat) {
    return (
      <div className="animate-geser-masuk flex flex-col gap-3 rounded-lg border-2 border-hijau bg-putih p-4">
        <h2 className="text-h3 text-hijau">Akun dibuat</h2>
        <p>Berikan data masuk ini secara langsung kepada pemiliknya. Kata sandi tidak ditampilkan lagi setelah Anda menutup kotak ini.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-lumut-2 p-3">
          <dt className="text-aspal-2">Email</dt>
          <dd className="font-semibold break-all">{dibuat.email}</dd>
          <dt className="text-aspal-2">Kata sandi</dt>
          <dd className="font-kode font-bold">{dibuat.sandi}</dd>
        </dl>
        <p className="text-kecil-staf text-aspal-2">Pemilik akun masuk di halaman Masuk biasa; sistem langsung membuka halaman sesuai perannya.</p>
        <Tombol className="self-start" onClick={selesai}>
          Selesai
        </Tombol>
      </div>
    );
  }

  return (
    <form
      className="animate-geser-masuk flex flex-col gap-4 rounded-lg border-2 border-hutan bg-putih p-4 shadow-embun"
      onSubmit={async (e) => {
        e.preventDefault();
        setMemuat(true);
        const h = await buatAkun({ nama, email, hp, peran, instansi: ins, sandi, alamat: wilayah ? alamat : undefined });
        setMemuat(false);
        if (!h.ok) {
          toast.gagal("Akun belum dibuat", h.galat);
          return;
        }
        toast.sukses("Akun dibuat", email);
        setDibuat({ email, sandi });
        router.refresh();
      }}
    >
      <h2 className="text-h3">Buat akun baru</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan name="nama-baru" label="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} wajib />
        <Masukan name="email-baru" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" wajib />
      </div>
      <Masukan name="hp-baru" type="tel" label="Nomor HP" value={hp} onChange={(e) => setHp(e.target.value)} opsional />
      {wilayah && (
        <div className="rounded-md border border-garis p-4">
          <IsianAlamat
            awalan="baru-"
            wilayah={wilayah}
            ubah={setAlamat}
            keterangan="Wajib untuk setiap akun baru. Hanya terlihat oleh supervisor dan pemilik akun."
          />
        </div>
      )}
      <PilihPeran id="baru" nilai={peran} ubah={setPeran} instansi={instansi} nilaiInstansi={ins} ubahInstansi={setIns} />
      <div className="flex flex-wrap items-end gap-3">
        <Masukan
          name="sandi-baru"
          label="Kata sandi awal"
          petunjuk="Minimal 8 karakter, memuat huruf dan angka."
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          className="min-w-60 flex-1 font-kode"
          autoComplete="new-password"
        />
        <Tombol varian="kedua" onClick={() => setSandi(sandiAcak())}>
          Buat acak
        </Tombol>
      </div>
      <div className="flex gap-3">
        <Tombol type="submit" memuat={memuat} teksMemuat="Membuat akun…">
          Buat akun
        </Tombol>
        <Tombol varian="ketiga" onClick={selesai}>
          Batal
        </Tombol>
      </div>
    </form>
  );
}

function FormUbah({ a, instansi, wilayah, saya, selesai }: {
  a: BarisAkun;
  instansi: Instansi[];
  wilayah: OpsiKecamatan[] | null;
  saya: boolean;
  selesai: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nama, setNama] = useState(a.nama);
  const [hp, setHp] = useState(a.hp);
  const [alamat, setAlamat] = useState<NilaiAlamat>(a.alamat ?? ALAMAT_KOSONG);
  const [peran, setPeran] = useState<Peran>(a.peran);
  const [ins, setIns] = useState(a.instansiId ?? "");
  const [aktif, setAktif] = useState(a.aktif);
  const [sandi, setSandi] = useState("");
  const [memuat, setMemuat] = useState<string | null>(null);

  return (
    <div className="animate-geser-masuk flex flex-col gap-4 rounded-lg border-2 border-hutan bg-putih p-4 shadow-embun">
      <div>
        <h3 className="text-h3">Ubah akun</h3>
        <p className="text-kecil-staf break-all text-aspal-2">{a.email}</p>
      </div>
      {a.demo && <p className="rounded-md bg-kuning/30 p-3 text-kecil-staf">Akun demo untuk juri: peran, instansi, status aktif, dan kata sandinya dikunci.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan name={`nama-${a.id}`} label="Nama" value={nama} onChange={(e) => setNama(e.target.value)} />
        <Masukan name={`hp-${a.id}`} type="tel" label="Nomor HP" value={hp} onChange={(e) => setHp(e.target.value)} opsional />
      </div>
      {wilayah && (
        <div className="rounded-md border border-garis p-4">
          <IsianAlamat
            awalan={`${a.id}-`}
            wilayah={wilayah}
            awal={a.alamat ?? undefined}
            ubah={setAlamat}
            keterangan={
              a.alamat
                ? "Hanya terlihat oleh supervisor dan pemilik akun."
                : "Akun ini dibuat sebelum alamat diwajibkan. Boleh dikosongkan; bila diisi, semua kolom wajib lengkap."
            }
          />
        </div>
      )}
      {!a.demo && !saya && (
        <>
          <PilihPeran id={a.id} nilai={peran} ubah={setPeran} instansi={instansi} nilaiInstansi={ins} ubahInstansi={setIns} />
          <KotakCentang
            name={`aktif-${a.id}`}
            label="Akun aktif"
            keterangan="Akun nonaktif tidak bisa masuk. Petugas yang masih memegang tugas harus dialihkan dulu oleh admin."
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
          />
        </>
      )}
      <div className="flex gap-3">
        <Tombol
          memuat={memuat === "simpan"}
          teksMemuat="Menyimpan…"
          onClick={async () => {
            setMemuat("simpan");
            const h = await ubahAkun({ id: a.id, nama, hp, peran, instansi: ins, aktif, alamat: wilayah ? alamat : undefined });
            setMemuat(null);
            if (!h.ok) toast.gagal("Belum tersimpan", h.galat);
            else {
              toast.sukses("Akun diperbarui");
              router.refresh();
              selesai();
            }
          }}
        >
          Simpan
        </Tombol>
        <Tombol varian="ketiga" onClick={selesai}>
          Batal
        </Tombol>
      </div>
      {!a.demo && (
        <div className="flex flex-wrap items-end gap-3 border-t border-garis pt-4">
          <Masukan
            name={`sandi-${a.id}`}
            label="Kata sandi baru"
            petunjuk="Minimal 8 karakter, memuat huruf dan angka."
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            className="min-w-56 flex-1 font-kode"
            autoComplete="new-password"
          />
          <Tombol varian="ketiga" onClick={() => setSandi(sandiAcak())}>
            Acak
          </Tombol>
          <Tombol
            varian="kedua"
            ikon={<Key aria-hidden className="size-5" />}
            memuat={memuat === "sandi"}
            onClick={async () => {
              setMemuat("sandi");
              const h = await gantiSandi(a.id, sandi);
              setMemuat(null);
              if (!h.ok) toast.gagal("Kata sandi belum diganti", h.galat);
              else toast.sukses("Kata sandi diganti", `Sandi baru: ${sandi}`);
            }}
          >
            Ganti kata sandi
          </Tombol>
        </div>
      )}
    </div>
  );
}

export function KelolaAkun({ akun, instansi, wilayah, idSaya }: { akun: BarisAkun[]; instansi: Instansi[]; wilayah: OpsiKecamatan[] | null; idSaya: string }) {
  const [mode, setMode] = useState<string | null>(null);
  const [filter, setFilter] = useState<Peran | "SEMUA">("SEMUA");
  const [cari, setCari] = useState("");
  const tampil = useMemo(
    () =>
      akun.filter(
        (a) =>
          (filter === "SEMUA" || a.peran === filter) &&
          (!cari ||
            `${a.nama} ${a.email} ${a.alamat && wilayah ? formatAlamat(a.alamat, wilayah) : ""}`.toLowerCase().includes(cari.toLowerCase())),
      ),
    [akun, filter, cari, wilayah],
  );
  const jumlah = (p: Peran) => akun.filter((a) => a.peran === p).length;

  return (
    <div className="flex flex-col gap-6">
      {mode === "baru" ? (
        <FormBaru instansi={instansi} wilayah={wilayah} selesai={() => setMode(null)} />
      ) : (
        <Tombol className="self-start" ikon={<UserPlus aria-hidden className="size-5" />} onClick={() => setMode("baru")}>
          Buat akun baru
        </Tombol>
      )}

      {!wilayah && (
        <p className="rounded-md bg-kuning/30 p-3 text-kecil-staf">
          Fitur alamat domisili belum aktif di server ini (migrasi database alamat belum diterapkan). Akun tetap bisa dibuat dan dikelola, tetapi
          kolom alamat disembunyikan sampai migrasi dijalankan.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Saring menurut peran">
          {(["SEMUA", ...URUTAN_PERAN] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              aria-pressed={filter === p}
              className={cx(
                "inline-flex min-h-11 items-center gap-1 rounded-md px-3 font-semibold transition-colors duration-200",
                filter === p ? "bg-hutan text-putih" : "bg-putih text-aspal hover:bg-lumut",
              )}
            >
              {p === "SEMUA" ? "Semua" : LABEL_PERAN[p]}
              <span className="text-kecil-staf opacity-80">{p === "SEMUA" ? akun.length : jumlah(p)}</span>
            </button>
          ))}
        </div>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-kecil-staf font-semibold">
          Cari nama, email, atau alamat
          <input value={cari} onChange={(e) => setCari(e.target.value)} className="min-h-11 rounded-md border-2 border-garis-tegas bg-putih px-3" />
        </label>
      </div>

      <ul className="flex flex-col gap-3">
        {tampil.map((a) =>
          mode === a.id ? (
            <li key={a.id}>
              <FormUbah a={a} instansi={instansi} wilayah={wilayah} saya={a.id === idSaya} selesai={() => setMode(null)} key={a.id} />
            </li>
          ) : (
            <li
              key={a.id}
              className={cx(
                "animate-geser-masuk flex flex-wrap items-center gap-4 rounded-lg border border-garis bg-putih p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-embun",
                !a.aktif && "opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cx(
                  "flex size-11 shrink-0 items-center justify-center rounded-tl-daun rounded-br-daun rounded-tr-md rounded-bl-md font-bold text-putih",
                  a.peran === "ADMIN" ? "bg-hutan" : a.peran === "OFFICER" ? "bg-biru" : a.peran === "SUPERVISOR" ? "bg-tanah" : "bg-aspal-2",
                )}
              >
                {a.nama.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {a.nama}
                  {a.id === idSaya && <span className="ml-2 text-kecil-staf font-normal text-aspal-2">(Anda)</span>}
                  {a.demo && <span className="ml-2 rounded-sm bg-kuning px-1.5 text-kecil-staf">Demo</span>}
                  {!a.aktif && <span className="ml-2 rounded-sm bg-merah px-1.5 text-kecil-staf text-putih">Nonaktif</span>}
                </p>
                <p className="text-kecil-staf break-all text-aspal-2">{a.email}</p>
                <p className="text-kecil-staf">
                  {LABEL_PERAN[a.peran]}
                  {a.instansi && `, ${a.instansi}`}
                  {a.peran === "OFFICER" && `, ${a.tugasAktif} tugas aktif`}
                  <span className="text-aspal-2">
                    {", dibuat "}
                    {formatTanggal(a.dibuat)}
                    {a.terakhirMasuk ? `, terakhir masuk ${formatTanggal(a.terakhirMasuk)}` : ", belum pernah masuk"}
                  </span>
                </p>
                {wilayah && (
                  <p className="text-kecil-staf text-aspal-2" title={a.alamat ? formatAlamat(a.alamat, wilayah) : undefined}>
                    {a.alamat
                      ? `Domisili: RT ${a.alamat.rt}/RW ${a.alamat.rw}, ${ringkasWilayah(a.alamat, wilayah)}, ${a.alamat.kodePos}`
                      : "Alamat domisili belum diisi"}
                  </p>
                )}
              </div>
              <Tombol varian="kedua" ikon={<PencilSimple aria-hidden className="size-5" />} onClick={() => setMode(a.id)}>
                Ubah
              </Tombol>
            </li>
          ),
        )}
        {tampil.length === 0 && <li className="rounded-lg border border-dashed border-garis-tegas p-6">Tidak ada akun yang cocok.</li>}
      </ul>
    </div>
  );
}
