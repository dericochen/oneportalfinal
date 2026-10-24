-- ONE PORTAL · Migrasi 2: fungsi bantu dan trigger
-- Fungsi internal disimpan di skema app_private (tidak diekspos PostgREST).

create schema if not exists app_private;
revoke all on schema app_private from public;

-- ---------------------------------------------------------------------------
-- Fungsi bantu yang dipakai RLS (aman diekspos: hanya membaca peran sendiri)
-- ---------------------------------------------------------------------------
create or replace function public.app_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active and p.deleted_at is null
$$;

create or replace function public.app_agency()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.agency_id from public.profiles p
  where p.id = auth.uid() and p.is_active and p.deleted_at is null
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
set search_path = ''
as $$ select coalesce(public.app_role() = 'ADMIN', false) $$;

-- Staf pemantau: admin dan supervisor (melihat semua laporan).
create or replace function public.is_staff()
returns boolean
language sql stable
set search_path = ''
as $$ select coalesce(public.app_role() in ('ADMIN', 'SUPERVISOR'), false) $$;

-- ---------------------------------------------------------------------------
-- Format & label (Bahasa Indonesia, WIB)
-- ---------------------------------------------------------------------------
create or replace function public.fmt_wib(ts timestamptz)
returns text
language sql stable
set search_path = ''
as $$
  select extract(day from l)::int || ' '
    || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from l)::int]
    || ' ' || extract(year from l)::int || ', ' || to_char(l, 'HH24.MI') || ' WIB'
  from (select ts at time zone 'Asia/Jakarta' as l) s
$$;

create or replace function public.status_label(s public.report_status)
returns text
language sql immutable
set search_path = ''
as $$
  select case s
    when 'SUBMITTED' then 'Diterima'
    when 'VERIFIED' then 'Diverifikasi'
    when 'ASSIGNED' then 'Ditugaskan'
    when 'IN_PROGRESS' then 'Dikerjakan'
    when 'UNDER_REVIEW' then 'Peninjauan bukti'
    when 'RESOLVED' then 'Selesai'
    when 'REJECTED' then 'Ditolak'
    when 'FORWARDED' then 'Diteruskan'
    when 'MERGED' then 'Digabungkan'
  end
$$;

create or replace function public.priority_label(p public.report_priority)
returns text
language sql immutable
set search_path = ''
as $$
  select case p when 'EMERGENCY' then 'Darurat' when 'HIGH' then 'Tinggi' when 'MEDIUM' then 'Sedang' when 'LOW' then 'Rendah' end
$$;

-- Status SLA dihitung saat dibaca. Hampir jatuh tempo = sisa <= 25% durasi.
create or replace function public.sla_status(
  p_status public.report_status,
  p_verified_at timestamptz,
  p_due_at timestamptz,
  p_sla_stopped_at timestamptz,
  p_proof_submitted_at timestamptz default null
)
returns text
language sql stable
set search_path = ''
as $$
  select case
    when p_due_at is null or p_verified_at is null then null
    when p_status in ('REJECTED', 'FORWARDED', 'MERGED') then null
    when p_status = 'RESOLVED' then
      case when coalesce(p_sla_stopped_at, p_due_at) <= p_due_at then 'SELESAI_TEPAT_WAKTU' else 'SELESAI_TERLAMBAT' end
    -- Bukti dikirim sebelum tenggat: jam berhenti sementara selama ditinjau.
    when p_status = 'UNDER_REVIEW' and p_proof_submitted_at is not null and p_proof_submitted_at <= p_due_at then 'TEPAT_WAKTU'
    when now() > p_due_at then 'TERLAMBAT'
    when (extract(epoch from p_due_at - now()) / greatest(1, extract(epoch from p_due_at - p_verified_at))) <= 0.25 then 'HAMPIR_JATUH_TEMPO'
    else 'TEPAT_WAKTU'
  end
$$;

-- Sarankan kecamatan dari titik peta (dipakai form lapor).
create or replace function public.suggest_district(p_lat double precision, p_lng double precision)
returns table (district_code text, district_name text, inside_city boolean)
language sql stable security definer
set search_path = public, extensions
as $$
  with titik as (select ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) as g)
  select d.code, d.name,
    coalesce((select ST_Covers(c.boundary, t.g) from public.city_boundaries c), true)
  from titik t
  left join public.districts d
    on d.deleted_at is null and d.boundary is not null and ST_Covers(d.boundary, t.g)
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Trigger umum
-- ---------------------------------------------------------------------------
create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'districts', 'villages', 'agencies', 'profiles', 'report_categories', 'sla_policies',
    'service_categories', 'services', 'faqs', 'news', 'banners', 'facilities', 'site_settings',
    'area_cases', 'reports', 'city_boundaries'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function app_private.set_updated_at()', t);
  end loop;
end $$;

-- Titik geografi dari lat/lng.
create or replace function app_private.set_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$;

create trigger set_location before insert or update of lat, lng on public.facilities
  for each row execute function app_private.set_location();
create trigger set_location before insert or update of lat, lng on public.reports
  for each row execute function app_private.set_location();

-- Kode laporan OP-{tahun WIB}-{5 digit}, dibuat database secara atomik.
create or replace function app_private.assign_report_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_year int := extract(year from (now() at time zone 'Asia/Jakarta'))::int;
  v_n int;
begin
  if new.code is null then
    insert into public.report_code_counters as c (year, last_number) values (v_year, 1)
    on conflict (year) do update set last_number = c.last_number + 1
    returning last_number into v_n;
    new.code := 'OP-' || v_year || '-' || lpad(v_n::text, 5, '0');
  else
    -- Kode eksplisit (seed): pastikan penghitung tidak tertinggal.
    v_year := split_part(new.code, '-', 2)::int;
    v_n := split_part(new.code, '-', 3)::int;
    insert into public.report_code_counters as c (year, last_number) values (v_year, v_n)
    on conflict (year) do update set last_number = greatest(c.last_number, excluded.last_number);
  end if;
  return new;
end;
$$;

create trigger assign_report_code before insert on public.reports
  for each row execute function app_private.assign_report_code();

-- Laporan hanya boleh ditulis lewat fungsi transisi terpusat (atau seed yang
-- secara eksplisit menyalakan penanda yang sama dalam transaksinya).
create or replace function app_private.guard_report_write()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('oneportal.transition', true), '') <> 'on' then
    raise exception 'Perubahan laporan hanya dapat dilakukan lewat fungsi transisi.'
      using errcode = 'P0001', detail = 'TRANSISI_WAJIB';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_report_write before insert or update on public.reports
  for each row execute function app_private.guard_report_write();

-- Riwayat tidak dapat diubah/dihapus (audit trail). Penghapusan hanya
-- diizinkan oleh perintah reset data demo yang menyalakan penanda reset.
create or replace function app_private.events_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Riwayat laporan tidak dapat diubah.' using errcode = 'P0001', detail = 'RIWAYAT_TETAP';
  end if;
  if coalesce(current_setting('oneportal.reset', true), '') <> 'on' then
    raise exception 'Riwayat laporan tidak dapat dihapus.' using errcode = 'P0001', detail = 'RIWAYAT_TETAP';
  end if;
  return old;
end;
$$;

create trigger events_immutable before update or delete on public.report_events
  for each row execute function app_private.events_immutable();
create trigger audit_immutable before update or delete on public.audit_logs
  for each row execute function app_private.events_immutable();

-- Audit log CMS: siapa, kapan, apa, nilai sebelum-sesudah.
create or replace function app_private.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_action text := tg_op;
  v_id text;
begin
  if tg_op = 'UPDATE' then
    if v_old - 'updated_at' = v_new - 'updated_at' then
      return new;
    end if;
    if (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then
      v_action := 'SOFT_DELETE';
    elsif (v_old ->> 'deleted_at') is not null and (v_new ->> 'deleted_at') is null then
      v_action := 'RESTORE';
    end if;
  end if;
  v_id := coalesce(v_new, v_old) ->> 'id';
  v_id := coalesce(v_id, coalesce(v_new, v_old) ->> 'code', coalesce(v_new, v_old) ->> 'key', coalesce(v_new, v_old) ->> 'slug');
  insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
  values (tg_table_name, v_id, v_action, auth.uid(), v_old, v_new);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'districts', 'villages', 'agencies', 'profiles', 'report_categories', 'sla_policies',
    'service_categories', 'services', 'faqs', 'news', 'banners', 'facilities', 'site_settings', 'area_cases'
  ] loop
    execute format(
      'create trigger write_audit after insert or update or delete on public.%I for each row execute function app_private.write_audit()', t);
  end loop;
end $$;

-- Data yang masih dipakai tidak bisa dihapus (soft delete), cukup dinonaktifkan.
create or replace function app_private.prevent_delete_in_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int := 0;
  v_what text := 'laporan';
begin
  if not (old.deleted_at is null and new.deleted_at is not null) then
    return new;
  end if;
  case tg_table_name
    when 'report_categories' then
      select count(*) into v_n from public.reports where category_id = old.id and deleted_at is null;
    when 'agencies' then
      select count(*) into v_n from public.reports
        where (agency_id = old.id or forward_agency_id = old.id) and deleted_at is null;
      if v_n = 0 then
        select count(*) into v_n from public.profiles where agency_id = old.id and deleted_at is null;
        v_what := 'akun petugas';
      end if;
    when 'service_categories' then
      select count(*) into v_n from public.services where category_id = old.id and deleted_at is null;
      v_what := 'layanan';
    when 'districts' then
      select count(*) into v_n from public.reports where district_code = old.code and deleted_at is null;
    when 'villages' then
      select count(*) into v_n from public.reports where village_code = old.code and deleted_at is null;
    else
      return new;
  end case;
  if v_n > 0 then
    raise exception 'Dipakai oleh % %. Nonaktifkan saja.', v_n, v_what
      using errcode = 'P0001', detail = 'DATA_DIPAKAI';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['report_categories', 'agencies', 'service_categories', 'districts', 'villages'] loop
    execute format(
      'create trigger prevent_delete_in_use before update of deleted_at on public.%I for each row execute function app_private.prevent_delete_in_use()', t);
  end loop;
end $$;

-- Akun demo dilindungi: tidak bisa dihapus, dinonaktifkan, atau diubah perannya.
create or replace function app_private.protect_profiles()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_demo and coalesce(current_setting('oneportal.reset', true), '') <> 'on' then
      raise exception 'Akun demo tidak dapat dihapus.' using errcode = 'P0001', detail = 'AKUN_DEMO';
    end if;
    return old;
  end if;
  if old.is_demo and (
    new.role <> old.role or not new.is_active or new.deleted_at is not null
    or new.agency_id is distinct from old.agency_id or not new.is_demo
  ) then
    raise exception 'Akun demo tidak dapat dinonaktifkan, dihapus, atau diubah perannya.'
      using errcode = 'P0001', detail = 'AKUN_DEMO';
  end if;
  return new;
end;
$$;

create trigger protect_profiles before update or delete on public.profiles
  for each row execute function app_private.protect_profiles();

-- Profil dibuat otomatis saat pendaftaran. Peran SELALU warga; peran staf
-- hanya diberikan admin (atau seed), tidak pernah dari metadata pendaftaran.
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'CITIZEN'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Bantuan fungsi transisi
-- ---------------------------------------------------------------------------
create or replace function app_private.raise_app(p_message text, p_code text default 'TIDAK_SAH')
returns void
language plpgsql
as $$
begin
  raise exception '%', p_message using errcode = 'P0001', detail = p_code;
end;
$$;

-- Label aktor di riwayat: peran/instansi, bukan nama pribadi.
create or replace function app_private.actor_label(p_actor public.profiles, p_reporter uuid)
returns text
language sql stable
set search_path = ''
as $$
  select case p_actor.role
    when 'CITIZEN' then case when p_actor.id = p_reporter then 'Pelapor' else 'Warga' end
    when 'ADMIN' then 'Admin'
    when 'SUPERVISOR' then 'Supervisor'
    when 'OFFICER' then 'Petugas ' || coalesce((select a.short_name from public.agencies a where a.id = p_actor.agency_id), 'lapangan')
  end
$$;

-- Penerima kabar laporan: pelapor, pendukung, serta pelapor & pendukung laporan
-- yang digabungkan ke laporan ini.
create or replace function app_private.report_followers(p_report_id uuid)
returns setof uuid
language sql stable
set search_path = ''
as $$
  with terkait as (
    select id, reporter_id from public.reports where id = p_report_id
    union
    select id, reporter_id from public.reports where parent_id = p_report_id and status = 'MERGED'
  )
  select reporter_id from terkait
  union
  select s.user_id from public.report_supports s join terkait t on t.id = s.report_id
$$;

create or replace function app_private.notify(
  p_user uuid, p_report uuid, p_type text, p_title text, p_body text, p_link text
)
returns void
language sql
set search_path = ''
as $$
  insert into public.notifications (user_id, report_id, type, title, body, link)
  select p_user, p_report, p_type, p_title, p_body, p_link
  where p_user is not null
$$;

create or replace function app_private.notify_followers(
  p_report public.reports, p_type text, p_title text, p_body text, p_except uuid, p_link text default null
)
returns void
language sql
set search_path = ''
as $$
  insert into public.notifications (user_id, report_id, type, title, body, link)
  select f, p_report.id, p_type, p_title, p_body, coalesce(p_link, '/lacak/' || p_report.code)
  from app_private.report_followers(p_report.id) f
  where f is distinct from p_except
$$;

create or replace function app_private.notify_role(
  p_role public.user_role, p_report public.reports, p_type text, p_title text, p_body text, p_link text, p_except uuid
)
returns void
language sql
set search_path = ''
as $$
  insert into public.notifications (user_id, report_id, type, title, body, link)
  select p.id, p_report.id, p_type, p_title, p_body, p_link
  from public.profiles p
  where p.role = p_role and p.is_active and p.deleted_at is null and p.id is distinct from p_except
$$;

create or replace function app_private.add_event(
  p_report public.reports,
  p_type public.report_event_type,
  p_from public.report_status,
  p_to public.report_status,
  p_actor public.profiles,
  p_label text,
  p_title text,
  p_note text default null,
  p_internal boolean default false,
  p_data jsonb default '{}'::jsonb
)
returns bigint
language sql
set search_path = ''
as $$
  insert into public.report_events (report_id, type, from_status, to_status, actor_id, actor_role, actor_label, title, note, is_internal, data)
  values (p_report.id, p_type, p_from, p_to, p_actor.id, p_actor.role, p_label, p_title, nullif(trim(p_note), ''), p_internal, coalesce(p_data, '{}'::jsonb))
  returning id
$$;

-- Lampirkan media yang sudah diunggah langsung ke Storage (signed upload URL).
-- Path wajib berada di folder milik pengunggah: {user_id}/{nama-acak}.{ext}
create or replace function app_private.attach_media(
  p_report_id uuid,
  p_kind public.media_kind,
  p_media jsonb,
  p_uploader uuid,
  p_proof_id uuid default null,
  p_event_id bigint default null,
  p_hidden boolean default false
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  m jsonb;
  v_path text;
  v_n int := 0;
begin
  if p_media is null or jsonb_typeof(p_media) <> 'array' then
    return 0;
  end if;
  for m in select * from jsonb_array_elements(p_media) loop
    v_path := m ->> 'path';
    if v_path is null or split_part(v_path, '/', 1) <> p_uploader::text or v_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,80}\.(jpg|jpeg|webp|png|pdf)$' then
      perform app_private.raise_app('Berkas tidak valid. Unggah ulang foto Anda.', 'BERKAS_TIDAK_VALID');
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'laporan' and o.name = v_path) then
      perform app_private.raise_app('Foto belum terunggah sepenuhnya. Coba lagi, isian Anda tidak hilang.', 'BERKAS_BELUM_ADA');
    end if;
    if nullif(m ->> 'thumb_path', '') is not null
       and (m ->> 'thumb_path') !~ ('^' || p_uploader::text || '/[A-Za-z0-9_-]{8,80}\.(jpg|jpeg|webp|png)$') then
      perform app_private.raise_app('Thumbnail foto tidak valid. Unggah ulang foto Anda.', 'BERKAS_TIDAK_VALID');
    end if;
    insert into public.report_media (report_id, kind, storage_path, thumb_path, mime_type, size_bytes, width, height, caption, proof_id, event_id, uploaded_by, is_hidden)
    values (
      p_report_id, p_kind, v_path, nullif(m ->> 'thumb_path', ''),
      coalesce(m ->> 'mime_type', 'image/jpeg'), coalesce((m ->> 'size_bytes')::int, 1),
      (m ->> 'width')::int, (m ->> 'height')::int, left(m ->> 'caption', 200),
      p_proof_id, p_event_id, p_uploader, p_hidden
    );
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function app_private.media_count(p_media jsonb)
returns integer
language sql immutable
as $$ select case when jsonb_typeof(p_media) = 'array' then jsonb_array_length(p_media) else 0 end $$;

revoke all on all functions in schema app_private from public;
