import type { Metadata } from "next";
import { DaftarLaporanStaf } from "@/components/staf/daftar-laporan";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Semua laporan" };

export default async function HalamanLaporanSupervisor(props: PageProps<"/supervisor/laporan">) {
  await wajibPeran(["SUPERVISOR"], "/supervisor/laporan");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Semua laporan</h1>
      <DaftarLaporanStaf dasar="/supervisor" sp={await props.searchParams} />
    </div>
  );
}
