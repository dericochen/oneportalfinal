import type { Metadata } from "next";
import { DaftarLaporanStaf } from "@/components/staf/daftar-laporan";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Antrean verifikasi" };

export default async function AntreanVerifikasi(props: PageProps<"/admin/verifikasi">) {
  await wajibPeran(["ADMIN"], "/admin/verifikasi");
  const sp = await props.searchParams;
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1">Antrean verifikasi</h1>
        <p className="mt-1 text-aspal-2">Laporan baru dari warga dan CMS. Buka laporan untuk memverifikasi, menolak, meneruskan, atau menggabungkan.</p>
      </header>
      <DaftarLaporanStaf dasar="/admin" sp={{ ...sp, antrean: "verifikasi" }} />
    </div>
  );
}
