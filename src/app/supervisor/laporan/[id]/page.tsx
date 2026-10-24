import type { Metadata } from "next";
import { DetailLaporanStaf } from "@/components/staf/detail-laporan";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Detail laporan" };

export default async function DetailLaporanSupervisor(props: PageProps<"/supervisor/laporan/[id]">) {
  const { id } = await props.params;
  await wajibPeran(["SUPERVISOR"], `/supervisor/laporan/${id}`);
  return <DetailLaporanStaf dasar="/supervisor" id={id} peran="SUPERVISOR" />;
}
