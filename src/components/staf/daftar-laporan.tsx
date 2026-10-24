import Link from "next/link";
import { ChipBerulang, ChipPrioritas, ChipSla, ChipStatus, ChipTindakan } from "@/components/ui/chip";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { ButirRingkas, DaftarRingkas, Tabel, TabelBaris, TabelJudulSel, TabelKepala, TabelSel } from "@/components/ui/tabel";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { ANTREAN, daftarLaporan, type KunciAntrean, PER_HALAMAN } from "@/lib/data/staf";
import { formatAngka, formatTanggal, formatWaktu } from "@/lib/format";
import { buatKlienServer } from "@/lib/supabase/server";

/** Tabel semua laporan dengan antrean, pencarian, filter, dan paginasi di server. */
export async function DaftarLaporanStaf({
  dasar,
  sp,
}: {
  dasar: "/admin" | "/supervisor";
  sp: Record<string, string | string[] | undefined>;
}) {
  const ambil = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const antrean = (ambil("antrean") ?? "semua") as KunciAntrean;
  const filter = {
    antrean: antrean in ANTREAN ? antrean : "semua",
    cari: ambil("cari"),
    kecamatan: ambil("kecamatan"),
    kategori: ambil("kategori"),
    halaman: Number(ambil("halaman")) || 1,
  };
  const supabase = await buatKlienServer();
  const [hasil, kec, kat] = await Promise.all([
    daftarLaporan(filter),
    supabase.from("districts").select("code, name").is("deleted_at", null).order("name"),
    supabase.from("report_categories").select("id, name").is("deleted_at", null).order("sort_order"),
  ]);

  const tautan = (ubah: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const gabung = { ...filter, ...ubah };
    for (const [k, v] of Object.entries(gabung)) if (v && !(k === "antrean" && v === "semua") && !(k === "halaman" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `${dasar}/laporan${s ? `?${s}` : ""}`;
  };
  const kelasPilihan = "min-h-11 rounded-sm border-2 border-garis-tegas bg-putih px-2";
  const halamanAkhir = hasil ? Math.max(1, Math.ceil(hasil.total / PER_HALAMAN)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Antrean laporan" className="-mx-1 overflow-x-auto">
        <ul className="flex gap-1 px-1">
          {(Object.keys(ANTREAN) as KunciAntrean[]).map((k) => (
            <li key={k}>
              <Link
                href={tautan({ antrean: k, halaman: 1 })}
                aria-current={filter.antrean === k ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center rounded-sm px-3 font-semibold whitespace-nowrap",
                  filter.antrean === k ? "bg-aspal text-putih" : "text-aspal hover:bg-abu",
                )}
              >
                {ANTREAN[k].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Cari dan filter laporan">
        {filter.antrean !== "semua" && <input type="hidden" name="antrean" value={filter.antrean} />}
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-kecil-staf font-semibold">
          Cari kode atau judul
          <input name="cari" defaultValue={filter.cari} placeholder="OP-2026-00182 atau jalan berlubang" className={cx(kelasPilihan, "w-full")} />
        </label>
        <label className="flex flex-col gap-1 text-kecil-staf font-semibold">
          Kecamatan
          <select name="kecamatan" defaultValue={filter.kecamatan ?? ""} className={kelasPilihan}>
            <option value="">Semua</option>
            {(kec.data ?? []).map((k) => (
              <option key={k.code} value={k.code}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-kecil-staf font-semibold">
          Kategori
          <select name="kategori" defaultValue={filter.kategori ?? ""} className={kelasPilihan}>
            <option value="">Semua</option>
            {(kat.data ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <Tombol type="submit" varian="kedua">
          Cari
        </Tombol>
      </form>

      {!hasil ? (
        <PesanGagal judul="Daftar laporan belum termuat" pesan="Koneksi ke server terputus. Muat ulang halaman ini." />
      ) : hasil.baris.length === 0 ? (
        <LayarKosong
          pesan={filter.cari ? `Tidak ada laporan yang cocok dengan "${filter.cari}".` : `Tidak ada laporan di antrean ${ANTREAN[filter.antrean as KunciAntrean].label.toLowerCase()}.`}
          aksi={
            <Link href={`${dasar}/laporan`} className="tautan">
              Tampilkan semua laporan
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-kecil-staf text-aspal-2" aria-live="polite">
            {formatAngka(hasil.total)} laporan. Halaman {hasil.halaman} dari {halamanAkhir}.
          </p>
          <div className="hidden md:block">
            <Tabel label="Daftar laporan">
              <TabelKepala>
                <tr>
                  <TabelJudulSel menempel>Laporan</TabelJudulSel>
                  <TabelJudulSel>Status</TabelJudulSel>
                  <TabelJudulSel>Kecamatan</TabelJudulSel>
                  <TabelJudulSel>Instansi</TabelJudulSel>
                  <TabelJudulSel>Masuk</TabelJudulSel>
                  <TabelJudulSel>Tenggat</TabelJudulSel>
                </tr>
              </TabelKepala>
              <tbody>
                {hasil.baris.map((b) => (
                  <TabelBaris key={b.id}>
                    <TabelSel menempel className="max-w-md">
                      <Link href={`${dasar}/laporan/${b.id}`} className="flex items-start gap-3 hover:underline">
                        <PelatKategori slug={b.kategoriSlug} ukuran="kecil" />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-kode text-kecil-staf text-aspal-2">{b.kode}</span>
                          <span className="font-semibold break-words">{b.judul}</span>
                        </span>
                      </Link>
                    </TabelSel>
                    <TabelSel>
                      <span className="flex flex-wrap gap-1">
                        <ChipStatus status={b.status} />
                        {b.prioritas && <ChipPrioritas prioritas={b.prioritas} />}
                        {b.berulang && <ChipBerulang />}
                        {b.perluTindakan && <ChipTindakan />}
                        {b.ditandai && <span className="text-kecil-staf font-semibold text-merah">Ditandai filter kata</span>}
                        {b.rahasia && <span className="text-kecil-staf text-aspal-2">Rahasia</span>}
                      </span>
                    </TabelSel>
                    <TabelSel>{b.kecamatan}</TabelSel>
                    <TabelSel>
                      {b.instansi ?? <span className="text-aspal-2">Belum</span>}
                      {b.petugas && <span className="block text-kecil-staf text-aspal-2">{b.petugas}</span>}
                    </TabelSel>
                    <TabelSel className="whitespace-nowrap">
                      {formatTanggal(b.masukPada)}
                      {b.kanal !== "WEB" && <span className="block text-kecil-staf text-aspal-2">via {b.kanal === "PHONE" ? "telepon" : b.kanal === "WALK_IN" ? "loket" : b.kanal === "SOCIAL" ? "medsos" : "QR"}</span>}
                    </TabelSel>
                    <TabelSel className="whitespace-nowrap">
                      {b.tenggat ? formatWaktu(b.tenggat) : "–"}
                      {b.sla && b.sla !== "TEPAT_WAKTU" && <ChipSla sla={b.sla} className="mt-1" />}
                    </TabelSel>
                  </TabelBaris>
                ))}
              </tbody>
            </Tabel>
          </div>
          <div className="md:hidden">
            <DaftarRingkas label="Daftar laporan">
              {hasil.baris.map((b) => (
                <ButirRingkas
                  key={b.id}
                  href={`${dasar}/laporan/${b.id}`}
                  depan={<PelatKategori slug={b.kategoriSlug} />}
                  judul={b.judul}
                  info={[<span key="k" className="font-kode">{b.kode}</span>, b.kecamatan, formatTanggal(b.masukPada)]}
                  status={
                    <span className="flex flex-wrap gap-1">
                      <ChipStatus status={b.status} />
                      {b.sla === "TERLAMBAT" && <ChipSla sla="TERLAMBAT" />}
                    </span>
                  }
                />
              ))}
            </DaftarRingkas>
          </div>
          {halamanAkhir > 1 && (
            <nav aria-label="Halaman" className="flex items-center gap-3">
              {hasil.halaman > 1 && (
                <Link href={tautan({ halaman: hasil.halaman - 1 })} className="tautan">
                  Halaman sebelumnya
                </Link>
              )}
              {hasil.halaman < halamanAkhir && (
                <Link href={tautan({ halaman: hasil.halaman + 1 })} className="tautan">
                  Halaman berikutnya
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
