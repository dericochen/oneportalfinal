import type { Metadata } from "next";
import { DetailLaporanStaf } from "@/components/staf/detail-laporan";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Detail laporan" };

export default async function DetailLaporanAdmin(props: PageProps<"/admin/laporan/[id]">) {
  const { id } = await props.params;
  await wajibPeran(["ADMIN"], `/admin/laporan/${id}`);
  return <DetailLaporanStaf dasar="/admin" id={id} peran="ADMIN" />;
}
