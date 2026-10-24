-- ONE PORTAL · Migrasi 4: Row Level Security, hak kolom, Storage
--
-- Penegakan berlapis: route guard (proxy) -> pengecekan di server action ->
-- RLS di sini. Tulis ke tabel laporan hanya lewat transition_report().

-- ---------------------------------------------------------------------------
-- RLS menyala di semua tabel
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Data master & konten publik: baca terbuka (yang aktif), tulis admin
-- ---------------------------------------------------------------------------
create policy "publik membaca batas kota" on public.city_boundaries for select using (true);

create policy "publik membaca kecamatan aktif" on public.districts for select
  using (deleted_at is null or public.is_staff());
create policy "admin mengelola kecamatan" on public.districts for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca kelurahan aktif" on public.villages for select
  using (deleted_at is null or public.is_staff());
create policy "admin mengelola kelurahan" on public.villages for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca instansi" on public.agencies for select
  using (deleted_at is null or public.is_staff());
create policy "admin mengelola instansi" on public.agencies for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca kategori laporan" on public.report_categories for select
  using (deleted_at is null or public.is_staff());
create policy "admin mengelola kategori laporan" on public.report_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca kebijakan SLA" on public.sla_policies for select using (true);
create policy "admin mengelola kebijakan SLA" on public.sla_policies for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca kategori layanan" on public.service_categories for select
  using ((deleted_at is null and is_active) or public.is_staff());
create policy "admin mengelola kategori layanan" on public.service_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca layanan terbit" on public.services for select
  using ((status = 'PUBLISHED' and deleted_at is null) or public.is_staff());
create policy "admin mengelola layanan" on public.services for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca FAQ terbit" on public.faqs for select
  using ((is_published and deleted_at is null) or public.is_staff());
create policy "admin mengelola FAQ" on public.faqs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca berita terbit" on public.news for select
  using ((status = 'PUBLISHED' and deleted_at is null and published_at <= now()) or public.is_staff());
create policy "admin mengelola berita" on public.news for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca banner aktif" on public.banners for select
  using (
    (is_active and deleted_at is null and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.is_staff()
  );
create policy "admin mengelola banner" on public.banners for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca fasilitas aktif" on public.facilities for select
  using ((is_active and deleted_at is null) or public.is_staff());
create policy "admin mengelola fasilitas" on public.facilities for all
  using (public.is_admin()) with check (public.is_admin());

create policy "publik membaca pengaturan situs" on public.site_settings for select using (true);
create policy "admin mengelola pengaturan situs" on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

create policy "staf membaca area case" on public.area_cases for select using (public.is_staff() or public.app_role() = 'OFFICER');
create policy "admin mengelola area case" on public.area_cases for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admin membaca daftar kata" on public.blocked_words for select using (public.is_admin());
create policy "admin mengelola daftar kata" on public.blocked_words for all
  using (public.is_admin()) with check (public.is_admin());

-- report_code_counters: tanpa kebijakan = tertutup untuk klien.

-- ---------------------------------------------------------------------------
-- Profil
-- ---------------------------------------------------------------------------
create policy "pengguna membaca profil sendiri" on public.profiles for select
  using (id = auth.uid());
create policy "staf membaca semua profil" on public.profiles for select
  using (public.is_staff());
-- Petugas melihat kontak pelapor tugasnya, kecuali laporan anonim.
create policy "petugas membaca pelapor tugasnya" on public.profiles for select
  using (exists (
    select 1 from public.reports r
    where r.reporter_id = profiles.id and r.assignee_id = auth.uid() and not r.is_anonymous
  ));
-- Petugas melihat rekan satu instansi (mis. daftar penugasan).
create policy "petugas membaca rekan instansi" on public.profiles for select
  using (public.app_role() = 'OFFICER' and agency_id = public.app_agency());

create policy "pengguna mengubah profil sendiri" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin mengubah profil" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- Hak kolom: pengguna biasa hanya boleh mengubah nama dan nomor HP.
-- Peran, instansi, dan status aktif diubah admin lewat server action (service role).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Laporan
-- ---------------------------------------------------------------------------
-- Tidak ada akses publik langsung ke tabel laporan: halaman publik memakai
-- fungsi/view khusus yang hanya mengembalikan kolom non-sensitif.
create policy "pelapor membaca laporannya" on public.reports for select
  using (reporter_id = auth.uid());
create policy "pendukung membaca laporan yang didukung" on public.reports for select
  using (exists (select 1 from public.report_supports s where s.report_id = reports.id and s.user_id = auth.uid()));
create policy "petugas membaca tugasnya" on public.reports for select
  using (assignee_id = auth.uid() and public.app_role() = 'OFFICER');
create policy "staf membaca semua laporan" on public.reports for select
  using (public.is_staff());
revoke insert, update, delete on public.reports from anon, authenticated;

-- Media: mengikuti hak baca laporan; foto tersembunyi hanya untuk staf/pengunggah.
create policy "media mengikuti laporan" on public.report_media for select
  using (
    exists (select 1 from public.reports r where r.id = report_media.report_id)
    and (not is_hidden or public.is_staff() or uploaded_by = auth.uid())
    and (
      kind in ('INITIAL', 'PROGRESS')
      or public.is_staff()
      or uploaded_by = auth.uid()
      -- Bukti sebelum-sesudah terbuka bagi pelapor setelah disetujui admin.
      or exists (select 1 from public.completion_proofs p where p.id = report_media.proof_id and p.status = 'APPROVED')
    )
  );
revoke insert, update, delete on public.report_media from anon, authenticated;

-- Riwayat: catatan internal hanya untuk staf dan petugas yang ditugaskan.
create policy "riwayat mengikuti laporan" on public.report_events for select
  using (
    exists (select 1 from public.reports r where r.id = report_events.report_id)
    and (
      not is_internal
      or public.is_staff()
      or exists (select 1 from public.reports r where r.id = report_events.report_id and r.assignee_id = auth.uid())
    )
  );
revoke insert, update, delete on public.report_events from anon, authenticated;

create policy "bukti mengikuti laporan" on public.completion_proofs for select
  using (
    exists (select 1 from public.reports r where r.id = completion_proofs.report_id)
    and (status = 'APPROVED' or public.is_staff() or officer_id = auth.uid())
  );
revoke insert, update, delete on public.completion_proofs from anon, authenticated;

create policy "warga membaca dukungannya" on public.report_supports for select
  using (user_id = auth.uid() or public.is_staff());
revoke insert, update, delete on public.report_supports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notifikasi & audit
-- ---------------------------------------------------------------------------
create policy "pengguna membaca notifikasinya" on public.notifications for select
  using (user_id = auth.uid());
create policy "pengguna menandai notifikasinya" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "staf membaca log aktivitas" on public.audit_logs for select using (public.is_staff());
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- laporan: privat. Foto laporan & bukti; diunggah langsung dari browser
--          memakai signed upload URL ke folder {user_id}/.
-- konten : publik. Gambar berita, banner, layanan (diunggah admin).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('laporan', 'laporan', false, 5242880, array['image/jpeg', 'image/webp', 'image/png', 'application/pdf']),
  ('konten', 'konten', true, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "unggah foto ke folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'laporan' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "baca foto sendiri atau staf" on storage.objects for select to authenticated
  using (bucket_id = 'laporan' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy "admin mengunggah konten" on storage.objects for insert to authenticated
  with check (bucket_id = 'konten' and public.is_admin());
create policy "admin mengubah konten" on storage.objects for update to authenticated
  using (bucket_id = 'konten' and public.is_admin());
create policy "admin menghapus konten" on storage.objects for delete to authenticated
  using (bucket_id = 'konten' and public.is_admin());
