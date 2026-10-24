import { Bell } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { formatAngka } from "@/lib/format";
import { buatKlienServer } from "@/lib/supabase/server";

/** Lonceng notifikasi + jumlah belum dibaca (dihitung di database, RLS). */
export async function LoncengNotifikasi({ className }: { className?: string }) {
  const supabase = await buatKlienServer();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const n = count ?? 0;
  const label = n > 0 ? `Notifikasi, ${n} belum dibaca` : "Notifikasi";
  return (
    <Link
      href="/notifikasi"
      aria-label={label}
      className={cx("relative inline-flex size-11 items-center justify-center rounded-sm hover:bg-abu", className)}
    >
      <Bell aria-hidden className="size-6" />
      {n > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-sm bg-merah px-1 text-kecil-staf leading-5 font-bold text-putih"
        >
          {n > 99 ? "99+" : formatAngka(n)}
        </span>
      )}
    </Link>
  );
}
