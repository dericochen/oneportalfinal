import type { Metadata } from "next";
import { DaftarLaporanStaf } from "@/components/staf/daftar-laporan";
import { TombolTautan } from "@/components/ui/tombol";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Laporan" };

export default async function HalamanLaporanAdmin(props: PageProps<"/admin/laporan">) {
  await wajibPeran(["ADMIN"], "/admin/laporan");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-h1">Laporan</h1>
        <TombolTautan href="/admin/laporan/baru">Catat laporan baru</TombolTautan>
      </header>
      <DaftarLaporanStaf dasar="/admin" sp={await props.searchParams} />
    </div>
  );
}
