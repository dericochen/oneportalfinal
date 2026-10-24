/**
 * Akun demo untuk juri (Mode Juri). Kata sandinya SENGAJA publik karena tampil
 * di halaman masuk. Akun ini dilindungi database: tidak bisa dihapus,
 * dinonaktifkan, atau diubah perannya. Jangan pakai pola ini untuk akun nyata.
 */
export const KATA_SANDI_DEMO = "MedanTuntas2026";

export const AKUN_DEMO = [
  {
    kunci: "warga",
    email: "demo.warga@oneportal.test",
    full_name: "Warga Demo",
    role: "CITIZEN",
    agency: null,
    label: "Warga",
    keterangan: "Membuat dan melacak laporan",
  },
  {
    kunci: "admin",
    email: "demo.admin@oneportal.test",
    full_name: "Admin Demo",
    role: "ADMIN",
    agency: null,
    label: "Admin",
    keterangan: "Verifikasi, tugaskan, setujui bukti",
  },
  {
    kunci: "petugas",
    email: "demo.petugas@oneportal.test",
    full_name: "Petugas Demo",
    role: "OFFICER",
    agency: "dinas-sdabmbk",
    label: "Petugas lapangan",
    keterangan: "Dinas SDABMBK, mengerjakan tugas",
  },
  {
    kunci: "supervisor",
    email: "demo.supervisor@oneportal.test",
    full_name: "Supervisor Demo",
    role: "SUPERVISOR",
    agency: null,
    label: "Supervisor",
    keterangan: "Memantau kinerja dan eskalasi",
  },
] as const;

export type KunciDemo = (typeof AKUN_DEMO)[number]["kunci"];
