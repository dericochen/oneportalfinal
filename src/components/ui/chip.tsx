import {
  ArrowBendUpRight,
  ArrowFatUp,
  CheckCircle,
  Clock,
  Eye,
  GitMerge,
  HandPointing,
  HourglassHigh,
  Repeat,
  SealCheck,
  Siren,
  Tray,
  UserCirclePlus,
  WarningCircle,
  Wrench,
  XCircle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import {
  LABEL_PRIORITAS,
  LABEL_SLA,
  LABEL_STATUS,
  type Prioritas,
  type StatusLaporan,
  type StatusSla,
} from "@/lib/domain/laporan";

/*
 * Chip: ikon berwarna + teks aspal di atas abu. Latar penuh hanya untuk
 * "Darurat" (merah) dan "Perlu tindakan Anda" (kuning). Lihat DESIGN.md bagian 2.
 */

type Nada = "netral" | "biru" | "hijau" | "merah" | "oranye";

const warnaIkon: Record<Nada, string> = {
  netral: "text-aspal-2",
  biru: "text-biru",
  hijau: "text-hijau",
  merah: "text-merah",
  oranye: "text-oranye",
};

type PropsChip = {
  ikon: Icon;
  nada?: Nada;
  children: ReactNode;
  tebal?: boolean;
  penuh?: "merah" | "kuning";
  className?: string;
};

export function Chip({ ikon: Ikon, nada = "netral", children, tebal, penuh, className }: PropsChip) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-0.5 text-kecil leading-tight whitespace-nowrap",
        penuh === "merah" && "bg-merah font-semibold text-putih",
        penuh === "kuning" && "border border-aspal bg-kuning font-semibold text-aspal",
        !penuh && "bg-abu text-aspal",
        (tebal || penuh) && "font-semibold",
        className,
      )}
    >
      <Ikon aria-hidden weight={penuh ? "fill" : "bold"} className={cx("size-4 shrink-0", !penuh && warnaIkon[nada])} />
      {children}
    </span>
  );
}

const CHIP_STATUS: Record<StatusLaporan, { ikon: Icon; nada: Nada }> = {
  SUBMITTED: { ikon: Tray, nada: "netral" },
  VERIFIED: { ikon: SealCheck, nada: "netral" },
  ASSIGNED: { ikon: UserCirclePlus, nada: "netral" },
  IN_PROGRESS: { ikon: Wrench, nada: "biru" },
  UNDER_REVIEW: { ikon: Eye, nada: "biru" },
  RESOLVED: { ikon: CheckCircle, nada: "hijau" },
  REJECTED: { ikon: XCircle, nada: "merah" },
  FORWARDED: { ikon: ArrowBendUpRight, nada: "netral" },
  MERGED: { ikon: GitMerge, nada: "netral" },
};

export const ikonStatus = (s: StatusLaporan) => CHIP_STATUS[s].ikon;

export function ChipStatus({ status, className }: { status: StatusLaporan; className?: string }) {
  const c = CHIP_STATUS[status];
  return (
    <Chip ikon={c.ikon} nada={c.nada} className={className}>
      {LABEL_STATUS[status]}
    </Chip>
  );
}

/** Darurat = latar merah penuh; Tinggi = ikon oranye; Sedang & Rendah netral tanpa ikon tambahan. */
export function ChipPrioritas({ prioritas, className }: { prioritas: Prioritas; className?: string }) {
  const label = `Prioritas ${LABEL_PRIORITAS[prioritas].toLowerCase()}`;
  if (prioritas === "EMERGENCY")
    return (
      <Chip ikon={Siren} penuh="merah" className={className}>
        Darurat
      </Chip>
    );
  if (prioritas === "HIGH")
    return (
      <Chip ikon={ArrowFatUp} nada="oranye" tebal className={className}>
        {label}
      </Chip>
    );
  return (
    <span className={cx("inline-flex min-h-7 items-center rounded-md bg-abu px-2 py-0.5 text-kecil whitespace-nowrap", className)}>
      {label}
    </span>
  );
}

const CHIP_SLA: Record<StatusSla, { ikon: Icon; nada: Nada; tebal?: boolean }> = {
  TEPAT_WAKTU: { ikon: Clock, nada: "netral" },
  HAMPIR_JATUH_TEMPO: { ikon: HourglassHigh, nada: "netral", tebal: true },
  TERLAMBAT: { ikon: WarningCircle, nada: "merah", tebal: true },
  SELESAI_TEPAT_WAKTU: { ikon: CheckCircle, nada: "hijau" },
  SELESAI_TERLAMBAT: { ikon: WarningCircle, nada: "merah" },
};

export function ChipSla({ sla, keterangan, className }: { sla: StatusSla; keterangan?: string; className?: string }) {
  const c = CHIP_SLA[sla];
  return (
    <Chip ikon={c.ikon} nada={c.nada} tebal={c.tebal} className={className}>
      {LABEL_SLA[sla]}
      {keterangan && <span className="font-normal text-aspal-2">({keterangan})</span>}
    </Chip>
  );
}

export function ChipBerulang({ className }: { className?: string }) {
  return (
    <Chip ikon={Repeat} nada="oranye" tebal className={className}>
      Laporan berulang
    </Chip>
  );
}

/** Penanda kuning bagi staf, mis. bukti dikembalikan ke petugas. */
export function ChipTindakan({ className }: { className?: string }) {
  return (
    <Chip ikon={HandPointing} penuh="kuning" className={className}>
      Perlu tindakan Anda
    </Chip>
  );
}
