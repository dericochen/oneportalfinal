/**
 * Seed data master + akun demo (deterministik dan idempoten).
 *
 *   npm run db:seed
 *
 * 1. Kecamatan, kelurahan, batas kota, instansi, kategori, matriks SLA,
 *    kategori layanan, pengaturan situs, daftar kata filter.
 * 2. Empat akun demo (dibuat lewat Supabase Auth Admin API, email langsung
 *    terkonfirmasi) lalu peran dan instansinya ditetapkan.
 *
 * SQL dijalankan lewat SUPABASE_DB_URL bila ada, atau lewat Supabase CLI
 * (`supabase login` + `supabase link`) bila tidak.
 * Data laporan realistis (±500 laporan) menyusul di Fase 6.
 */
import { AKUN_DEMO, KATA_SANDI_DEMO, buatSqlMaster, buatSqlPeranDemo } from "./lib/master.mts";
import { jalankanSql, klienAdmin } from "./lib/env.mts";

const supabase = klienAdmin();

try {
  console.log("Data master…");
  await jalankanSql(`begin;\n${buatSqlMaster()}\ncommit;`);

  console.log("Akun demo…");
  const { data: daftar, error: errList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (errList) throw errList;
  for (const akun of AKUN_DEMO) {
    const ada = daftar.users.find((u) => u.email === akun.email);
    if (ada) {
      // Pastikan kata sandi demo tetap sama (mis. bila juri sempat mengubahnya).
      const { error } = await supabase.auth.admin.updateUserById(ada.id, { password: KATA_SANDI_DEMO, email_confirm: true });
      if (error) throw error;
      console.log(`  ada      ${akun.email}`);
    } else {
      const { error } = await supabase.auth.admin.createUser({
        email: akun.email,
        password: KATA_SANDI_DEMO,
        email_confirm: true,
        user_metadata: { full_name: akun.full_name },
      });
      if (error) throw error;
      console.log(`  dibuat   ${akun.email}`);
    }
  }

  const ringkas = await jalankanSql(`${buatSqlPeranDemo()}
select
  (select count(*)::int from public.districts) kecamatan,
  (select count(*)::int from public.villages) kelurahan,
  (select count(*)::int from public.agencies) instansi,
  (select count(*)::int from public.report_categories) kategori,
  (select count(*)::int from public.sla_policies) sla,
  (select count(*)::int from public.profiles where is_demo) akun_demo,
  (select string_agg(p.role::text, ',' order by p.role) from public.profiles p where is_demo) peran_demo;`);
  console.log("\nSelesai:", ringkas[0] ?? "(ringkasan tidak tersedia)");
} catch (e) {
  console.error("\nSeed gagal:", (e as Error).message);
  process.exitCode = 1;
}
