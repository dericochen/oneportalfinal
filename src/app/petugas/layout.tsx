import { KerangkaPetugas } from "@/components/tata-letak/kerangka-petugas";
import { wajibPeran } from "@/lib/auth";

/** Area petugas lapangan. Lapis 2: hanya peran OFFICER; lainnya 403. */
export default async function LayoutPetugas({ children }: LayoutProps<"/petugas">) {
  const sesi = await wajibPeran(["OFFICER"], "/petugas");
  return <KerangkaPetugas sesi={sesi}>{children}</KerangkaPetugas>;
}
