import type { Metadata } from "next";
import { DaftarLaporanStaf } from "@/components/staf/daftar-laporan";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Tinjau bukti" };

export default async function AntreanTinjauBukti(props: PageProps<"/admin/tinjau-bukti">) {
  await wajibPeran(["ADMIN"], "/admin/tinjau-bukti");
  const sp = await props.searchParams;
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1">Tinjau bukti</h1>
        <p className="mt-1 text-aspal-2">Bukti foto sebelum dan sesudah dari petugas. Setujui untuk menandai laporan selesai.</p>
      </header>
      <DaftarLaporanStaf dasar="/admin" sp={{ ...sp, antrean: "bukti" }} />
    </div>
  );
}
