import type { Metadata } from "next";
import { ChipPrioritas, ChipSla, ChipStatus, ChipTindakan } from "@/components/ui/chip";
import { Kartu } from "@/components/ui/kartu";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { wajibPeran } from "@/lib/auth";
import { ambilTugasPetugas } from "@/lib/data/tugas";
import { formatAngka, formatWaktu } from "@/lib/format";

export const metadata: Metadata = { title: "Tugas saya" };

export default async function BerandaPetugas() {
  const sesi = await wajibPeran(["OFFICER"], "/petugas");
  const hasil = await ambilTugasPetugas(sesi.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1">Tugas saya</h1>
        <p className="mt-1 text-aspal-2">
          {sesi.namaLengkap}, petugas {sesi.instansi?.nama ?? "lapangan"}
        </p>
      </header>

      {!hasil ? (
        <PesanGagal judul="Daftar tugas belum termuat" pesan="Koneksi ke server terputus. Muat ulang halaman ini." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-garis bg-garis">
            {[
              { label: "Aktif", nilai: hasil.ringkasan.aktif },
              { label: "Hampir jatuh tempo", nilai: hasil.ringkasan.hampirJatuhTempo },
              { label: "Terlambat", nilai: hasil.ringkasan.terlambat },
              { label: "Selesai bulan ini", nilai: hasil.ringkasan.selesaiBulanIni },
            ].map((a) => (
              <div key={a.label} className="flex flex-col gap-1 bg-putih p-4">
                <dt className="text-kecil-staf text-aspal-2">{a.label}</dt>
                <dd className="text-h2 font-bold tabular-nums">{formatAngka(a.nilai)}</dd>
              </div>
            ))}
          </dl>

          {hasil.tugas.length === 0 ? (
            <LayarKosong pesan="Belum ada tugas aktif untuk Anda. Tugas baru dari admin akan muncul di sini dan di notifikasi." />
          ) : (
            <ul aria-label="Daftar tugas" className="flex flex-col gap-3">
              {hasil.tugas.map((t) => (
                <li key={t.id}>
                  <Kartu href={`/petugas/tugas/${t.id}`} className="flex flex-col gap-3">
                    {t.perluTindakan && (
                      <span className="flex flex-col gap-1">
                        <ChipTindakan className="self-start" />
                        {t.alasanKembali && <span className="text-kecil-staf">Bukti dikembalikan: {t.alasanKembali}</span>}
                      </span>
                    )}
                    <span className="flex items-start gap-3">
                      <PelatKategori slug={t.kategoriSlug} />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-kode text-kecil-staf text-aspal-2">{t.kode}</span>
                        <span className="font-semibold break-words">{t.judul}</span>
                        <span className="text-kecil-staf break-words text-aspal-2">
                          {t.alamat}, {t.kelurahan}, {t.kecamatan}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <ChipStatus status={t.status} />
                      {t.prioritas && <ChipPrioritas prioritas={t.prioritas} />}
                      {t.sla && <ChipSla sla={t.sla} keterangan={t.tenggat ? `tenggat ${formatWaktu(t.tenggat)}` : undefined} />}
                    </span>
                  </Kartu>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
