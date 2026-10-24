import Link from "next/link";
import { notFound } from "next/navigation";
import { CapSelesai } from "@/components/ui/cap-selesai";
import { ChipBerulang, ChipPrioritas, ChipSla, ChipStatus, ChipTindakan } from "@/components/ui/chip";
import { LogResi } from "@/components/ui/log-resi";
import { PelatKategori } from "@/components/ui/pelat-kategori";
import { PenggeserBukti } from "@/components/ui/penggeser-bukti";
import { ambilDetailLaporan, ambilOpsiAksi } from "@/lib/data/staf";
import { LABEL_STATUS, type Prioritas, type StatusLaporan } from "@/lib/domain/laporan";
import { formatTanggal, formatTanggalPendek, formatWaktu } from "@/lib/format";
import { PanelAksiStaf } from "./panel-aksi";
import { PanelUbahLaporan } from "./panel-ubah-laporan";

const LABEL_KANAL: Record<string, string> = { WEB: "Situs", QR: "QR fasilitas", PHONE: "Telepon", WALK_IN: "Loket", SOCIAL: "Media sosial" };
const LABEL_FOTO = { INITIAL: "Foto laporan", PROGRESS: "Progres pekerjaan", BEFORE: "Sebelum", AFTER: "Sesudah", SUPPORTING: "Dokumen pendukung" } as const;

/** Detail laporan untuk staf: data lengkap, semua foto, riwayat dengan catatan internal, dan panel aksi. */
export async function DetailLaporanStaf({ dasar, id, peran }: { dasar: "/admin" | "/supervisor"; id: string; peran: "ADMIN" | "SUPERVISOR" }) {
  const [d, opsi] = await Promise.all([ambilDetailLaporan(id), peran === "ADMIN" ? ambilOpsiAksi() : Promise.resolve(null)]);
  if (!d) notFound();
  const r = d.r;
  const status = r.status as StatusLaporan;
  const buktiTerakhir = d.bukti[0];
  const fotoBukti = (jenis: "BEFORE" | "AFTER") => d.media.find((m) => m.jenis === jenis && (!buktiTerakhir || m.buktiId === buktiTerakhir.id));
  const sebelum = fotoBukti("BEFORE");
  const sesudah = fotoBukti("AFTER");
  const lainnya = d.media.filter((m) => m.jenis === "INITIAL" || m.jenis === "PROGRESS" || m.jenis === "SUPPORTING");

  return (
    <div className="flex flex-col gap-6">
      <Link href={`${dasar}/laporan`} className="tautan self-start">
        Kembali ke daftar laporan
      </Link>
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <PelatKategori slug={d.kategori?.slug ?? "lainnya"} ukuran="besar" label />
          <div className="min-w-0">
            <p className="font-kode text-aspal-2">{r.code}</p>
            <h1 className="text-h2 break-words">{r.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipStatus status={status} />
          {r.priority && <ChipPrioritas prioritas={r.priority as Prioritas} />}
          {d.sla && <ChipSla sla={d.sla} />}
          {r.previous_report_id && <ChipBerulang />}
          {r.needs_action && <ChipTindakan />}
          {r.flagged && <span className="rounded-sm border-2 border-merah px-2 text-kecil-staf font-semibold text-merah">Ditandai filter kata, periksa isinya</span>}
          {r.is_confidential && <span className="rounded-sm bg-abu px-2 text-kecil-staf">Rahasia: tidak tampil publik</span>}
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {(status === "UNDER_REVIEW" || status === "RESOLVED") && sebelum && sesudah && (
            <section aria-labelledby="judul-bukti" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="judul-bukti" className="text-h3">
                  {status === "RESOLVED" ? "Bukti penyelesaian (disetujui)" : "Bukti yang perlu ditinjau"}
                </h2>
                {status === "RESOLVED" && r.resolved_at && <CapSelesai tanggal={r.resolved_at} ukuran="kecil" />}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[sebelum, sesudah].map((f) => (
                  <figure key={f.id} className="flex flex-col gap-1">
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
                      <img src={f.url} alt={LABEL_FOTO[f.jenis]} className="aspect-[4/3] w-full rounded-sm border border-garis object-cover" />
                    </a>
                    <figcaption className="text-kecil-staf font-semibold">{LABEL_FOTO[f.jenis]}</figcaption>
                  </figure>
                ))}
              </div>
              <PenggeserBukti
                sebelum={sebelum.url}
                sesudah={sesudah.url}
                labelSebelum={`Sebelum, ${formatTanggalPendek(r.submitted_at)}`}
                labelSesudah={`Sesudah, ${formatTanggalPendek(buktiTerakhir?.submitted_at ?? r.updated_at)}`}
                alt={r.title}
                className="max-w-2xl"
              />
              {buktiTerakhir && (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                  <dt className="text-aspal-2">Pekerjaan</dt>
                  <dd className="break-words">{buktiTerakhir.description}</dd>
                  <dt className="text-aspal-2">Tanggal kerja</dt>
                  <dd>{formatTanggal(buktiTerakhir.work_date)}</dd>
                  <dt className="text-aspal-2">Dikirim</dt>
                  <dd>{formatWaktu(buktiTerakhir.submitted_at)}</dd>
                </dl>
              )}
            </section>
          )}

          <section aria-labelledby="judul-isi" className="flex flex-col gap-3">
            <h2 id="judul-isi" className="text-h3">
              Isi laporan
            </h2>
            <p className="max-w-baca break-words whitespace-pre-line">{r.description}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="text-aspal-2">Lokasi</dt>
              <dd className="break-words">
                {r.address}, {d.kelurahan}, {d.kecamatan}{" "}
                <a href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="tautan">
                  buka di Google Maps
                </a>
              </dd>
              <dt className="text-aspal-2">Kanal</dt>
              <dd>{LABEL_KANAL[r.channel] ?? r.channel}</dd>
              <dt className="text-aspal-2">Pelapor</dt>
              <dd>
                {r.channel !== "WEB" && r.channel !== "QR" ? (r.intake_name ?? "Tidak dicatat") : (d.pelapor?.full_name ?? "–")}
                {r.is_anonymous && " (minta identitas disembunyikan dari petugas)"}
                {r.reporter_phone && <span className="block">{r.reporter_phone}</span>}
                {r.intake_note && <span className="block text-aspal-2">{r.intake_note}</span>}
              </dd>
              <dt className="text-aspal-2">Masuk</dt>
              <dd>{formatWaktu(r.submitted_at)}</dd>
              {d.instansi && (
                <>
                  <dt className="text-aspal-2">Instansi</dt>
                  <dd>
                    {d.instansi.name}
                    {d.petugas && <span className="block text-aspal-2">Petugas: {d.petugas.full_name}</span>}
                  </dd>
                </>
              )}
              {r.due_at && (
                <>
                  <dt className="text-aspal-2">Tenggat</dt>
                  <dd>{formatWaktu(r.due_at)}</dd>
                </>
              )}
              {r.priority_reasons?.length > 0 && (
                <>
                  <dt className="text-aspal-2">Alasan prioritas</dt>
                  <dd>{(r.priority_reasons as string[]).join(", ")}{r.priority_note ? `. ${r.priority_note}` : ""}</dd>
                </>
              )}
              {d.tujuanTeruskan && (
                <>
                  <dt className="text-aspal-2">Diteruskan ke</dt>
                  <dd>{d.tujuanTeruskan}</dd>
                </>
              )}
              {d.kodeInduk && (
                <>
                  <dt className="text-aspal-2">Laporan induk</dt>
                  <dd className="font-kode">{d.kodeInduk}</dd>
                </>
              )}
              {d.sebelumnya && (
                <>
                  <dt className="text-aspal-2">Laporan sebelumnya</dt>
                  <dd>
                    <span className="font-kode">{d.sebelumnya.code}</span>
                    {d.sebelumnya.resolved_at && `, selesai ${formatTanggal(d.sebelumnya.resolved_at)}`}
                  </dd>
                </>
              )}
              <dt className="text-aspal-2">Warga terdampak</dt>
              <dd>{r.affected_count}</dd>
              <dt className="text-aspal-2">Halaman publik</dt>
              <dd>
                <Link href={`/lacak/${r.code}`} className="tautan">
                  /lacak/{r.code}
                </Link>
              </dd>
            </dl>
          </section>

          {lainnya.length > 0 && (
            <section aria-labelledby="judul-foto" className="flex flex-col gap-3">
              <h2 id="judul-foto" className="text-h3">
                Foto dan dokumentasi
              </h2>
              {r.media_hidden && <p className="font-semibold text-merah">Semua foto laporan ini disembunyikan dari publik.</p>}
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {lainnya.map((f) => (
                  <li key={f.id} className="flex flex-col gap-1">
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase */}
                      <img src={f.thumb} alt={LABEL_FOTO[f.jenis]} loading="lazy" className="aspect-[4/3] w-full rounded-sm border border-garis object-cover" />
                    </a>
                    <span className="text-kecil-staf text-aspal-2">
                      {LABEL_FOTO[f.jenis]}
                      {f.tersembunyi && ", disembunyikan"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="judul-riwayat">
            <h2 id="judul-riwayat" className="mb-4 text-h3">
              Riwayat
            </h2>
            <LogResi kejadian={d.riwayat} />
          </section>
        </div>

        <aside aria-label="Tindakan" className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <p className="text-kecil-staf text-aspal-2">Status saat ini: {LABEL_STATUS[status]}</p>
          {peran === "ADMIN" && opsi && (
            <PanelUbahLaporan
              opsi={opsi}
              d={{
                id: r.id,
                status,
                judul: r.title,
                deskripsi: r.description,
                alamat: r.address,
                kategoriId: r.category_id,
                instansiId: r.agency_id,
                prioritas: (r.priority as Prioritas) ?? null,
                alasan: (r.priority_reasons as string[]) ?? [],
                catatanPrioritas: r.priority_note,
                tenggat: r.due_at,
                rahasia: Boolean(r.is_confidential),
                terhapus: Boolean(r.deleted_at),
              }}
            />
          )}
          {!r.deleted_at && (
            <PanelAksiStaf
            id={r.id}
            status={status}
            peran={peran}
            opsi={opsi}
            kategoriId={r.category_id}
            instansiId={r.agency_id}
            saranTeruskan={d.kategori?.suggest_forward_agency_id ?? null}
            fotoTersembunyi={Boolean(r.media_hidden)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
