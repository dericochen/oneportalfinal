import Link from "next/link";
import { ChipPrioritas, ChipSla, ChipStatus } from "@/components/ui/chip";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { Tabel, TabelBaris, TabelJudulSel, TabelKepala, TabelSel } from "@/components/ui/tabel";
import { Tombol } from "@/components/ui/tombol";
import { PetaStaf } from "@/components/peta/peta-staf";
import { ambilDasbor, ambilDokumentasi, ambilPerluPerhatian, ambilTitikStaf, type Dasbor } from "@/lib/data/staf";
import { cx } from "@/lib/cx";
import { warna } from "@/lib/design/tokens";
import { KATEGORI_LAPORAN } from "@/lib/domain/kategori";
import { formatAngka, formatDurasi, formatTanggalPendek, formatWaktu } from "@/lib/format";
import { buatKlienServer } from "@/lib/supabase/server";

/**
 * Command center (admin & supervisor). Dibuka dengan kalimat ringkasan dari
 * data, lalu deretan angka dipisah garis tipis (bukan kartu KPI berikon),
 * peta + "Perlu perhatian", grafik dari SVG sederhana bertoken warna, rapor
 * instansi, dan dokumentasi perbaikan terbaru dengan foto.
 */
type Filter = { hari: number; kecamatan?: string; kategori?: string };

function Perbandingan({ kini, lalu, naikBaik = true }: { kini: number; lalu: number; naikBaik?: boolean }) {
  if (lalu === 0 && kini === 0) return <span className="text-kecil-staf text-aspal-2">sama dengan periode lalu</span>;
  const selisih = kini - lalu;
  const baik = selisih === 0 ? null : (selisih > 0) === naikBaik;
  return (
    <span className={cx("text-kecil-staf", baik === null ? "text-aspal-2" : baik ? "text-hijau" : "text-merah")}>
      {selisih === 0 ? "sama" : `${selisih > 0 ? "naik" : "turun"} ${formatAngka(Math.abs(selisih))}`} dari periode lalu
    </span>
  );
}

function GrafikTren({ data }: { data: Dasbor["tren"] }) {
  const lebar = 640;
  const tinggi = 180;
  const maks = Math.max(1, ...data.map((d) => Math.max(d.masuk, d.selesai)));
  const x = (i: number) => (data.length <= 1 ? 0 : (i / (data.length - 1)) * (lebar - 40)) + 30;
  const y = (v: number) => tinggi - 24 - (v / maks) * (tinggi - 40);
  const garis = (k: "masuk" | "selesai") => data.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
  const akhir = data[data.length - 1];
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="h-auto w-full" role="img" aria-label="Tren harian laporan masuk dan selesai">
        <line x1="30" x2={lebar - 10} y1={tinggi - 24} y2={tinggi - 24} stroke={warna.garis} />
        <text x="0" y={y(maks) + 4} fontSize="11" fill={warna.aspal2}>
          {maks}
        </text>
        <polyline points={garis("masuk")} fill="none" stroke={warna.aspal2} strokeWidth="2" />
        <polyline points={garis("selesai")} fill="none" stroke={warna.hijau} strokeWidth="2.5" />
        {akhir && (
          <>
            <text x={x(data.length - 1) - 4} y={y(akhir.masuk) - 6} fontSize="11" textAnchor="end" fill={warna.aspal2}>
              Masuk
            </text>
            <text x={x(data.length - 1) - 4} y={y(akhir.selesai) + 14} fontSize="11" textAnchor="end" fill={warna.hijau} fontWeight="700">
              Selesai
            </text>
          </>
        )}
        {data.length > 0 && (
          <>
            <text x="30" y={tinggi - 6} fontSize="11" fill={warna.aspal2}>
              {formatTanggalPendek(data[0].tanggal)}
            </text>
            <text x={lebar - 10} y={tinggi - 6} fontSize="11" textAnchor="end" fill={warna.aspal2}>
              {formatTanggalPendek(data[data.length - 1].tanggal)}
            </text>
          </>
        )}
      </svg>
    </figure>
  );
}

function BarKecamatan({ data }: { data: Dasbor["kecamatan"] }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  const t = 22;
  return (
    <svg viewBox={`0 0 520 ${data.length * t}`} className="h-auto w-full" role="img" aria-label="Jumlah laporan per kecamatan">
      {data.map((d, i) => {
        const w = (d.jumlah / maks) * 300;
        const ws = (d.selesai / maks) * 300;
        return (
          <g key={d.kode} transform={`translate(0 ${i * t})`}>
            <text x="150" y="15" fontSize="12" textAnchor="end" fill={warna.aspal}>
              {d.nama}
            </text>
            <rect x="160" y="4" width={Math.max(w, d.jumlah ? 2 : 0)} height="14" fill={warna.garis} />
            <rect x="160" y="4" width={ws} height="14" fill={warna.hijau} />
            <text x={166 + w} y="15" fontSize="12" fill={warna.aspal}>
              {d.jumlah}
              {d.terlambat > 0 ? ` (${d.terlambat} terlambat)` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export async function CommandCenter({ dasar, filter }: { dasar: "/admin" | "/supervisor"; filter: Filter }) {
  const supabase = await buatKlienServer();
  const [dasbor, titik, perhatian, dokumentasi, kec] = await Promise.all([
    ambilDasbor({ hari: filter.hari, kecamatan: filter.kecamatan, kategori: filter.kategori }),
    ambilTitikStaf(),
    ambilPerluPerhatian(),
    ambilDokumentasi(9),
    supabase.from("districts").select("code, name").is("deleted_at", null).order("name"),
  ]);
  const { data: kategori } = await supabase.from("report_categories").select("id, slug, name").is("deleted_at", null).order("sort_order");

  if (!dasbor) return <PesanGagal judul="Dashboard belum termuat" pesan="Data tidak dapat diambil dari server. Muat ulang halaman ini." />;
  const r = dasbor.ringkas;
  const kecTerlambat = [...dasbor.kecamatan].sort((a, b) => b.terlambat - a.terlambat)[0];
  const kalimat =
    r.masuk === 0 && r.selesai === 0
      ? `Belum ada laporan dalam ${dasbor.hari} hari terakhir.`
      : `${formatAngka(r.masuk)} laporan masuk dan ${formatAngka(r.selesai)} selesai dalam ${dasbor.hari} hari terakhir. ` +
        `${formatAngka(r.menunggu_verifikasi)} menunggu verifikasi, ${formatAngka(r.peninjauan_bukti)} buktinya perlu ditinjau` +
        (r.terlambat > 0
          ? `, dan ${formatAngka(r.terlambat)} melewati tenggat${kecTerlambat?.terlambat ? `, ${formatAngka(kecTerlambat.terlambat)} di antaranya di ${kecTerlambat.nama}` : ""}.`
          : ". Tidak ada laporan yang melewati tenggat.");

  const angka = [
    { label: "Laporan masuk", nilai: formatAngka(r.masuk), banding: <Perbandingan kini={r.masuk} lalu={r.masuk_lalu} naikBaik={false} /> },
    { label: "Selesai", nilai: formatAngka(r.selesai), banding: <Perbandingan kini={r.selesai} lalu={r.selesai_lalu} /> },
    { label: "Melewati tenggat", nilai: formatAngka(r.terlambat), merah: r.terlambat > 0 },
    { label: "Rata-rata waktu selesai", nilai: r.rata_jam === null ? "–" : formatDurasi(Number(r.rata_jam)) },
    { label: "Selesai tepat waktu", nilai: r.persen_tepat === null ? "–" : `${formatAngka(Number(r.persen_tepat))}%` },
  ];
  const kelasPilihan = "min-h-11 rounded-sm border-2 border-garis-tegas bg-putih px-2";

  return (
    <div className="flex flex-col gap-10">
      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filter dashboard">
        <label className="flex flex-col gap-1 text-kecil-staf font-semibold">
          Periode
          <select name="hari" defaultValue={String(filter.hari)} className={kelasPilihan}>
            <option value="7">7 hari</option>
            <option value="30">30 hari</option>
            <option value="90">90 hari</option>
            <option value="365">1 tahun</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-kecil-staf font-semibold">
          Kecamatan
          <select name="kecamatan" defaultValue={filter.kecamatan ?? ""} className={kelasPilihan}>
            <option value="">Semua kecamatan</option>
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
            <option value="">Semua kategori</option>
            {(kategori ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <Tombol type="submit" varian="kedua">
          Terapkan
        </Tombol>
      </form>

      <section aria-labelledby="judul-ringkasan" className="flex flex-col gap-4">
        <h2 id="judul-ringkasan" className="sr-only">
          Ringkasan
        </h2>
        <p className="max-w-baca text-h3 font-semibold">{kalimat}</p>
        <dl className="grid grid-cols-2 border-y border-garis sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-garis">
          {angka.map((a) => (
            <div key={a.label} className="flex flex-col gap-1 border-b border-garis px-4 py-4 lg:border-b-0">
              <dt className="text-kecil-staf text-aspal-2">{a.label}</dt>
              <dd className={cx("text-h2 font-bold tabular-nums", a.merah && "text-merah")}>{a.nilai}</dd>
              {a.banding && <dd>{a.banding}</dd>}
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-3">
          <Link href={`${dasar}/laporan?antrean=verifikasi`} className="tautan font-semibold">
            {formatAngka(r.menunggu_verifikasi)} menunggu verifikasi
          </Link>
          <Link href={`${dasar}/laporan?antrean=bukti`} className="tautan font-semibold">
            {formatAngka(r.peninjauan_bukti)} bukti perlu ditinjau
          </Link>
          <Link href={`${dasar}/laporan?antrean=dikerjakan`} className="tautan font-semibold">
            {formatAngka(r.diproses)} sedang diproses
          </Link>
        </div>
      </section>

      <section aria-labelledby="judul-peta" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-2">
          <h2 id="judul-peta" className="text-h3">
            Peta semua laporan
          </h2>
          <PetaStaf titik={titik} dasar={dasar} />
          <p className="text-kecil-staf text-aspal-2">Klik titik untuk membuka laporan. Perbesar peta untuk melihat foto bukti laporan selesai.</p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">Perlu perhatian</h2>
          {perhatian.length === 0 ? (
            <LayarKosong pesan="Tidak ada laporan aktif yang menunggu tindakan." />
          ) : (
            <ul className="divide-y divide-garis rounded-md border border-garis">
              {perhatian.map((p) => (
                <li key={p.id}>
                  <Link href={`${dasar}/laporan/${p.id}`} className="flex items-start gap-3 p-3 hover:bg-abu">
                    <PelatKategori slug={p.kategoriSlug} ukuran="kecil" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold break-words">{p.judul}</span>
                      <span className="text-kecil-staf text-aspal-2">
                        <span className="font-kode">{p.kode}</span>, {p.kecamatan}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        <ChipStatus status={p.status} />
                        {p.prioritas && <ChipPrioritas prioritas={p.prioritas} />}
                        {p.sla === "TERLAMBAT" && <ChipSla sla="TERLAMBAT" />}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="judul-dok" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="judul-dok" className="text-h3">
            Dokumentasi perbaikan terbaru
          </h2>
          <Link href={`${dasar}/laporan?antrean=bukti`} className="tautan">
            Lihat bukti yang perlu ditinjau
          </Link>
        </div>
        {dokumentasi.length === 0 ? (
          <LayarKosong pesan="Belum ada dokumentasi. Foto laporan, progres petugas, dan bukti selesai akan tampil di sini." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dokumentasi.map((d) => (
              <li key={d.id}>
                <Link href={`${dasar}/laporan/${d.laporanId}`} className="flex h-full flex-col gap-3 rounded-md border border-garis p-3 hover:border-aspal">
                  {d.foto.length > 0 && (
                    <span className="grid grid-cols-2 gap-1">
                      {d.foto.slice(0, 2).map((f, i) => (
                        <span key={i} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
                          <img src={f.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-sm bg-abu object-cover" />
                          {(f.jenis === "BEFORE" || f.jenis === "AFTER") && (
                            <span className={cx("absolute bottom-1 left-1 rounded-sm px-1.5 text-kecil-staf font-semibold text-putih", f.jenis === "AFTER" ? "bg-hijau" : "bg-aspal")}>
                              {f.jenis === "AFTER" ? "Sesudah" : "Sebelum"}
                            </span>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{d.judulKejadian}</span>
                    <span className="text-kecil-staf break-words">{d.judul}</span>
                    {d.catatan && <span className="line-clamp-2 text-kecil-staf text-aspal-2">{d.catatan}</span>}
                    <span className="text-kecil-staf text-aspal-2">
                      <span className="font-kode">{d.kode}</span>, {d.aktor}, {formatWaktu(d.waktu)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-10 xl:grid-cols-2">
        <section aria-labelledby="judul-tren" className="flex flex-col gap-2">
          <h2 id="judul-tren" className="text-h3">
            Tren harian
          </h2>
          <GrafikTren data={dasbor.tren} />
        </section>
        <section aria-labelledby="judul-kat" className="flex flex-col gap-2">
          <h2 id="judul-kat" className="text-h3">
            Per kategori
          </h2>
          {dasbor.kategori.length === 0 ? (
            <p className="text-aspal-2">Belum ada laporan di periode ini.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dasbor.kategori.map((k) => (
                <li key={k.slug} className="flex items-center gap-3">
                  <PelatKategori slug={k.slug} ukuran="kecil" />
                  <span className="flex-1">{KATEGORI_LAPORAN.find((x) => x.slug === k.slug)?.nama ?? k.nama}</span>
                  <span className="font-bold tabular-nums">{formatAngka(k.jumlah)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="judul-kec" className="flex flex-col gap-2">
        <h2 id="judul-kec" className="text-h3">
          Per kecamatan
        </h2>
        <p className="text-kecil-staf text-aspal-2">Batang abu = laporan masuk, hijau = sudah selesai. Diurutkan dari terbanyak.</p>
        <BarKecamatan data={dasbor.kecamatan} />
      </section>

      <section aria-labelledby="judul-rapor" className="flex flex-col gap-2">
        <h2 id="judul-rapor" className="text-h3">
          Rapor kinerja instansi
        </h2>
        {dasbor.instansi.length === 0 ? (
          <p className="text-aspal-2">Belum ada laporan yang ditangani instansi di periode ini.</p>
        ) : (
          <Tabel label="Rapor kinerja instansi">
            <TabelKepala>
              <tr>
                <TabelJudulSel menempel>Instansi</TabelJudulSel>
                <TabelJudulSel angka>Laporan</TabelJudulSel>
                <TabelJudulSel angka>Selesai</TabelJudulSel>
                <TabelJudulSel angka>Tepat waktu</TabelJudulSel>
                <TabelJudulSel angka>Rata-rata waktu</TabelJudulSel>
                <TabelJudulSel angka>Terlambat</TabelJudulSel>
                <TabelJudulSel angka>Berulang</TabelJudulSel>
              </tr>
            </TabelKepala>
            <tbody>
              {dasbor.instansi.map((a) => (
                <TabelBaris key={a.id}>
                  <TabelSel menempel className="font-semibold">
                    {a.nama}
                  </TabelSel>
                  <TabelSel angka>{formatAngka(a.jumlah)}</TabelSel>
                  <TabelSel angka>{a.persen_selesai === null ? "–" : `${formatAngka(a.persen_selesai)}%`}</TabelSel>
                  <TabelSel angka>{a.persen_tepat === null ? "–" : `${formatAngka(a.persen_tepat)}%`}</TabelSel>
                  <TabelSel angka>{a.rata_jam === null ? "–" : formatDurasi(Number(a.rata_jam))}</TabelSel>
                  <TabelSel angka className={cx(a.terlambat > 0 && "font-bold text-merah")}>{formatAngka(a.terlambat)}</TabelSel>
                  <TabelSel angka className={cx(a.berulang > 0 && "font-bold text-oranye")}>{formatAngka(a.berulang)}</TabelSel>
                </TabelBaris>
              ))}
            </tbody>
          </Tabel>
        )}
      </section>
    </div>
  );
}

export function bacaFilter(sp: Record<string, string | string[] | undefined>): Filter {
  const hari = Number(sp.hari);
  return {
    hari: [7, 30, 90, 365].includes(hari) ? hari : 30,
    kecamatan: typeof sp.kecamatan === "string" && /^\d{2}\.\d{2}\.\d{2}$/.test(sp.kecamatan) ? sp.kecamatan : undefined,
    kategori: typeof sp.kategori === "string" && /^[0-9a-f-]{36}$/.test(sp.kategori) ? sp.kategori : undefined,
  };
}
