import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  Buildings,
  ChartBar,
  ClipboardText,
  Eye,
  Gauge,
  Gear,
  Images,
  ListChecks,
  MagnifyingGlass,
  MapTrifold,
  Megaphone,
  Trash,
  Tray,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react/ssr";

/**
 * Konfigurasi navigasi. Fitur yang belum selesai disembunyikan (tersedia:
 * false), jadi tidak ada tautan mati. Setiap fase menyalakan butirnya sendiri.
 */
export type ButirNav = {
  href: string;
  label: string;
  ikon: Icon;
  tersedia: boolean;
  /** Tab "Lapor" berpelat kuning di tengah bottom nav. */
  lapor?: boolean;
};

export const NAV_PUBLIK: ButirNav[] = [
  { href: "/layanan", label: "Layanan", ikon: Buildings, tersedia: false }, // Fase 1
  { href: "/peta", label: "Peta", ikon: MapTrifold, tersedia: true },
  { href: "/lapor", label: "Lapor", ikon: Megaphone, tersedia: true, lapor: true },
  { href: "/lacak", label: "Lacak", ikon: MagnifyingGlass, tersedia: true },
  { href: "/statistik", label: "Statistik", ikon: ChartBar, tersedia: false }, // Fase 7
];

export type GrupMenuStaf = { judul: string; butir: Array<ButirNav & { hitung?: number }> };

export const MENU_ADMIN: GrupMenuStaf[] = [
  { judul: "Ringkasan", butir: [{ href: "/admin", label: "Command center", ikon: Gauge, tersedia: true }] },
  {
    judul: "Antrean",
    butir: [
      { href: "/admin/verifikasi", label: "Verifikasi", ikon: Tray, tersedia: true },
      { href: "/admin/tinjau-bukti", label: "Tinjau bukti", ikon: Eye, tersedia: true },
    ],
  },
  {
    judul: "Laporan",
    butir: [
      { href: "/admin/laporan", label: "Semua laporan", ikon: ClipboardText, tersedia: true },
      { href: "/admin/laporan/baru", label: "Catat laporan baru", ikon: Megaphone, tersedia: true },
    ],
  },
  { judul: "Konten", butir: [{ href: "/admin/slide", label: "Slide beranda", ikon: Images, tersedia: true }] },
  {
    judul: "Data master",
    butir: [
      { href: "/admin/pengaturan", label: "Pengaturan, SLA, instansi", ikon: Gear, tersedia: true },
      { href: "/admin/laporan?antrean=terhapus", label: "Laporan terhapus", ikon: Trash, tersedia: true },
    ],
  },
  { judul: "Akun", butir: [{ href: "/notifikasi", label: "Notifikasi", ikon: Bell, tersedia: true }] },
];

/** Sisipkan jumlah antrean ke menu admin. */
export function menuAdminDenganHitung(h: { verifikasi: number; bukti: number }): GrupMenuStaf[] {
  return MENU_ADMIN.map((g) => ({
    ...g,
    butir: g.butir.map((b) =>
      b.href === "/admin/verifikasi" ? { ...b, hitung: h.verifikasi } : b.href === "/admin/tinjau-bukti" ? { ...b, hitung: h.bukti } : b,
    ),
  }));
}

export const MENU_SUPERVISOR: GrupMenuStaf[] = [
  { judul: "Ringkasan", butir: [{ href: "/supervisor", label: "Command center", ikon: Gauge, tersedia: true }] },
  {
    judul: "Pemantauan",
    butir: [
      { href: "/supervisor/laporan", label: "Semua laporan", ikon: ClipboardText, tersedia: true },
      { href: "/supervisor/kinerja", label: "Kinerja instansi", ikon: ChartBar, tersedia: false }, // ada di command center
    ],
  },
  { judul: "Pengguna", butir: [{ href: "/supervisor/akun", label: "Kelola akun", ikon: UsersThree, tersedia: true }] },
  { judul: "Akun", butir: [{ href: "/notifikasi", label: "Notifikasi", ikon: Bell, tersedia: true }] },
];

export const NAV_PETUGAS: ButirNav[] = [
  { href: "/petugas", label: "Tugas", ikon: ListChecks, tersedia: true },
  { href: "/notifikasi", label: "Notifikasi", ikon: Bell, tersedia: true },
  { href: "/petugas/akun", label: "Akun", ikon: UserCircle, tersedia: false },
];

export const tersediaSaja = <T extends { tersedia: boolean }>(d: T[]) => d.filter((b) => b.tersedia);
