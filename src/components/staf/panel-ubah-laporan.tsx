"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { jalankanTransisi } from "@/aksi/laporan";
import { AreaTeks, KotakCentang, Masukan, Pilihan } from "@/components/ui/isian";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { ALASAN_PRIORITAS, LABEL_PRIORITAS, PRIORITAS, type Prioritas, type StatusLaporan } from "@/lib/domain/laporan";
import type { OpsiAksi } from "./panel-aksi";

/**
 * Admin mengubah data laporan kapan saja: tenggat (manual atau hitung ulang
 * dari SLA), prioritas, kategori, instansi, judul, deskripsi, alamat, dan
 * status rahasia. Juga membuka kembali, menghapus, dan memulihkan laporan.
 * Semua lewat fungsi transisi (tercatat di riwayat).
 */
export type DataUbah = {
  id: string;
  status: StatusLaporan;
  judul: string;
  deskripsi: string;
  alamat: string;
  kategoriId: string;
  instansiId: string | null;
  prioritas: Prioritas | null;
  alasan: string[];
  catatanPrioritas: string | null;
  tenggat: string | null;
  rahasia: boolean;
  terhapus: boolean;
};

/** ISO → nilai input datetime-local dalam WIB. */
function keLokalWib(iso: string | null) {
  if (!iso) return "";
  return new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 16);
}
/** Nilai datetime-local (WIB) → ISO. */
const dariLokalWib = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : "");

const FINAL: StatusLaporan[] = ["RESOLVED", "REJECTED", "FORWARDED", "MERGED"];

export function PanelUbahLaporan({ d, opsi }: { d: DataUbah; opsi: OpsiAksi }) {
  const router = useRouter();
  const toast = useToast();
  const [buka, setBuka] = useState(false);
  const [memuat, setMemuat] = useState<string | null>(null);
  const [judul, setJudul] = useState(d.judul);
  const [deskripsi, setDeskripsi] = useState(d.deskripsi);
  const [alamat, setAlamat] = useState(d.alamat);
  const [kat, setKat] = useState(d.kategoriId);
  const [instansi, setInstansi] = useState(d.instansiId ?? "");
  const [prioritas, setPrioritas] = useState<Prioritas | "">(d.prioritas ?? "");
  const [alasan, setAlasan] = useState<string[]>(d.alasan);
  const [catatanP, setCatatanP] = useState(d.catatanPrioritas ?? "");
  const [tenggat, setTenggat] = useState(keLokalWib(d.tenggat));
  const [rahasia, setRahasia] = useState(d.rahasia);
  const [catatan, setCatatan] = useState("");
  const [alasanAksi, setAlasanAksi] = useState("");

  async function jalankan(aksi: string, payload: Record<string, unknown>, sukses: string) {
    setMemuat(aksi);
    const h = await jalankanTransisi(aksi, d.id, payload);
    setMemuat(null);
    if (!h.ok) {
      toast.gagal("Belum tersimpan", h.galat);
      return false;
    }
    toast.sukses(sukses);
    setCatatan("");
    setAlasanAksi("");
    router.refresh();
    return true;
  }

  function simpan() {
    const p: Record<string, unknown> = {};
    if (judul !== d.judul) p.title = judul;
    if (deskripsi !== d.deskripsi) p.description = deskripsi;
    if (alamat !== d.alamat) p.address = alamat;
    if (kat !== d.kategoriId) p.category_id = kat;
    if (instansi && instansi !== (d.instansiId ?? "")) p.agency_id = instansi;
    if (prioritas && prioritas !== d.prioritas) p.priority = prioritas;
    if (JSON.stringify(alasan) !== JSON.stringify(d.alasan)) p.priority_reasons = alasan;
    if (catatanP !== (d.catatanPrioritas ?? "")) p.priority_note = catatanP;
    if (tenggat && tenggat !== keLokalWib(d.tenggat)) p.due_at = dariLokalWib(tenggat);
    if (rahasia !== d.rahasia) p.is_confidential = rahasia;
    if (Object.keys(p).length === 0) {
      toast.info("Tidak ada perubahan", "Ubah salah satu isian dulu.");
      return;
    }
    if (catatan) p.note = catatan;
    jalankan("update_details", p, "Perubahan tersimpan");
  }

  if (d.terhapus) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border-2 border-merah bg-putih p-4">
        <h2 className="text-h3">Laporan ini sudah dihapus</h2>
        <p className="text-aspal-2">Laporan disembunyikan dari semua daftar dan peta. Pulihkan untuk menampilkannya lagi.</p>
        <Tombol memuat={memuat === "restore"} onClick={() => jalankan("restore", {}, "Laporan dipulihkan")}>
          Pulihkan laporan
        </Tombol>
      </section>
    );
  }

  const final = FINAL.includes(d.status);

  return (
    <section className="flex flex-col gap-4 rounded-lg border-2 border-hutan bg-putih p-4 shadow-embun">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">Ubah data laporan</h2>
        <Tombol varian="kedua" onClick={() => setBuka((b) => !b)} aria-expanded={buka} ikon={<PencilSimple aria-hidden className="size-5" />}>
          {buka ? "Tutup" : "Ubah"}
        </Tombol>
      </div>
      {!buka && (
        <p className="text-kecil-staf text-aspal-2">
          Ubah tenggat, prioritas, kategori, instansi, isi laporan, atau status rahasia. Setiap perubahan tercatat di riwayat.
        </p>
      )}
      {buka && (
        <div className="animate-geser-masuk flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3 rounded-md bg-lumut-2 p-3">
            <legend className="px-1 font-semibold text-hutan">Tenggat pengerjaan</legend>
            <Masukan
              name="tenggat"
              type="datetime-local"
              label="Target selesai (WIB)"
              value={tenggat}
              onChange={(e) => setTenggat(e.target.value)}
              disabled={final}
              petunjuk={final ? "Laporan sudah final, tenggat tidak dapat diubah." : "Perubahan tenggat dikabarkan ke pelapor dan petugas."}
            />
            {!final && (
              <Tombol
                varian="ketiga"
                memuat={memuat === "recalc"}
                onClick={async () => {
                  setMemuat("recalc");
                  const h = await jalankanTransisi("update_details", d.id, { recalculate_due: true, note: catatan || undefined });
                  setMemuat(null);
                  if (!h.ok) toast.gagal("Belum tersimpan", h.galat);
                  else {
                    toast.sukses("Tenggat dihitung ulang dari matriks SLA");
                    router.refresh();
                  }
                }}
              >
                Hitung ulang dari matriks SLA
              </Tombol>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Pilihan name="ubah-prioritas" label="Prioritas" value={prioritas} onChange={(e) => setPrioritas(e.target.value as Prioritas)}>
              <option value="">Belum ditetapkan</option>
              {PRIORITAS.map((p) => (
                <option key={p} value={p}>
                  {LABEL_PRIORITAS[p]}
                </option>
              ))}
            </Pilihan>
            <Pilihan name="ubah-kategori" label="Kategori" value={kat} onChange={(e) => setKat(e.target.value)}>
              {opsi.kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Pilihan>
          </div>
          <fieldset>
            <legend className="mb-1 font-semibold">Alasan prioritas</legend>
            <div className="grid sm:grid-cols-2">
              {ALASAN_PRIORITAS.map((a) => (
                <KotakCentang
                  key={a}
                  name="ubah-alasan"
                  value={a}
                  label={a}
                  checked={alasan.includes(a)}
                  onChange={(e) => setAlasan((l) => (e.target.checked ? [...l, a] : l.filter((x) => x !== a)))}
                />
              ))}
            </div>
          </fieldset>
          <Masukan name="ubah-catatan-prioritas" label="Keterangan prioritas" value={catatanP} onChange={(e) => setCatatanP(e.target.value)} opsional />
          <Pilihan name="ubah-instansi" label="Instansi penanggung jawab" value={instansi} onChange={(e) => setInstansi(e.target.value)}>
            <option value="">Belum ditetapkan</option>
            {opsi.instansiInternal.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </Pilihan>
          <Masukan name="ubah-judul" label="Judul" value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={120} />
          <AreaTeks name="ubah-deskripsi" label="Deskripsi" rows={4} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} maxLength={2000} />
          <Masukan name="ubah-alamat" label="Alamat atau patokan" value={alamat} onChange={(e) => setAlamat(e.target.value)} maxLength={300} />
          <KotakCentang
            name="ubah-rahasia"
            label="Laporan rahasia"
            keterangan="Tidak tampil di peta dan daftar publik."
            checked={rahasia}
            onChange={(e) => setRahasia(e.target.checked)}
          />
          <AreaTeks name="ubah-catatan" label="Alasan perubahan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} opsional />
          <Tombol memuat={memuat === "update_details"} teksMemuat="Menyimpan…" onClick={simpan}>
            Simpan perubahan
          </Tombol>

          <div className="flex flex-col gap-3 border-t border-garis pt-4">
            <AreaTeks
              name="alasan-aksi"
              label={d.status === "REJECTED" || d.status === "FORWARDED" ? "Alasan membuka kembali atau menghapus" : "Alasan menghapus"}
              rows={2}
              value={alasanAksi}
              onChange={(e) => setAlasanAksi(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              {(d.status === "REJECTED" || d.status === "FORWARDED") && (
                <Tombol varian="kedua" memuat={memuat === "reopen"} onClick={() => jalankan("reopen", { reason: alasanAksi }, "Laporan dibuka kembali")}>
                  Buka kembali laporan
                </Tombol>
              )}
              <Tombol
                varian="bahaya"
                memuat={memuat === "delete"}
                onClick={() => {
                  if (window.confirm("Hapus laporan ini dari semua daftar dan peta? Anda bisa memulihkannya nanti.")) {
                    jalankan("delete", { reason: alasanAksi }, "Laporan dihapus");
                  }
                }}
              >
                Hapus laporan
              </Tombol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
