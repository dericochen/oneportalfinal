import { CheckCircle, Clock, Megaphone, SealCheck, Tray, Wrench } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { PetaMini } from "@/components/peta/peta-publik";
import { AngkaHitung } from "@/components/ui/angka-hitung";
import { RantingDaun, DaunMelayang } from "@/components/ui/hiasan";
import { Masukan } from "@/components/ui/isian";
import { JudulBagian } from "@/components/ui/judul-bagian";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { LogoMedan } from "@/components/ui/logo-medan";
import { LogResi, type KejadianLog } from "@/components/ui/log-resi";
import { Muncul } from "@/components/ui/muncul";
import { PitaSongket } from "@/components/ui/ornamen";
import { IKON_KATEGORI, PelatKategori } from "@/components/ui/pelat-kategori";
import { PenggeserBukti } from "@/components/ui/penggeser-bukti";
import { KataBerganti } from "@/components/ui/kata-berganti";
import { LatarSlideHero } from "@/components/ui/latar-slide-hero";
import { Tombol, TombolTautan } from "@/components/ui/tombol";
import { ambilBaruSelesai, ambilStatistikPublik, ambilTitikPeta } from "@/lib/data/publik";
import { ambilSlideBeranda } from "@/lib/data/slide";
import { KATEGORI_LAPORAN } from "@/lib/domain/kategori";
import { SLIDE_BAWAAN } from "@/lib/domain/slide";
import { formatDurasi, formatTanggalPendek } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";

export const metadata: Metadata = {
  title: { absolute: "ONE PORTAL, layanan publik Kota Medan" },
};

// Contoh alur (ilustrasi kasus OP-2026-00182). Waktu UTC, tampil 09.10–16.25 WIB.
const CONTOH_ALUR: KejadianLog[] = [
  { id: "1", waktu: "2026-10-14T02:10:00Z", judul: "Warga mengirim laporan dengan foto", aktor: "Pelapor", status: "SUBMITTED" },
  { id: "2", waktu: "2026-10-14T02:25:00Z", judul: "Admin memverifikasi, prioritas tinggi karena dekat sekolah", aktor: "Admin", status: "VERIFIED" },
  { id: "3", waktu: "2026-10-14T02:40:00Z", judul: "Ditugaskan ke petugas Dinas SDABMBK", aktor: "Admin", status: "ASSIGNED" },
  { id: "4", waktu: "2026-10-14T06:20:00Z", judul: "Petugas mulai menambal lubang", aktor: "Petugas Dinas SDABMBK", status: "IN_PROGRESS" },
  { id: "5", waktu: "2026-10-14T09:00:00Z", judul: "Foto sebelum dan sesudah diunggah", aktor: "Petugas Dinas SDABMBK", status: "UNDER_REVIEW" },
  { id: "6", waktu: "2026-10-14T09:25:00Z", judul: "Admin menyetujui bukti, laporan selesai dan tampil di peta", aktor: "Admin", status: "RESOLVED" },
];

const LANGKAH = [
  { ikon: Megaphone, judul: "Anda melapor", isi: "Foto masalahnya, tandai lokasinya di peta, lalu kirim. Anda menerima kode resi." },
  { ikon: SealCheck, judul: "Admin memverifikasi", isi: "Laporan diperiksa, diberi prioritas, dan diteruskan ke instansi yang berwenang." },
  { ikon: Wrench, judul: "Petugas mengerjakan", isi: "Petugas lapangan mengerjakan dan mengirim kabar. Anda dikabari tiap perubahan status." },
  { ikon: CheckCircle, judul: "Selesai dengan bukti", isi: "Laporan selesai setelah admin memeriksa foto sebelum dan sesudah. Buktinya tampil di peta." },
] as const;

const LEGENDA_PETA = [
  { warna: "bg-hijau", teks: "Selesai, ada bukti foto" },
  { warna: "bg-biru", teks: "Sedang dikerjakan" },
  { warna: "bg-aspal-2", teks: "Menunggu ditangani" },
] as const;

/** Bentuk daun: dua sudut berseberangan melengkung besar. */
const KELAS_DAUN = "rounded-tl-daun rounded-br-daun rounded-tr-lg rounded-bl-lg";

export default async function Beranda() {
  const [statistik, titik, selesai, slide, pengaturan] = await Promise.all([
    ambilStatistikPublik(30),
    ambilTitikPeta({ hari: 120 }),
    ambilBaruSelesai(3),
    ambilSlideBeranda(),
    ambilPengaturan(),
  ]);
  // Judul hero dari CMS; kata "Medan" (bila ada) diberi garis kuning.
  const judul = pengaturan["beranda.judul"];
  const [barisPertama, barisKedua] = judul.includes("|")
    ? judul.split("|", 2)
    : ["Rawat Medan bersama", "Mulai dari satu laporan"];
  const kataBerganti = pengaturan["beranda.kata_berganti"]
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 8);

  const adaFoto = slide.some((s) => s.gambar);

  return (
    <div className="flex flex-col">
      {/* Hero: foto slide admin sebagai latar penuh (berganti tiap 2 detik), di atasnya tugas utama warga. */}
      <section
        aria-labelledby="judul-beranda"
        className="relative isolate flex min-h-[64svh] items-center overflow-hidden corak-ragi text-putih lg:min-h-[36rem]"
      >
        <LatarSlideHero slide={slide.length > 0 ? slide : SLIDE_BAWAAN} />
        {!adaFoto && <DaunMelayang />}
        <div className="relative mx-auto w-full max-w-situs px-4 pt-10 pb-36 md:px-6 md:pt-14 lg:pb-28">
          <div className="flex max-w-teks flex-col gap-6">
            <LogoMedan className="animate-naik self-start text-h1" />
            <h1 id="judul-beranda" className="judul-publik animate-naik tunda-1 text-hero font-extrabold">
              <span className="block">{barisPertama.replace(/,|\./g, "")}</span>
              <span className="block">{barisKedua.replace(/,|\./g, "")}</span>
            </h1>
            {kataBerganti.length > 0 && (
              <p className="animate-naik tunda-2 max-w-form text-h3 leading-snug font-semibold text-putih">
                Lihat <KataBerganti kata={kataBerganti} className="text-kuning" /> di sekitar Anda?
              </p>
            )}
            <p className="animate-naik tunda-2 max-w-baca text-lumut">{pengaturan["beranda.kalimat_pembuka"]}</p>
            <div className="animate-naik tunda-3 flex flex-wrap gap-3">
              <TombolTautan href="/lapor" varian="lapor" ukuran="besar">
                Lapor sekarang
              </TombolTautan>
              <TombolTautan href="/peta" varian="terang" ukuran="besar">
                Lihat peta
              </TombolTautan>
            </div>
            <p className="animate-naik tunda-3 max-w-form text-kecil text-lumut">
              Gratis untuk warga. Simpan kode resi Anda untuk melihat perkembangan laporan.
            </p>
            <form
              action="/lacak"
              method="get"
              aria-label="Lacak laporan"
              className="animate-naik tunda-4 flex max-w-form flex-col gap-3 rounded-lg bg-putih p-4 text-aspal shadow-angkat sm:flex-row sm:items-end"
            >
              <Masukan
                name="kode"
                label="Lacak laporan"
                petunjuk="Masukkan kode di resi, contoh OP-2026-00182"
                autoComplete="off"
                spellCheck={false}
                className="flex-1"
              />
              <Tombol type="submit" className="sm:mb-0.5">
                Lacak
              </Tombol>
            </form>
          </div>
        </div>
        {/* Deret pucuk rebung, ragi hias Melayu Deli. Hiasan murni. */}
        <div aria-hidden className="rebung-warna absolute inset-x-0 bottom-0 z-10 h-4" />
      </section>

      {/* Angka minggu ini: kartu yang menimpa tepi hero. */}
      <section aria-labelledby="judul-minggu" className="relative z-10 -mt-10">
        <h2 id="judul-minggu" className="sr-only">
          Minggu ini di Medan
        </h2>
        <div className="mx-auto w-full max-w-situs px-4 md:px-6">
          {statistik ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Muncul as="li" tunda={0}>
                <KartuAngka ikon={Tray} label="Laporan masuk, 7 hari terakhir">
                  <AngkaHitung nilai={statistik.masuk7Hari} />
                </KartuAngka>
              </Muncul>
              <Muncul as="li" tunda={1}>
                <KartuAngka ikon={CheckCircle} label="Laporan selesai, 7 hari terakhir" nada="hijau">
                  <AngkaHitung nilai={statistik.selesai7Hari} />
                </KartuAngka>
              </Muncul>
              <Muncul as="li" tunda={2}>
                <KartuAngka ikon={Clock} label="Rata-rata waktu selesai, 30 hari">
                  {statistik.rataJamSelesai !== null && statistik.selesai > 0 ? formatDurasi(statistik.rataJamSelesai) : "Belum ada"}
                </KartuAngka>
              </Muncul>
              <Muncul as="li" tunda={3}>
                <KartuAngka ikon={SealCheck} label="Selesai tepat waktu, 30 hari">
                  {statistik.persenTepatWaktu !== null ? <AngkaHitung nilai={statistik.persenTepatWaktu / 100} jenis="persen" /> : "Belum ada"}
                </KartuAngka>
              </Muncul>
            </ul>
          ) : (
            <PesanGagal judul="Angka belum termuat" pesan="Server data tidak dapat dihubungi. Muat ulang halaman ini." className="bg-putih" />
          )}
          <p className="mt-3 text-kecil text-aspal-2">Data simulasi prototipe, bukan kanal resmi Pemerintah Kota Medan.</p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-situs flex-col gap-20 px-4 pt-16 md:px-6">
        {/* Kategori: jalan pintas ke form lapor dengan kategori terpilih. */}
        <section aria-labelledby="judul-kategori" className="flex flex-col gap-8">
          <Muncul>
            <JudulBagian id="judul-kategori" judul="Pilih masalah di sekitar Anda">
              Pilih kategori agar laporan langsung diteruskan ke pihak yang tepat.
            </JudulBagian>
          </Muncul>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {KATEGORI_LAPORAN.map((k, i) => {
              const Ikon = IKON_KATEGORI[k.slug];
              return (
                <Muncul as="li" key={k.slug} tunda={(i % 5) as 0 | 1 | 2 | 3 | 4}>
                  <Link
                    href={`/lapor?kategori=${k.slug}`}
                    className="group kartu-kilau flex h-full flex-col items-center gap-3 rounded-lg border border-garis bg-putih p-4 text-center transition-[transform,box-shadow,border-color] duration-300 ease-keluar hover:-translate-y-0.5 hover:border-hutan hover:shadow-angkat"
                  >
                    <span className="flex size-14 items-center justify-center rounded-tl-daun rounded-br-daun rounded-tr-md rounded-bl-md bg-lumut text-hutan transition-[background-color,color,transform] duration-300 ease-keluar group-hover:scale-105 group-hover:-rotate-6 group-hover:bg-hutan group-hover:text-putih">
                      <Ikon aria-hidden weight="fill" className="size-8" />
                    </span>
                    <span className="font-semibold">{k.nama}</span>
                  </Link>
                </Muncul>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Pita songket pembatas: ritme Nusantara antarbagian. */}
      <PitaSongket className="mt-20" />

      {/* Peta: pita hijau muda agar ritme halaman berganti. */}
      <section aria-labelledby="judul-peta" className="latar-lumut border-y border-garis">
        <div className="mx-auto grid w-full max-w-situs items-center gap-8 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
          <Muncul className="flex flex-col gap-5">
            <JudulBagian id="judul-peta" judul="Lihat yang sedang ditangani di sekitar Anda">
              Setiap titik adalah laporan warga. Semakin dekat Anda memperbesar peta, semakin jelas bukti foto penyelesaiannya.
            </JudulBagian>
            <ul className="flex flex-col gap-2">
              {LEGENDA_PETA.map((l) => (
                <li key={l.teks} className="flex items-center gap-3">
                  <span aria-hidden className={`size-3.5 rounded-full border-2 border-putih ${l.warna}`} />
                  <span>{l.teks}</span>
                </li>
              ))}
            </ul>
            <TombolTautan href="/peta" className="self-start">
              Buka peta lengkap
            </TombolTautan>
            <p className="text-kecil text-aspal-2">Data simulasi prototipe, bukan kanal resmi Pemerintah Kota Medan.</p>
          </Muncul>
          <Muncul tunda={2}>
            {titik ? (
              <PetaMini titik={titik} />
            ) : (
              <PesanGagal judul="Titik peta belum termuat" pesan="Server data tidak dapat dihubungi. Muat ulang halaman ini." className="bg-putih" />
            )}
          </Muncul>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-situs flex-col gap-20 px-4 pt-20 md:px-6">
        <section aria-labelledby="judul-selesai" className="flex flex-col gap-8">
          <Muncul>
            <JudulBagian id="judul-selesai" judul="Baru saja selesai">
              Geser foto untuk membandingkan keadaan sebelum dan sesudah diperbaiki.
            </JudulBagian>
          </Muncul>
          {!selesai ? (
            <PesanGagal judul="Bukti penyelesaian belum termuat" pesan="Muat ulang halaman ini dalam beberapa saat." />
          ) : selesai.length === 0 ? (
            <Muncul>
              <LayarKosong
                className="bg-putih"
                pesan="Belum ada laporan yang selesai dengan bukti foto. Laporan pertama yang selesai akan tampil di sini."
                aksi={
                  <TombolTautan href="/lapor" varian="kedua">
                    Buat laporan pertama
                  </TombolTautan>
                }
              />
            </Muncul>
          ) : (
            <ul className="grid gap-6 md:grid-cols-3">
              {selesai.map((s, i) => (
                <Muncul as="li" key={s.id} tunda={(i + 1) as 1 | 2 | 3} className="flex flex-col gap-3 rounded-lg border border-garis bg-putih p-3 shadow-embun">
                  {s.fotoSebelum && s.fotoSesudah && (
                    <PenggeserBukti
                      sebelum={s.fotoSebelum}
                      sesudah={s.fotoSesudah}
                      labelSebelum={`Sebelum, ${formatTanggalPendek(s.masukPada)}`}
                      labelSesudah={`Sesudah, ${formatTanggalPendek(s.selesaiPada)}`}
                      alt={s.judul}
                    />
                  )}
                  <div className="flex items-start gap-3 px-1 pb-1">
                    <PelatKategori slug={s.kategoriSlug} />
                    <div className="min-w-0">
                      <Link href={`/lacak/${s.kode}`} className="font-semibold break-words hover:underline">
                        {s.judul}
                      </Link>
                      <p className="text-kecil text-aspal-2">
                        {s.kelurahan}, {s.kecamatan}. Selesai dalam {formatDurasi(s.jamPengerjaan)}
                        {s.instansi ? ` oleh ${s.instansi}` : ""}.
                      </p>
                    </div>
                  </div>
                </Muncul>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pita emas lembut: ritme halaman berganti antara kertas, lumut, dan emas. */}
      <PitaSongket nada="hutan" className="mt-20" />
      <section aria-labelledby="judul-cara" className="latar-pita-emas border-y border-emas/30">
        <div className="mx-auto flex w-full max-w-situs flex-col gap-8 px-4 py-16 md:px-6">
          <Muncul>
            <JudulBagian id="judul-cara" judul="Bagaimana laporan ditangani">
              Empat tahap, semuanya tercatat dengan jam WIB. Laporan baru dinyatakan selesai setelah admin memeriksa foto dari petugas.
            </JudulBagian>
          </Muncul>
          <ol className="relative grid gap-5 md:grid-cols-4">
            <span aria-hidden className="absolute top-12 right-[12%] left-[12%] hidden border-t-2 border-dashed border-daun/60 md:block" />
            {LANGKAH.map((l, i) => {
              const Ikon = l.ikon;
              return (
                <Muncul as="li" key={l.judul} tunda={i as 0 | 1 | 2 | 3}>
                  <div className="relative flex h-full flex-col gap-3 rounded-lg border border-garis bg-putih p-5 shadow-embun">
                    <span className="flex items-center gap-3">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-tl-daun rounded-br-daun rounded-tr-md rounded-bl-md bg-hutan text-putih">
                        <Ikon aria-hidden weight="fill" className="size-7" />
                      </span>
                      <span aria-hidden className="text-angka font-extrabold text-lumut">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="text-h3 text-hutan">{l.judul}</h3>
                    <p className="text-kecil text-aspal-2">{l.isi}</p>
                  </div>
                </Muncul>
              );
            })}
          </ol>
          <Muncul className="grid gap-6 rounded-lg border border-garis bg-putih p-5 shadow-embun md:p-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <h3 className="text-h3 text-hutan">Contoh satu laporan</h3>
              <p className="text-aspal-2">
                Jalan berlubang di depan sekolah, dari masuk sampai selesai pada hari yang sama. Terbaru di atas, seperti cek resi kurir.
              </p>
            </div>
            <LogResi kejadian={CONTOH_ALUR} />
          </Muncul>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-situs flex-col px-4 py-20 md:px-6">
        <Muncul as="section" className={`relative isolate overflow-hidden corak-ragi p-8 text-putih md:p-12 ${KELAS_DAUN}`}>
          <RantingDaun className="absolute -right-4 -bottom-10 -z-10 hidden h-72 w-auto origin-bottom-right animate-goyang text-daun/40 sm:block" />
          <div className="flex max-w-teks flex-col items-start gap-4">
            <h2 className="text-h1">Lihat sesuatu yang perlu diperbaiki?</h2>
            <p className="max-w-baca text-lumut">Laporkan sekarang. Anda dikabari di setiap tahap sampai ada bukti foto bahwa masalahnya selesai.</p>
            <div className="flex flex-wrap gap-3">
              <TombolTautan href="/lapor" varian="lapor" ukuran="besar">
                Lapor masalah
              </TombolTautan>
              <TombolTautan href="/lacak" varian="terang" ukuran="besar">
                Lacak laporan
              </TombolTautan>
            </div>
          </div>
        </Muncul>
      </div>
    </div>
  );
}

function KartuAngka({
  ikon: Ikon,
  label,
  nada,
  children,
}: {
  ikon: typeof Tray;
  label: string;
  nada?: "hijau";
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full items-center gap-4 rounded-lg border border-garis bg-putih p-5 shadow-angkat">
      <span
        className={`flex size-14 shrink-0 items-center justify-center rounded-tl-daun rounded-br-daun rounded-tr-md rounded-bl-md bg-lumut ${
          nada === "hijau" ? "text-hijau" : "text-hutan"
        }`}
      >
        <Ikon aria-hidden weight="fill" className="size-7" />
      </span>
      <p className="flex min-w-0 flex-col">
        <span className="text-angka font-extrabold text-hutan tabular-nums">{children}</span>
        <span className="text-kecil text-aspal-2">{label}</span>
      </p>
    </div>
  );
}
