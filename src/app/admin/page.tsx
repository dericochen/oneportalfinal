import type { Metadata } from "next";
import { bacaFilter, CommandCenter } from "@/components/staf/command-center";
import { TombolTautan } from "@/components/ui/tombol";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Command center" };

export default async function BerandaAdmin(props: PageProps<"/admin">) {
  await wajibPeran(["ADMIN"], "/admin");
  const filter = bacaFilter(await props.searchParams);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-h1">Command center</h1>
        <TombolTautan href="/admin/laporan/baru">Catat laporan baru</TombolTautan>
      </header>
      <CommandCenter dasar="/admin" filter={filter} />
    </div>
  );
}
