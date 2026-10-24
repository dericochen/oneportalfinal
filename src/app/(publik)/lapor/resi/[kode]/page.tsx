import { WhatsappLogo } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Resi } from "@/components/ui/resi";
import { TombolTautan } from "@/components/ui/tombol";
import { wajibMasuk } from "@/lib/auth";
import { POLA_KODE_LAPORAN } from "@/lib/domain/laporan";
import { URL_SITUS } from "@/lib/env";
import { buatKlienServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resi laporan", robots: { index: false } };

/** Halaman sukses = resi laporan (momen khas 2). Hanya untuk pelapornya (RLS). */
export default async function HalamanResi(props: PageProps<"/lapor/resi/[kode]">) {
  const kode = decodeURIComponent((await props.params).kode).toUpperCase();
  if (!POLA_KODE_LAPORAN.test(kode)) notFound();
  await wajibMasuk(`/lapor/resi/${kode}`);
  const supabase = await buatKlienServer();
  const { data: r } = await supabase
    .from("reports")
    .select("code, submitted_at, resolved_at, report_categories:category_id (name), districts:district_code (name), villages:village_code (name)")
    .eq("code", kode)
    .maybeSingle();
  if (!r) notFound();
  const satu = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
  const urlLacak = `${URL_SITUS}/lacak/${r.code}`;
  const pesanWa = encodeURIComponent(`Saya melaporkan masalah di ONE PORTAL. Kode laporan ${r.code}. Lacak di ${urlLacak}`);

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6 px-4 py-8 md:py-12">
      <div>
        <h1 className="text-h1">Laporan terkirim</h1>
        <p className="mt-2 text-aspal-2">Admin akan memverifikasi laporan Anda. Kabar berikutnya masuk ke notifikasi.</p>
      </div>
      <Resi
        kode={r.code}
        urlLacak={urlLacak}
        dibuatPada={r.submitted_at}
        selesaiPada={r.resolved_at}
        rincian={[
          { label: "Kategori", nilai: satu(r.report_categories)?.name ?? "" },
          { label: "Lokasi", nilai: `${satu(r.villages)?.name ?? ""}, ${satu(r.districts)?.name ?? ""}` },
        ]}
      />
      <div className="tanpa-cetak flex flex-wrap gap-3">
        <TombolTautan href={`/lacak/${r.code}`}>Lacak laporan</TombolTautan>
        <a
          href={`https://wa.me/?text=${pesanWa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm border-2 border-aspal px-4 font-semibold hover:bg-abu"
        >
          <WhatsappLogo aria-hidden className="size-5" />
          Bagikan ke WhatsApp
        </a>
        <TombolTautan href="/akun" varian="ketiga">
          Lihat semua laporan saya
        </TombolTautan>
      </div>
    </div>
  );
}
