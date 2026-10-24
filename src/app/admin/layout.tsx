import { KerangkaStaf } from "@/components/tata-letak/kerangka-staf";
import { menuAdminDenganHitung } from "@/components/tata-letak/navigasi";
import { wajibPeran } from "@/lib/auth";
import { hitungAntrean } from "@/lib/data/staf";

/** Area admin. Lapis 2: hanya peran ADMIN; lainnya 403. */
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const sesi = await wajibPeran(["ADMIN"], "/admin");
  const hitung = await hitungAntrean();
  return (
    <KerangkaStaf sesi={sesi} menu={menuAdminDenganHitung(hitung)} beranda="/admin">
      {children}
    </KerangkaStaf>
  );
}
