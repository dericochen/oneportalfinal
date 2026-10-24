import { KerangkaStaf } from "@/components/tata-letak/kerangka-staf";
import { MENU_SUPERVISOR } from "@/components/tata-letak/navigasi";
import { wajibPeran } from "@/lib/auth";

/** Area supervisor (hanya baca). Lapis 2: hanya peran SUPERVISOR; lainnya 403. */
export default async function LayoutSupervisor({ children }: LayoutProps<"/supervisor">) {
  const sesi = await wajibPeran(["SUPERVISOR"], "/supervisor");
  return (
    <KerangkaStaf sesi={sesi} menu={MENU_SUPERVISOR} beranda="/supervisor">
      {children}
    </KerangkaStaf>
  );
}
