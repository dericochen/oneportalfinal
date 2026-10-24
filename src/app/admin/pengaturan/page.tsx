import type { Metadata } from "next";
import { EditorSla, FormPengaturan, KelolaInstansi } from "@/components/staf/kelola-master";
import { PesanGagal } from "@/components/ui/keadaan";
import { wajibPeran } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { buatKlienServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pengaturan" };

const TAB = [
  { id: "situs", label: "Teks situs" },
  { id: "sla", label: "Matriks SLA" },
  { id: "instansi", label: "Instansi" },
] as const;

/** CMS admin: teks beranda & footer, matriks SLA (tenggat bawaan), dan instansi. */
export default async function HalamanPengaturan(props: PageProps<"/admin/pengaturan">) {
  await wajibPeran(["ADMIN"], "/admin/pengaturan");
  const sp = await props.searchParams;
  const tab = TAB.find((t) => t.id === sp.tab)?.id ?? "situs";
  const supabase = await buatKlienServer();

  let isi: React.ReactNode;
  if (tab === "situs") {
    isi = <FormPengaturan awal={await ambilPengaturan()} />;
  } else if (tab === "sla") {
    const [kat, sla] = await Promise.all([
      supabase.from("report_categories").select("id, name").is("deleted_at", null).order("sort_order"),
      supabase.from("sla_policies").select("category_id, priority, target_hours"),
    ]);
    isi =
      kat.error || sla.error ? (
        <PesanGagal judul="Matriks SLA belum termuat" pesan="Muat ulang halaman ini." />
      ) : (
        <>
          <p className="max-w-baca text-aspal-2">
            Target waktu penyelesaian per kategori dan prioritas. Tenggat laporan dihitung otomatis dari matriks ini saat diverifikasi, dan
            tetap bisa diubah per laporan di halaman detailnya.
          </p>
          <EditorSla
            kategori={(kat.data ?? []).map((k) => ({ id: k.id, nama: k.name }))}
            awal={(sla.data ?? []).map((s) => ({ kategori: s.category_id, prioritas: s.priority, jam: s.target_hours }))}
          />
        </>
      );
  } else {
    const [ag, pet] = await Promise.all([
      supabase.from("agencies").select("id, name, short_name, kind, description, contact_phone, website, is_active, deleted_at").order("kind").order("name"),
      supabase.from("profiles").select("agency_id").eq("role", "OFFICER").is("deleted_at", null),
    ]);
    const hitung = new Map<string, number>();
    for (const p of pet.data ?? []) if (p.agency_id) hitung.set(p.agency_id, (hitung.get(p.agency_id) ?? 0) + 1);
    isi = ag.error ? (
      <PesanGagal judul="Instansi belum termuat" pesan="Muat ulang halaman ini." />
    ) : (
      <KelolaInstansi
        daftar={(ag.data ?? []).map((a) => ({
          id: a.id,
          nama: a.name,
          namaSingkat: a.short_name,
          jenis: a.kind,
          keterangan: a.description ?? "",
          telepon: a.contact_phone ?? "",
          situs: a.website ?? "",
          aktif: a.is_active,
          terhapus: Boolean(a.deleted_at),
          petugas: hitung.get(a.id) ?? 0,
        }))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1">Pengaturan</h1>
        <p className="mt-1 text-aspal-2">Semua yang tampil di situs bisa diubah di sini tanpa menyentuh kode. Perubahan tercatat di log aktivitas.</p>
      </header>
      <nav aria-label="Bagian pengaturan" className="flex flex-wrap gap-1 border-b border-garis">
        {TAB.map((t) => (
          <a
            key={t.id}
            href={`/admin/pengaturan?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={
              tab === t.id
                ? "-mb-px inline-flex min-h-11 items-center border-b-2 border-hutan px-4 font-semibold text-hutan"
                : "inline-flex min-h-11 items-center px-4 font-semibold text-aspal-2 transition-colors hover:text-hutan"
            }
          >
            {t.label}
          </a>
        ))}
      </nav>
      <div key={tab} className="animate-geser-masuk">
        {isi}
      </div>
    </div>
  );
}
