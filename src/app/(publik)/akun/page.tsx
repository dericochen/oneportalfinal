import type { Metadata } from "next";
import { AlamatSaya } from "@/components/akun/alamat-saya";
import { ChipStatus } from "@/components/ui/chip";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { ButirRingkas, DaftarRingkas } from "@/components/ui/tabel";
import { TombolKeluar } from "@/components/tata-letak/tombol-keluar";
import { wajibPeran } from "@/lib/auth";
import { ambilWilayah } from "@/lib/data/wilayah";
import { dariBaris } from "@/lib/domain/alamat";
import type { StatusLaporan } from "@/lib/domain/laporan";
import { formatTanggal } from "@/lib/format";
import { buatKlienServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Akun saya" };

/** Dashboard warga: profil singkat dan laporan terakhir milik sendiri (RLS). */
export default async function HalamanAkun() {
  const sesi = await wajibPeran(["CITIZEN"], "/akun");
  const supabase = await buatKlienServer();
  const [{ data: laporan, error }, alamat, wilayah] = await Promise.all([
    supabase
      .from("reports")
      .select("id, code, title, status, submitted_at, report_categories:category_id (slug), districts:district_code (name)")
      .eq("reporter_id", sesi.id)
      .is("deleted_at", null)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("profile_addresses")
      .select("address, rt, rw, postal_code, district_code, village_code")
      .eq("id", sesi.id)
      .maybeSingle(),
    ambilWilayah(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-daftar flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">Halo, {sesi.namaLengkap}</h1>
          <p className="mt-1 break-all text-aspal-2">{sesi.email}</p>
        </div>
        <TombolKeluar className="border-2 border-aspal" />
      </header>

      {/* Fitur alamat disembunyikan bila belum aktif di server (tabel/migrasi belum ada). */}
      {!alamat.error && wilayah && (
        <section aria-labelledby="judul-alamat-saya" className="flex flex-col gap-4">
          <h2 id="judul-alamat-saya" className="text-h2">
            Alamat domisili
          </h2>
          <AlamatSaya alamat={alamat.data ? dariBaris(alamat.data) : null} wilayah={wilayah} />
        </section>
      )}

      <section aria-labelledby="judul-laporan-saya" className="flex flex-col gap-4">
        <h2 id="judul-laporan-saya" className="text-h2">
          Laporan saya
        </h2>
        {error ? (
          <PesanGagal judul="Laporan Anda belum termuat" pesan="Koneksi ke server terputus. Muat ulang halaman ini." />
        ) : !laporan || laporan.length === 0 ? (
          <LayarKosong pesan="Anda belum punya laporan. Laporan yang Anda kirim akan tampil di sini beserta perkembangannya." />
        ) : (
          <DaftarRingkas label="Laporan saya">
            {laporan.map((l) => {
              const kat = Array.isArray(l.report_categories) ? l.report_categories[0] : l.report_categories;
              const kec = Array.isArray(l.districts) ? l.districts[0] : l.districts;
              return (
                <ButirRingkas
                  key={l.id}
                  href={`/lacak/${l.code}`}
                  depan={<PelatKategori slug={kat?.slug ?? "lainnya"} />}
                  judul={l.title}
                  info={[<span key="k" className="font-kode">{l.code}</span>, kec?.name ?? "", formatTanggal(l.submitted_at)]}
                  status={<ChipStatus status={l.status as StatusLaporan} />}
                />
              );
            })}
          </DaftarRingkas>
        )}
      </section>
    </div>
  );
}
