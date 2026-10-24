import type { Metadata } from "next";
import { PesanGagal } from "@/components/ui/keadaan";
import { PetaPenuh } from "@/components/peta/peta-publik";
import { ambilTitikPeta } from "@/lib/data/publik";
import { supabaseTerkonfigurasi } from "@/lib/env";
import { buatKlienServer } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Peta laporan",
  description: "Titik laporan masalah kota di Medan beserta bukti foto penyelesaiannya.",
};

export default async function HalamanPeta() {
  const [titik, kecamatan] = await Promise.all([
    ambilTitikPeta(),
    (async () => {
      if (!supabaseTerkonfigurasi) return [];
      const supabase = await buatKlienServer();
      const { data } = await supabase.from("districts").select("name").is("deleted_at", null).order("name");
      return (data ?? []).map((d) => d.name as string);
    })(),
  ]);

  if (!titik) {
    return (
      <div className="mx-auto max-w-daftar px-4 py-12">
        <PesanGagal judul="Peta belum termuat" pesan="Data laporan tidak dapat diambil dari server. Muat ulang halaman ini." />
      </div>
    );
  }
  return <PetaPenuh titik={titik} kecamatan={kecamatan} />;
}
