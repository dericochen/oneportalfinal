/** Gabungkan nama kelas; nilai falsy diabaikan. */
export function cx(...kelas: Array<string | false | null | undefined>): string {
  return kelas.filter(Boolean).join(" ");
}
