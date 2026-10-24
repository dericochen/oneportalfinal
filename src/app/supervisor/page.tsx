import type { Metadata } from "next";
import { bacaFilter, CommandCenter } from "@/components/staf/command-center";
import { wajibPeran } from "@/lib/auth";

export const metadata: Metadata = { title: "Command center supervisor" };

export default async function BerandaSupervisor(props: PageProps<"/supervisor">) {
  await wajibPeran(["SUPERVISOR"], "/supervisor");
  const filter = bacaFilter(await props.searchParams);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1">Command center</h1>
        <p className="mt-1 text-aspal-2">Anda melihat semua laporan dan menerima eskalasi laporan yang melewati tenggat.</p>
      </header>
      <CommandCenter dasar="/supervisor" filter={filter} />
    </div>
  );
}
