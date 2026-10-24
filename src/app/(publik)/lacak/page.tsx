import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Masukan } from "@/components/ui/isian";
import { Tombol } from "@/components/ui/tombol";
import { POLA_KODE_LAPORAN } from "@/lib/domain/laporan";

export const metadata: Metadata = { title: "Lacak laporan" };

/** Form lacak seperti cek resi kurir. Berfungsi tanpa JavaScript (GET). */
export default async function HalamanLacak(props: PageProps<"/lacak">) {
  const sp = await props.searchParams;
  const masukan = typeof sp.kode === "string" ? sp.kode.trim().toUpperCase().replace(/\s+/g, "") : "";
  const valid = POLA_KODE_LAPORAN.test(masukan);
  if (valid) redirect(`/lacak/${masukan}`);

  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-6 px-4 py-8 md:py-12">
      <div>
        <h1 className="text-h1">Lacak laporan</h1>
        <p className="mt-2 text-aspal-2">Masukkan kode yang tertera di resi laporan Anda.</p>
      </div>
      <form action="/lacak" method="get" className="flex flex-col gap-4">
        <Masukan
          name="kode"
          label="Kode laporan"
          petunjuk="Contoh: OP-2026-00182"
          defaultValue={masukan}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-kode"
          error={masukan && !valid ? "Format kode belum sesuai. Kode terdiri dari OP, tahun, dan 5 angka, contoh OP-2026-00182." : undefined}
          wajib
        />
        <Tombol type="submit">Lacak</Tombol>
      </form>
    </div>
  );
}
