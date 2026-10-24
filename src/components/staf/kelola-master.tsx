"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hapusInstansi, simpanInstansi, simpanPengaturan, simpanSla } from "@/aksi/master";
import { AreaTeks, KotakCentang, Masukan, Pilihan } from "@/components/ui/isian";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { LABEL_PRIORITAS, PRIORITAS, type Prioritas } from "@/lib/domain/laporan";
import { DAFTAR_PENGATURAN, type KunciPengaturan } from "@/lib/domain/pengaturan";

/* ---------------------------------------------------------------- pengaturan */

export function FormPengaturan({ awal }: { awal: Record<KunciPengaturan, string> }) {
  const router = useRouter();
  const toast = useToast();
  const [nilai, setNilai] = useState(awal);
  const [memuat, setMemuat] = useState(false);
  return (
    <form
      className="flex max-w-form flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setMemuat(true);
        const h = await simpanPengaturan(nilai);
        setMemuat(false);
        if (!h.ok) toast.gagal("Belum tersimpan", h.galat);
        else {
          toast.sukses("Pengaturan tersimpan", "Beranda dan footer sudah memakai teks baru.");
          router.refresh();
        }
      }}
    >
      {DAFTAR_PENGATURAN.map((d) =>
        d.panjang ? (
          <AreaTeks
            key={d.kunci}
            name={d.kunci}
            label={d.label}
            petunjuk={d.petunjuk}
            rows={3}
            maxLength={d.maks}
            value={nilai[d.kunci]}
            onChange={(e) => setNilai((n) => ({ ...n, [d.kunci]: e.target.value }))}
          />
        ) : (
          <Masukan
            key={d.kunci}
            name={d.kunci}
            label={d.label}
            petunjuk={d.petunjuk}
            maxLength={d.maks}
            value={nilai[d.kunci]}
            onChange={(e) => setNilai((n) => ({ ...n, [d.kunci]: e.target.value }))}
          />
        ),
      )}
      <Tombol type="submit" memuat={memuat} teksMemuat="Menyimpan…" className="self-start">
        Simpan pengaturan
      </Tombol>
    </form>
  );
}

/* ---------------------------------------------------------------- SLA */

type SelSla = { kategori: string; prioritas: Prioritas; jam: number };

/** Jam → teks ramah ("3 hari", "36 jam"). */
const ramah = (j: number) => (j >= 24 && j % 24 === 0 ? `${j / 24} hari` : `${j} jam`);

export function EditorSla({ kategori, awal }: { kategori: Array<{ id: string; nama: string }>; awal: SelSla[] }) {
  const router = useRouter();
  const toast = useToast();
  const [sel, setSel] = useState<Record<string, number>>(() => Object.fromEntries(awal.map((s) => [`${s.kategori}|${s.prioritas}`, s.jam])));
  const [memuat, setMemuat] = useState(false);
  const kunci = (k: string, p: Prioritas) => `${k}|${p}`;
  const bawaan: Record<Prioritas, number> = { EMERGENCY: 24, HIGH: 72, MEDIUM: 168, LOW: 336 };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-garis" role="region" aria-label="Matriks SLA" tabIndex={0}>
        <table className="w-full border-collapse text-left">
          <thead className="border-b-2 border-hutan bg-lumut-2">
            <tr>
              <th scope="col" className="sticky left-0 bg-lumut-2 px-3 py-3 font-semibold">
                Kategori
              </th>
              {PRIORITAS.map((p) => (
                <th key={p} scope="col" className="px-3 py-3 font-semibold whitespace-nowrap">
                  {LABEL_PRIORITAS[p]}
                  <span className="block text-kecil-staf font-normal text-aspal-2">jam</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kategori.map((k) => (
              <tr key={k.id} className="border-b border-garis last:border-b-0 hover:bg-lumut-2/50">
                <th scope="row" className="sticky left-0 bg-putih px-3 py-2 font-semibold">
                  {k.nama}
                </th>
                {PRIORITAS.map((p) => {
                  const v = sel[kunci(k.id, p)] ?? bawaan[p];
                  return (
                    <td key={p} className="px-2 py-2">
                      <label className="sr-only" htmlFor={`sla-${k.id}-${p}`}>
                        {k.nama}, prioritas {LABEL_PRIORITAS[p]}, dalam jam
                      </label>
                      <input
                        id={`sla-${k.id}-${p}`}
                        type="number"
                        min={1}
                        max={2160}
                        value={v}
                        onChange={(e) => setSel((s) => ({ ...s, [kunci(k.id, p)]: Number(e.target.value) }))}
                        className="min-h-11 w-24 rounded-md border-2 border-garis-tegas bg-putih px-2 tabular-nums"
                      />
                      <span className="mt-0.5 block text-kecil-staf text-aspal-2">{v > 0 ? ramah(v) : ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Tombol
        className="self-start"
        memuat={memuat}
        teksMemuat="Menyimpan…"
        onClick={async () => {
          setMemuat(true);
          const isi = kategori.flatMap((k) => PRIORITAS.map((p) => ({ kategori: k.id, prioritas: p, jam: sel[kunci(k.id, p)] ?? bawaan[p] })));
          const h = await simpanSla(isi);
          setMemuat(false);
          if (!h.ok) toast.gagal("Matriks belum tersimpan", h.galat);
          else {
            toast.sukses("Matriks SLA tersimpan", "Berlaku untuk laporan yang diverifikasi setelah ini.");
            router.refresh();
          }
        }}
      >
        Simpan matriks SLA
      </Tombol>
    </div>
  );
}

/* ---------------------------------------------------------------- instansi */

export type BarisInstansi = {
  id: string;
  nama: string;
  namaSingkat: string;
  jenis: "INTERNAL" | "EXTERNAL";
  keterangan: string;
  telepon: string;
  situs: string;
  aktif: boolean;
  terhapus: boolean;
  petugas: number;
};

const KOSONG: Omit<BarisInstansi, "id" | "terhapus" | "petugas"> = {
  nama: "",
  namaSingkat: "",
  jenis: "INTERNAL",
  keterangan: "",
  telepon: "",
  situs: "",
  aktif: true,
};

function FormInstansi({ awal, selesai }: { awal?: BarisInstansi; selesai: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState(awal ?? { ...KOSONG });
  const [memuat, setMemuat] = useState(false);
  const ubah = (k: keyof typeof KOSONG, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="animate-geser-masuk flex flex-col gap-4 rounded-lg border-2 border-hutan bg-putih p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setMemuat(true);
        const h = await simpanInstansi({ ...d, id: awal?.id });
        setMemuat(false);
        if (!h.ok) toast.gagal("Belum tersimpan", h.galat);
        else {
          toast.sukses(awal ? "Instansi diperbarui" : "Instansi ditambahkan");
          router.refresh();
          selesai();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan name="nama" label="Nama instansi" value={d.nama} onChange={(e) => ubah("nama", e.target.value)} wajib />
        <Masukan name="singkat" label="Nama singkat" value={d.namaSingkat} onChange={(e) => ubah("namaSingkat", e.target.value)} wajib />
      </div>
      <Pilihan name="jenis" label="Jenis" value={d.jenis} onChange={(e) => ubah("jenis", e.target.value)}>
        <option value="INTERNAL">Internal Pemko (menangani laporan)</option>
        <option value="EXTERNAL">Eksternal (tujuan laporan yang diteruskan)</option>
      </Pilihan>
      <AreaTeks name="ket" label="Tugas atau keterangan" rows={2} value={d.keterangan} onChange={(e) => ubah("keterangan", e.target.value)} opsional />
      <div className="grid gap-4 sm:grid-cols-2">
        <Masukan name="tel" label="Telepon" value={d.telepon} onChange={(e) => ubah("telepon", e.target.value)} opsional />
        <Masukan name="situs" label="Situs" placeholder="https://" value={d.situs} onChange={(e) => ubah("situs", e.target.value)} opsional />
      </div>
      <KotakCentang name="aktif" label="Aktif" keterangan="Instansi nonaktif tidak muncul di pilihan penugasan." checked={d.aktif} onChange={(e) => ubah("aktif", e.target.checked)} />
      <div className="flex gap-3">
        <Tombol type="submit" memuat={memuat} teksMemuat="Menyimpan…">
          {awal ? "Simpan perubahan" : "Tambah instansi"}
        </Tombol>
        <Tombol varian="ketiga" onClick={selesai}>
          Batal
        </Tombol>
      </div>
    </form>
  );
}

export function KelolaInstansi({ daftar }: { daftar: BarisInstansi[] }) {
  const router = useRouter();
  const toast = useToast();
  const [ubah, setUbah] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {ubah === "baru" ? (
        <FormInstansi selesai={() => setUbah(null)} />
      ) : (
        <Tombol className="self-start" onClick={() => setUbah("baru")}>
          Tambah instansi
        </Tombol>
      )}
      <ul className="flex flex-col gap-3">
        {daftar.map((a) =>
          ubah === a.id ? (
            <li key={a.id}>
              <FormInstansi awal={a} selesai={() => setUbah(null)} />
            </li>
          ) : (
            <li
              key={a.id}
              className={cx(
                "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-garis bg-putih p-4 transition-shadow duration-200 hover:shadow-embun",
                (a.terhapus || !a.aktif) && "opacity-70",
              )}
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {a.namaSingkat}
                  <span className="ml-2 rounded-sm bg-lumut px-1.5 text-kecil-staf font-normal">{a.jenis === "INTERNAL" ? "Internal" : "Eksternal"}</span>
                  {!a.aktif && <span className="ml-2 text-kecil-staf text-aspal-2">Nonaktif</span>}
                  {a.terhapus && <span className="ml-2 text-kecil-staf font-semibold text-merah">Terhapus</span>}
                </p>
                <p className="text-kecil-staf text-aspal-2">{a.nama}</p>
                {a.keterangan && <p className="text-kecil-staf">{a.keterangan}</p>}
                <p className="text-kecil-staf text-aspal-2">
                  {a.petugas} petugas{a.telepon ? `, ${a.telepon}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {!a.terhapus && (
                  <Tombol varian="kedua" onClick={() => setUbah(a.id)}>
                    Ubah
                  </Tombol>
                )}
                <Tombol
                  varian={a.terhapus ? "kedua" : "ketiga"}
                  onClick={async () => {
                    if (!a.terhapus && !window.confirm(`Hapus ${a.namaSingkat}? Anda bisa memulihkannya nanti.`)) return;
                    const h = await hapusInstansi(a.id, a.terhapus);
                    if (!h.ok) toast.gagal("Belum berhasil", h.galat);
                    else {
                      toast.sukses(a.terhapus ? "Instansi dipulihkan" : "Instansi dihapus");
                      router.refresh();
                    }
                  }}
                >
                  {a.terhapus ? "Pulihkan" : "Hapus"}
                </Tombol>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
