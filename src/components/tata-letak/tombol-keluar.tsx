import { SignOut } from "@phosphor-icons/react/ssr";
import { keluar } from "@/aksi/auth";
import { cx } from "@/lib/cx";

/** Tombol keluar (form server action, berfungsi tanpa JavaScript). */
export function TombolKeluar({ className, ringkas }: { className?: string; ringkas?: boolean }) {
  return (
    <form action={keluar}>
      <button
        type="submit"
        className={cx(
          "inline-flex min-h-11 items-center gap-2 rounded-sm px-3 font-semibold text-aspal hover:bg-abu",
          className,
        )}
      >
        <SignOut aria-hidden className="size-5" />
        <span className={cx(ringkas && "sr-only")}>Keluar</span>
      </button>
    </form>
  );
}
