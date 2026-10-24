/**
 * Terjemahan error ke Bahasa Indonesia yang spesifik. Error dari fungsi
 * transisi database sudah berbahasa Indonesia (SQLSTATE P0001) dan diteruskan
 * apa adanya; error lain dipetakan atau diganti pesan umum yang jujur.
 */

type ErrorLike = { message?: string; code?: string; status?: number; details?: string | null } | null | undefined;

const PESAN_AUTH: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Email atau kata sandi salah. Periksa lagi, lalu coba masuk."],
  [/email not confirmed/i, "Email belum dikonfirmasi. Buka email Anda dan klik tautan konfirmasi."],
  [/user already registered|already been registered/i, "Email ini sudah terdaftar. Silakan masuk."],
  [/password should be at least|weak.?password/i, "Kata sandi terlalu lemah. Pakai minimal 8 karakter."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi."],
  [/signups? not allowed|signup is disabled/i, "Pendaftaran akun sedang ditutup. Gunakan akun demo di halaman masuk."],
  [/unable to validate email|invalid email/i, "Format email tidak valid. Contoh: nama@contoh.com."],
  [/fetch failed|network|ECONNREFUSED|ENOTFOUND/i, "Server tidak dapat dihubungi. Periksa koneksi Anda, lalu coba lagi."],
];

export function pesanGalat(e: ErrorLike, cadangan = "Permintaan belum berhasil diproses. Coba lagi dalam beberapa saat."): string {
  if (!e) return cadangan;
  // Error bisnis dari database (fungsi transisi, trigger).
  if (e.code === "P0001" && e.message) return e.message;
  if (e.code === "42501") return "Anda tidak memiliki akses untuk tindakan ini.";
  const pesan = e.message ?? "";
  for (const [pola, terjemahan] of PESAN_AUTH) {
    if (pola.test(pesan) || pola.test(e.code ?? "")) return terjemahan;
  }
  return cadangan;
}

/** Kode mesin dari DETAIL error fungsi transisi (mis. "STATUS_TIDAK_SAH"). */
export function kodeGalat(e: ErrorLike): string | null {
  return e?.code === "P0001" ? (e.details ?? null) : null;
}
