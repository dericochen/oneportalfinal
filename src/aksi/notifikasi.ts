"use server";

import { revalidatePath } from "next/cache";
import { wajibMasuk } from "@/lib/auth";
import { buatKlienServer } from "@/lib/supabase/server";

/** Tandai semua notifikasi milik pengguna sebagai dibaca (RLS: hanya miliknya). */
export async function tandaiSemuaDibaca() {
  await wajibMasuk("/notifikasi");
  const supabase = await buatKlienServer();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}
