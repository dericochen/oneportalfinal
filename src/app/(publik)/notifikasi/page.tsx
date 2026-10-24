import type { Metadata } from "next";
import Link from "next/link";
import { tandaiSemuaDibaca } from "@/aksi/notifikasi";
import { LayarKosong, PesanGagal } from "@/components/ui/keadaan";
import { TombolKirim } from "@/components/ui/tombol-kirim";
import { wajibMasuk } from "@/lib/auth";
import { cx } from "@/lib/cx";
import { formatWaktu } from "@/lib/format";
import { buatKlienServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifikasi" };

/** Tautan notifikasi hanya ditampilkan bila halamannya sudah tersedia di fase ini. */
const AWALAN_TERSEDIA = ["/akun", "/admin", "/petugas", "/supervisor", "/notifikasi", "/lacak", "/lapor"];
const tautanTersedia = (l: string | null) => !!l && AWALAN_TERSEDIA.some((a) => l === a || l.startsWith(`${a}/`));

export default async function HalamanNotifikasi() {
  await wajibMasuk("/notifikasi");
  const supabase = await buatKlienServer();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const adaBelumDibaca = (data ?? []).some((n) => !n.read_at);

  return (
    <div className="mx-auto flex w-full max-w-daftar flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1">Notifikasi</h1>
        {adaBelumDibaca && (
          <form action={tandaiSemuaDibaca}>
            <TombolKirim varian="kedua" teksMemuat="Menandai…">
              Tandai semua dibaca
            </TombolKirim>
          </form>
        )}
      </header>
      {error ? (
        <PesanGagal judul="Notifikasi belum termuat" pesan="Koneksi ke server terputus. Muat ulang halaman ini." />
      ) : !data || data.length === 0 ? (
        <LayarKosong pesan="Belum ada notifikasi. Kabar tentang laporan dan tugas Anda akan muncul di sini." />
      ) : (
        <ul className="divide-y divide-garis rounded-md border border-garis">
          {data.map((n) => {
            const isi = (
              <>
                <span className="flex items-start gap-2">
                  {!n.read_at && <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-biru" />}
                  <span className={cx("break-words", !n.read_at ? "font-bold" : "font-semibold")}>
                    {n.title}
                    {!n.read_at && <span className="sr-only"> (belum dibaca)</span>}
                  </span>
                </span>
                {n.body && <span className="block break-words text-aspal-2">{n.body}</span>}
                <span className="block text-kecil text-aspal-2">{formatWaktu(n.created_at)}</span>
              </>
            );
            return (
              <li key={n.id}>
                {tautanTersedia(n.link) ? (
                  <Link href={n.link!} className="flex flex-col gap-1 p-4 hover:bg-abu">
                    {isi}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-1 p-4">{isi}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
