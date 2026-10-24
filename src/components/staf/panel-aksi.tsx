"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { jalankanTransisi } from "@/aksi/laporan";
import { AreaTeks, KotakCentang, Masukan, Pilihan, Radio } from "@/components/ui/isian";
import { useToast } from "@/components/ui/toast";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { ALASAN_PRIORITAS, LABEL_PRIORITAS, PRIORITAS, type Prioritas, type StatusLaporan } from "@/lib/domain/laporan";

/**
 * Panel aksi staf di detail laporan. Hanya menampilkan aksi yang sah untuk
 * status saat ini; database tetap menolak transisi yang tidak sah.
 */
export type OpsiAksi = {
  kategori: Array<{ id: string; nama: string; instansiBawaan: string | null }>;
  instansiInternal: Array<{ id: string; nama: string }>;
  instansiEksternal: Array<{ id: string; nama: string }>;
  petugas: Array<{ id: string; nama: string; instansi: string | null; tugasAktif: number }>;
};

export function useAksi(idLaporan: string) {
  const router = useRouter();
  const toast = useToast();
  const [memuat, setMemuat] = useState<string | null>(null);
  async function jalankan(aksi: string, payload: Record<string, unknown>, sukses: string) {
    setMemuat(aksi);
    const h = await jalankanTransisi(aksi, idLaporan, payload);
    setMemuat(null);
    if (!h.ok) {
      toast.gagal("Belum berhasil", h.galat);
      return false;
    }
    toast.sukses(sukses);
    router.refresh();
    return true;
  }
  return { jalankan, memuat };
}

function Kotak({ judul, children, bahaya }: { judul: string; children: ReactNode; bahaya?: boolean }) {
  return (
    <section className={cx("flex flex-col gap-4 rounded-md border-2 p-4", bahaya ? "border-garis" : "border-aspal")}>
      <h2 className="text-h3">{judul}</h2>
      {children}
    </section>
  );
}

function PilihPetugas({ opsi, instansi, nilai, ubah }: { opsi: OpsiAksi; instansi: string; nilai: string; ubah: (v: string) => void }) {
  const daftar = opsi.petugas.filter((p) => p.instansi === instansi);
  return (
    <Pilihan name="petugas" label="Petugas" value={nilai} onChange={(e) => ubah(e.target.value)} petunjuk={daftar.length ? "Angka = tugas aktif saat ini." : "Belum ada petugas aktif di instansi ini."}>
      <option value="">{daftar.length ? "Pilih petugas" : "Tidak ada petugas"}</option>
      {daftar.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nama} ({p.tugasAktif} tugas aktif)
        </option>
      ))}
    </Pilihan>
  );
}

function FormVerifikasi({ id, opsi, kategoriAwal }: { id: string; opsi: OpsiAksi; kategoriAwal: string }) {
  const { jalankan, memuat } = useAksi(id);
  const [kat, setKat] = useState(kategoriAwal);
  const bawaan = useMemo(() => opsi.kategori.find((k) => k.id === kat)?.instansiBawaan ?? "", [opsi, kat]);
  const [instansi, setInstansi] = useState(bawaan);
  const [prioritas, setPrioritas] = useState<Prioritas>("MEDIUM");
  const [alasan, setAlasan] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [petugas, setPetugas] = useState("");

  return (
    <Kotak judul="Verifikasi laporan">
      <Pilihan
        name="kategori"
        label="Kategori final"
        value={kat}
        onChange={(e) => {
          setKat(e.target.value);
          setInstansi(opsi.kategori.find((k) => k.id === e.target.value)?.instansiBawaan ?? "");
          setPetugas("");
        }}
      >
        {opsi.kategori.map((k) => (
          <option key={k.id} value={k.id}>
            {k.nama}
          </option>
        ))}
      </Pilihan>
      <fieldset>
        <legend className="mb-1 font-semibold">Prioritas</legend>
        <div className="grid grid-cols-2">
          {PRIORITAS.map((p) => (
            <Radio key={p} name="prioritas" value={p} label={LABEL_PRIORITAS[p]} checked={prioritas === p} onChange={() => setPrioritas(p)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 font-semibold">Alasan prioritas</legend>
        {ALASAN_PRIORITAS.map((a) => (
          <KotakCentang
            key={a}
            name="alasan"
            value={a}
            label={a}
            checked={alasan.includes(a)}
            onChange={(e) => setAlasan((l) => (e.target.checked ? [...l, a] : l.filter((x) => x !== a)))}
          />
        ))}
      </fieldset>
      <AreaTeks name="catatan_prioritas" label="Keterangan tambahan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} opsional />
      <Pilihan
        name="instansi"
        label="Instansi penanggung jawab"
        value={instansi}
        onChange={(e) => {
          setInstansi(e.target.value);
          setPetugas("");
        }}
        petunjuk="Terisi otomatis dari kategori. Tenggat dihitung dari matriks SLA."
      >
        <option value="">Pilih instansi</option>
        {opsi.instansiInternal.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nama}
          </option>
        ))}
      </Pilihan>
      {instansi && <PilihPetugas opsi={opsi} instansi={instansi} nilai={petugas} ubah={setPetugas} />}
      <Tombol
        memuat={memuat === "verify"}
        teksMemuat="Memverifikasi…"
        onClick={() =>
          jalankan(
            "verify",
            { category_id: kat, priority: prioritas, priority_reasons: alasan, priority_note: catatan, agency_id: instansi || null, assignee_id: petugas || null },
            petugas ? "Laporan diverifikasi dan ditugaskan" : "Laporan diverifikasi",
          )
        }
      >
        {petugas ? "Verifikasi dan tugaskan" : "Verifikasi"}
      </Tombol>
    </Kotak>
  );
}

function FormAlasan({
  id,
  aksi,
  judul,
  label,
  tombol,
  sukses,
  kunci = "reason",
  bahaya,
  tambahan,
  payloadTambahan,
}: {
  id: string;
  aksi: string;
  judul: string;
  label: string;
  tombol: string;
  sukses: string;
  kunci?: string;
  bahaya?: boolean;
  tambahan?: ReactNode;
  payloadTambahan?: Record<string, unknown>;
}) {
  const { jalankan, memuat } = useAksi(id);
  const [teks, setTeks] = useState("");
  return (
    <Kotak judul={judul} bahaya>
      {tambahan}
      <AreaTeks name={`${aksi}-${kunci}`} label={label} rows={3} value={teks} onChange={(e) => setTeks(e.target.value)} />
      <Tombol
        varian={bahaya ? "bahaya" : "kedua"}
        memuat={memuat === aksi}
        teksMemuat="Memproses…"
        onClick={async () => {
          if (await jalankan(aksi, { [kunci]: teks, ...payloadTambahan }, sukses)) setTeks("");
        }}
      >
        {tombol}
      </Tombol>
    </Kotak>
  );
}

function FormTeruskan({ id, opsi, saran }: { id: string; opsi: OpsiAksi; saran: string | null }) {
  const [tujuan, setTujuan] = useState(saran ?? "");
  return (
    <FormAlasan
      id={id}
      aksi="forward"
      judul="Teruskan ke instansi lain"
      label="Catatan untuk pelapor"
      tombol="Teruskan laporan"
      sukses="Laporan diteruskan"
      kunci="note"
      payloadTambahan={{ agency_id: tujuan }}
      tambahan={
        <Pilihan name="tujuan" label="Instansi tujuan (di luar Pemko)" value={tujuan} onChange={(e) => setTujuan(e.target.value)}>
          <option value="">Pilih instansi</option>
          {opsi.instansiEksternal.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </Pilihan>
      }
    />
  );
}

function FormGabung({ id }: { id: string }) {
  const { jalankan, memuat } = useAksi(id);
  const [kode, setKode] = useState("");
  return (
    <Kotak judul="Gabungkan dengan laporan lain" bahaya>
      <Masukan name="kode_induk" label="Kode laporan induk" petunjuk="Laporan induk yang masih ditangani, contoh OP-2026-00120" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} className="font-kode" />
      <Tombol varian="kedua" memuat={memuat === "merge"} onClick={() => jalankan("merge", { parent_code: kode }, "Laporan digabungkan")}>
        Gabungkan
      </Tombol>
    </Kotak>
  );
}

function FormTugaskan({ id, opsi, instansiAwal, alihkan }: { id: string; opsi: OpsiAksi; instansiAwal: string; alihkan?: boolean }) {
  const { jalankan, memuat } = useAksi(id);
  const [instansi, setInstansi] = useState(instansiAwal);
  const [petugas, setPetugas] = useState("");
  const [alasan, setAlasan] = useState("");
  const aksi = alihkan ? "reassign" : "assign";
  return (
    <Kotak judul={alihkan ? "Alihkan ke petugas lain" : "Tugaskan petugas"} bahaya={alihkan}>
      <Pilihan name="instansi_tugas" label="Instansi" value={instansi} onChange={(e) => { setInstansi(e.target.value); setPetugas(""); }}>
        {opsi.instansiInternal.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nama}
          </option>
        ))}
      </Pilihan>
      <PilihPetugas opsi={opsi} instansi={instansi} nilai={petugas} ubah={setPetugas} />
      {alihkan && <AreaTeks name="alasan_alih" label="Alasan pengalihan" rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} />}
      <Tombol
        varian={alihkan ? "kedua" : "utama"}
        memuat={memuat === aksi}
        teksMemuat="Menugaskan…"
        onClick={() => jalankan(aksi, { assignee_id: petugas, agency_id: instansi, reason: alasan }, alihkan ? "Tugas dialihkan" : "Petugas ditugaskan")}
      >
        {alihkan ? "Alihkan tugas" : "Tugaskan"}
      </Tombol>
    </Kotak>
  );
}

function FormTinjauBukti({ id }: { id: string }) {
  const { jalankan, memuat } = useAksi(id);
  const [alasan, setAlasan] = useState("");
  const [kembali, setKembali] = useState(false);
  return (
    <Kotak judul="Tinjau bukti penyelesaian">
      <p>Periksa foto sebelum dan sesudah di sebelah kiri. Setelah disetujui, laporan selesai dan buktinya langsung tampil di peta publik.</p>
      {!kembali ? (
        <div className="flex flex-wrap gap-3">
          <Tombol memuat={memuat === "approve_proof"} teksMemuat="Menyetujui…" onClick={() => jalankan("approve_proof", {}, "Bukti disetujui, laporan selesai")}>
            Setujui, tandai selesai
          </Tombol>
          <Tombol varian="kedua" onClick={() => setKembali(true)}>
            Kembalikan ke petugas
          </Tombol>
        </div>
      ) : (
        <>
          <AreaTeks name="alasan_kembali" label="Apa yang perlu diperbaiki petugas?" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <Tombol varian="bahaya" memuat={memuat === "return_proof"} onClick={() => jalankan("return_proof", { reason: alasan }, "Bukti dikembalikan ke petugas")}>
              Kembalikan bukti
            </Tombol>
            <Tombol varian="ketiga" onClick={() => setKembali(false)}>
              Batal
            </Tombol>
          </div>
        </>
      )}
    </Kotak>
  );
}

function FormCatatan({ id, supervisor }: { id: string; supervisor?: boolean }) {
  return (
    <FormAlasan
      id={id}
      aksi="add_note"
      judul={supervisor ? "Instruksi supervisor" : "Catatan internal"}
      label={supervisor ? "Instruksi untuk petugas dan admin" : "Catatan (hanya terlihat staf)"}
      tombol="Simpan catatan"
      sukses="Catatan tersimpan"
      kunci="note"
    />
  );
}

function SembunyikanFoto({ id, tersembunyi }: { id: string; tersembunyi: boolean }) {
  const { jalankan, memuat } = useAksi(id);
  return (
    <Tombol
      varian="ketiga"
      memuat={memuat === "set_media_visibility"}
      onClick={() => jalankan("set_media_visibility", { all: true, hidden: !tersembunyi }, tersembunyi ? "Foto ditampilkan lagi untuk publik" : "Foto disembunyikan dari publik")}
    >
      {tersembunyi ? "Tampilkan lagi foto untuk publik" : "Sembunyikan semua foto dari publik"}
    </Tombol>
  );
}

export function PanelAksiStaf({
  id,
  status,
  peran,
  opsi,
  kategoriId,
  instansiId,
  saranTeruskan,
  fotoTersembunyi,
}: {
  id: string;
  status: StatusLaporan;
  peran: "ADMIN" | "SUPERVISOR";
  opsi: OpsiAksi | null;
  kategoriId: string;
  instansiId: string | null;
  saranTeruskan: string | null;
  fotoTersembunyi: boolean;
}) {
  if (peran === "SUPERVISOR" || !opsi) return <FormCatatan id={id} supervisor={peran === "SUPERVISOR"} />;
  return (
    <div className="flex flex-col gap-4">
      {status === "SUBMITTED" && (
        <>
          <FormVerifikasi id={id} opsi={opsi} kategoriAwal={kategoriId} />
          <FormAlasan id={id} aksi="reject" judul="Tolak laporan" label="Alasan penolakan (dibaca pelapor)" tombol="Tolak laporan" sukses="Laporan ditolak" bahaya />
          <FormTeruskan id={id} opsi={opsi} saran={saranTeruskan} />
          <FormGabung id={id} />
        </>
      )}
      {status === "VERIFIED" && (
        <>
          <FormTugaskan id={id} opsi={opsi} instansiAwal={instansiId ?? opsi.instansiInternal[0]?.id ?? ""} />
          <FormGabung id={id} />
        </>
      )}
      {(status === "ASSIGNED" || status === "IN_PROGRESS") && (
        <FormTugaskan id={id} opsi={opsi} instansiAwal={instansiId ?? ""} alihkan />
      )}
      {status === "UNDER_REVIEW" && <FormTinjauBukti id={id} />}
      <FormCatatan id={id} />
      <SembunyikanFoto id={id} tersembunyi={fotoTersembunyi} />
    </div>
  );
}
