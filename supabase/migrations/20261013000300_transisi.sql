-- ONE PORTAL · Migrasi 3: fungsi transisi status terpusat + pengecekan SLA
--
-- SEMUA perubahan status laporan lewat public.transition_report(). Fungsi ini
-- memvalidasi peran, status asal, dan data wajib dalam SATU transaksi, lalu
-- menulis riwayat (report_events) dan notifikasi. Transisi tidak sah ditolak
-- dengan pesan Bahasa Indonesia (SQLSTATE P0001; kode mesin di DETAIL).

-- ---------------------------------------------------------------------------
-- Parser aman (input tidak valid -> null, bukan error berbahasa Inggris)
-- ---------------------------------------------------------------------------
create or replace function app_private.to_uuid(t text) returns uuid
language plpgsql immutable as $$
begin return nullif(trim(t), '')::uuid; exception when others then return null; end $$;

create or replace function app_private.to_float(t text) returns double precision
language plpgsql immutable as $$
begin return nullif(trim(t), '')::double precision; exception when others then return null; end $$;

create or replace function app_private.to_date(t text) returns date
language plpgsql stable as $$
begin return nullif(trim(t), '')::date; exception when others then return null; end $$;

create or replace function app_private.to_ts(t text) returns timestamptz
language plpgsql stable as $$
begin return nullif(trim(t), '')::timestamptz; exception when others then return null; end $$;

create or replace function app_private.to_bool(t text) returns boolean
language plpgsql immutable as $$
begin return coalesce(nullif(trim(t), '')::boolean, false); exception when others then return false; end $$;

create or replace function app_private.to_priority(t text) returns public.report_priority
language plpgsql immutable as $$
begin return nullif(trim(t), '')::public.report_priority; exception when others then return null; end $$;

create or replace function app_private.text_array(j jsonb) returns text[]
language sql immutable as $$
  select case when jsonb_typeof(j) = 'array'
    then coalesce(array(select trim(x) from jsonb_array_elements_text(j) x where trim(x) <> ''), '{}')
    else '{}'::text[] end
$$;

create or replace function app_private.require_role(p_role public.user_role, p_allowed public.user_role[], p_message text)
returns void language plpgsql as $$
begin
  if not (p_role = any (p_allowed)) then
    perform app_private.raise_app(p_message, 'TIDAK_BERHAK');
  end if;
end $$;

create or replace function app_private.require_status(p_status public.report_status, p_allowed public.report_status[], p_verb text)
returns void language plpgsql
set search_path = ''
as $$
begin
  if not (p_status = any (p_allowed)) then
    perform app_private.raise_app(
      format('Laporan berstatus "%s" tidak dapat %s.', public.status_label(p_status), p_verb), 'STATUS_TIDAK_SAH');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Penugasan (dipakai verify+tugaskan, assign, reassign)
-- ---------------------------------------------------------------------------
create or replace function app_private.do_assign(
  p_r public.reports,
  p_actor public.profiles,
  p_label text,
  p_officer uuid,
  p_agency uuid,
  p_reason text,
  p_reassign boolean
)
returns public.reports
language plpgsql
set search_path = ''
as $$
declare
  v_agency public.agencies;
  v_off public.profiles;
  n public.reports;
begin
  select * into v_agency from public.agencies
  where id = coalesce(p_agency, p_r.agency_id) and kind = 'INTERNAL' and is_active and deleted_at is null;
  if not found then
    perform app_private.raise_app('Instansi tidak ditemukan atau bukan instansi internal Pemko.', 'DATA_TIDAK_VALID');
  end if;

  select * into v_off from public.profiles
  where id = p_officer and role = 'OFFICER' and is_active and deleted_at is null;
  if not found then
    perform app_private.raise_app('Pilih petugas lapangan yang masih aktif.', 'DATA_TIDAK_VALID');
  end if;
  if v_off.agency_id is distinct from v_agency.id then
    perform app_private.raise_app(format('Petugas ini bukan anggota %s.', v_agency.short_name), 'DATA_TIDAK_VALID');
  end if;
  if p_reassign and p_officer = p_r.assignee_id then
    perform app_private.raise_app('Pilih petugas yang berbeda dari petugas saat ini.', 'DATA_TIDAK_VALID');
  end if;

  update public.reports
  set status = 'ASSIGNED', assignee_id = p_officer, agency_id = v_agency.id, assigned_at = now(), needs_action = false
  where id = p_r.id
  returning * into n;

  if p_reassign then
    perform app_private.add_event(n, 'REASSIGNED', p_r.status, 'ASSIGNED', p_actor, p_label,
      format('Penugasan dialihkan ke petugas %s', v_agency.short_name));
    perform app_private.add_event(n, 'NOTE', null, null, p_actor, p_label, 'Alasan pengalihan tugas', p_reason, true);
    perform app_private.notify(p_r.assignee_id, n.id, 'TASK_REASSIGNED',
      format('Tugas %s dialihkan', n.code),
      'Tugas ini dialihkan ke petugas lain. Anda tidak perlu menindaklanjutinya.', '/petugas');
  else
    perform app_private.add_event(n, 'ASSIGNED', p_r.status, 'ASSIGNED', p_actor, p_label,
      format('Ditugaskan ke petugas %s', v_agency.short_name));
  end if;

  perform app_private.notify(p_officer, n.id, 'TASK_ASSIGNED', format('Tugas baru: %s', n.code), n.title,
    '/petugas/tugas/' || n.id);
  perform app_private.notify_followers(n, 'STATUS', format('Laporan %s ditugaskan', n.code),
    format('Petugas %s akan menangani laporan Anda.', v_agency.short_name), p_actor.id);
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fungsi transisi terpusat
-- ---------------------------------------------------------------------------
create or replace function public.transition_report(
  p_action text,
  p_report_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_p jsonb := coalesce(p_payload, '{}'::jsonb);
  a public.profiles;            -- aktor
  r public.reports;             -- laporan sebelum transisi
  n public.reports;             -- laporan sesudah transisi
  v_label text;
  v_cat public.report_categories;
  v_agency public.agencies;
  v_parent public.reports;
  v_prev public.reports;
  v_proof public.completion_proofs;
  v_village public.villages;
  v_title text;
  v_desc text;
  v_note text;
  v_phone text;
  v_lat double precision;
  v_lng double precision;
  v_point extensions.geography;
  v_hours int;
  v_due timestamptz;
  v_priority public.report_priority;
  v_reasons text[];
  v_n int;
  v_event bigint;
  v_service uuid;
  v_facility uuid;
  v_work_date date;
  v_hidden boolean;
  v_ids uuid[];
  v_assignee uuid;
begin
  -- Penanda transaksi: hanya fungsi ini (dan seed) yang boleh menulis tabel reports.
  perform set_config('oneportal.transition', 'on', true);

  if v_uid is null then
    perform app_private.raise_app('Anda perlu masuk terlebih dahulu.', 'BELUM_MASUK');
  end if;
  select * into a from public.profiles where id = v_uid;
  if not found or not a.is_active or a.deleted_at is not null then
    perform app_private.raise_app('Akun Anda tidak aktif. Hubungi admin.', 'AKUN_NONAKTIF');
  end if;

  -- =========================================================================
  -- submit (Warga): membuat laporan baru berstatus Diterima
  -- =========================================================================
  if p_action = 'submit' then
    perform app_private.require_role(a.role, '{CITIZEN}', 'Laporan dibuat dari akun warga.');

    select count(*), min(submitted_at) into v_n, v_due
    from public.reports where reporter_id = v_uid and submitted_at > v_now - interval '1 hour';
    if v_n >= 5 then
      perform app_private.raise_app(
        format('Batas 5 laporan per jam sudah tercapai. Coba lagi setelah %s.', public.fmt_wib(v_due + interval '1 hour')),
        'BATAS_LAPORAN');
    end if;

    v_title := trim(v_p ->> 'title');
    if v_title is null or length(v_title) not between 10 and 120 then
      perform app_private.raise_app('Judul laporan perlu 10 sampai 120 karakter.', 'DATA_TIDAK_VALID');
    end if;
    v_desc := trim(v_p ->> 'description');
    if v_desc is null or length(v_desc) not between 20 and 2000 then
      perform app_private.raise_app('Deskripsi perlu 20 sampai 2.000 karakter.', 'DATA_TIDAK_VALID');
    end if;

    select * into v_cat from public.report_categories
    where id = app_private.to_uuid(v_p ->> 'category_id') and is_active and deleted_at is null;
    if not found then
      perform app_private.raise_app('Pilih kategori masalah.', 'DATA_TIDAK_VALID');
    end if;

    v_lat := app_private.to_float(v_p ->> 'lat');
    v_lng := app_private.to_float(v_p ->> 'lng');
    if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
      perform app_private.raise_app('Tentukan titik lokasi masalah di peta.', 'DATA_TIDAK_VALID');
    end if;
    v_point := ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography;
    if exists (select 1 from public.city_boundaries)
       and not exists (select 1 from public.city_boundaries c where ST_Covers(c.boundary, v_point::geometry)) then
      perform app_private.raise_app(
        'Titik lokasi berada di luar Kota Medan. Geser peta ke lokasi di dalam Kota Medan.', 'DI_LUAR_KOTA');
    end if;

    select v.* into v_village from public.villages v
    join public.districts d on d.code = v.district_code
    where v.code = v_p ->> 'village_code' and v.district_code = v_p ->> 'district_code'
      and v.is_active and v.deleted_at is null and d.is_active and d.deleted_at is null;
    if not found then
      perform app_private.raise_app('Pilih kecamatan dan kelurahan yang sesuai.', 'DATA_TIDAK_VALID');
    end if;

    if length(coalesce(trim(v_p ->> 'address'), '')) not between 5 and 300 then
      perform app_private.raise_app('Isi alamat atau patokan lokasi, minimal 5 karakter.', 'DATA_TIDAK_VALID');
    end if;
    if not app_private.to_bool(v_p ->> 'consent') then
      perform app_private.raise_app('Centang persetujuan pemrosesan data untuk mengirim laporan.', 'DATA_TIDAK_VALID');
    end if;
    if app_private.media_count(v_p -> 'media') not between 1 and 5 then
      perform app_private.raise_app('Lampirkan 1 sampai 5 foto masalah.', 'DATA_TIDAK_VALID');
    end if;
    v_phone := nullif(trim(v_p ->> 'phone'), '');
    if v_phone is not null and v_phone !~ '^\+?[0-9 -]{8,20}$' then
      perform app_private.raise_app('Nomor HP tidak valid. Contoh: 0812 3456 7890.', 'DATA_TIDAK_VALID');
    end if;

    v_service := app_private.to_uuid(v_p ->> 'service_id');
    if v_service is not null and not exists (
      select 1 from public.services where id = v_service and status = 'PUBLISHED' and deleted_at is null) then
      v_service := null;
    end if;
    v_facility := app_private.to_uuid(v_p ->> 'facility_id');
    if v_facility is not null and not exists (
      select 1 from public.facilities where id = v_facility and is_active and deleted_at is null) then
      v_facility := null;
    end if;

    -- Laporan berulang: titik yang sama (<= 200 m, kategori sama) pernah selesai dalam 90 hari.
    select p.* into v_prev from public.reports p
    where p.category_id = v_cat.id and p.status = 'RESOLVED' and p.deleted_at is null
      and p.resolved_at > v_now - interval '90 days'
      and ST_DWithin(p.location, v_point, 200)
    order by ST_Distance(p.location, v_point), p.resolved_at desc
    limit 1;

    insert into public.reports (
      title, description, category_id, service_id, facility_id, lat, lng, district_code, village_code, address,
      reporter_id, is_anonymous, is_confidential, reporter_phone, consent_at, channel, previous_report_id, flagged, submitted_at
    ) values (
      v_title, v_desc, v_cat.id, v_service, v_facility, v_lat, v_lng, v_village.district_code, v_village.code,
      trim(v_p ->> 'address'), v_uid, app_private.to_bool(v_p ->> 'is_anonymous'),
      app_private.to_bool(v_p ->> 'is_confidential'), v_phone, v_now,
      case when v_facility is not null then 'QR' else 'WEB' end, v_prev.id,
      exists (select 1 from public.blocked_words w where lower(v_title || ' ' || v_desc) ~ ('\m' || w.word || '\M')),
      v_now
    ) returning * into n;

    v_event := app_private.add_event(n, 'SUBMITTED', null, 'SUBMITTED', a, 'Pelapor', 'Laporan diterima');
    perform app_private.attach_media(n.id, 'INITIAL', v_p -> 'media', v_uid, null, v_event, false);

    if v_prev.id is not null then
      perform app_private.add_event(n, 'RECURRENCE_LINKED', null, null, null::public.profiles, 'Sistem',
        'Ditautkan sebagai laporan berulang',
        format('Masalah di titik ini tercatat selesai pada %s (%s).', public.fmt_wib(v_prev.resolved_at), v_prev.code),
        false, jsonb_build_object('previous_report_id', v_prev.id, 'previous_code', v_prev.code));
    end if;
    if n.flagged then
      perform app_private.add_event(n, 'FLAGGED', null, null, null::public.profiles, 'Sistem',
        'Ditandai untuk ditinjau', 'Memuat kata yang masuk daftar filter. Periksa sebelum diverifikasi.', true);
    end if;

    perform app_private.notify(v_uid, n.id, 'SUBMITTED', 'Laporan terkirim',
      format('Kode laporan %s. Admin akan memverifikasi laporan Anda.', n.code), '/lacak/' || n.code);

    return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status,
      'status_label', public.status_label(n.status), 'previous_code', v_prev.code);
  end if;

  -- =========================================================================
  -- Aksi pada laporan yang sudah ada
  -- =========================================================================
  select * into r from public.reports where id = p_report_id and deleted_at is null for update;
  if not found then
    perform app_private.raise_app('Laporan tidak ditemukan.', 'TIDAK_DITEMUKAN');
  end if;
  -- Petugas hanya boleh menyentuh tugas yang ditugaskan kepadanya (selain itu: 404).
  if a.role = 'OFFICER' and r.assignee_id is distinct from v_uid then
    perform app_private.raise_app('Tugas tidak ditemukan.', 'TIDAK_DITEMUKAN');
  end if;
  v_label := app_private.actor_label(a, r.reporter_id);

  case p_action
  -- -------------------------------------------------------------------------
  when 'verify' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Verifikasi laporan hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{SUBMITTED}', 'diverifikasi');

    select * into v_cat from public.report_categories
    where id = coalesce(app_private.to_uuid(v_p ->> 'category_id'), r.category_id) and is_active and deleted_at is null;
    if not found then
      perform app_private.raise_app('Kategori tidak ditemukan atau sudah nonaktif.', 'DATA_TIDAK_VALID');
    end if;
    v_priority := app_private.to_priority(v_p ->> 'priority');
    if v_priority is null then
      perform app_private.raise_app('Pilih prioritas laporan.', 'DATA_TIDAK_VALID');
    end if;
    v_reasons := app_private.text_array(v_p -> 'priority_reasons');
    v_note := nullif(trim(v_p ->> 'priority_note'), '');
    if cardinality(v_reasons) = 0 and v_note is null then
      perform app_private.raise_app('Tulis alasan prioritas: pilih minimal satu alasan atau isi keterangan.', 'DATA_TIDAK_VALID');
    end if;
    select * into v_agency from public.agencies
    where id = coalesce(app_private.to_uuid(v_p ->> 'agency_id'), v_cat.default_agency_id)
      and kind = 'INTERNAL' and is_active and deleted_at is null;
    if not found then
      perform app_private.raise_app('Pilih instansi internal yang akan menangani laporan.', 'DATA_TIDAK_VALID');
    end if;

    select target_hours into v_hours from public.sla_policies where category_id = v_cat.id and priority = v_priority;
    v_hours := coalesce(v_hours, case v_priority when 'EMERGENCY' then 24 when 'HIGH' then 72 when 'MEDIUM' then 168 else 336 end);
    v_due := app_private.to_ts(v_p ->> 'due_at');
    if v_due is not null and v_due <= v_now then
      perform app_private.raise_app('Tenggat harus setelah waktu sekarang.', 'DATA_TIDAK_VALID');
    end if;
    v_due := coalesce(v_due, v_now + make_interval(hours => v_hours));

    update public.reports set
      status = 'VERIFIED', category_id = v_cat.id, priority = v_priority, priority_reasons = v_reasons,
      priority_note = v_note, agency_id = v_agency.id, sla_target_hours = v_hours, due_at = v_due, verified_at = v_now
    where id = r.id returning * into n;

    perform app_private.add_event(n, 'VERIFIED', r.status, 'VERIFIED', a, v_label, 'Laporan diverifikasi',
      format('Prioritas %s%s. Ditangani %s, target selesai %s.',
        lower(public.priority_label(v_priority)),
        case when cardinality(v_reasons) > 0 then ': ' || lower(array_to_string(v_reasons, ', ')) else '' end,
        v_agency.name, public.fmt_wib(v_due)),
      false, jsonb_build_object('category_changed', v_cat.id <> r.category_id));
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s diverifikasi', n.code),
      format('Laporan Anda valid dan ditangani %s. Target selesai %s.', v_agency.short_name, public.fmt_wib(v_due)), v_uid);

    -- Opsional: langsung tugaskan.
    v_assignee := app_private.to_uuid(v_p ->> 'assignee_id');
    if v_assignee is not null then
      n := app_private.do_assign(n, a, v_label, v_assignee, v_agency.id, null, false);
    end if;

  -- -------------------------------------------------------------------------
  when 'assign' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Penugasan hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{VERIFIED}', 'ditugaskan');
    v_assignee := app_private.to_uuid(v_p ->> 'assignee_id');
    if v_assignee is null then
      perform app_private.raise_app('Pilih petugas yang akan ditugaskan.', 'DATA_TIDAK_VALID');
    end if;
    n := app_private.do_assign(r, a, v_label, v_assignee, app_private.to_uuid(v_p ->> 'agency_id'), null, false);

  -- -------------------------------------------------------------------------
  when 'reassign' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Pengalihan tugas hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{ASSIGNED,IN_PROGRESS}', 'dialihkan ke petugas lain');
    v_note := nullif(trim(v_p ->> 'reason'), '');
    if v_note is null or length(v_note) < 5 then
      perform app_private.raise_app('Tulis alasan pengalihan tugas.', 'DATA_TIDAK_VALID');
    end if;
    v_assignee := app_private.to_uuid(v_p ->> 'assignee_id');
    if v_assignee is null then
      perform app_private.raise_app('Pilih petugas pengganti.', 'DATA_TIDAK_VALID');
    end if;
    n := app_private.do_assign(r, a, v_label, v_assignee, app_private.to_uuid(v_p ->> 'agency_id'), v_note, true);

  -- -------------------------------------------------------------------------
  when 'reject' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Penolakan laporan hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{SUBMITTED}', 'ditolak');
    v_note := nullif(trim(v_p ->> 'reason'), '');
    if v_note is null or length(v_note) < 10 then
      perform app_private.raise_app('Tulis alasan penolakan minimal 10 karakter. Alasan ini dibaca pelapor.', 'DATA_TIDAK_VALID');
    end if;
    update public.reports set status = 'REJECTED', reject_reason = v_note, rejected_at = v_now
    where id = r.id returning * into n;
    perform app_private.add_event(n, 'REJECTED', r.status, 'REJECTED', a, v_label, 'Laporan ditolak', v_note);
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s ditolak', n.code), v_note, v_uid);

  -- -------------------------------------------------------------------------
  when 'forward' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Penerusan laporan hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{SUBMITTED}', 'diteruskan');
    select * into v_agency from public.agencies
    where id = app_private.to_uuid(v_p ->> 'agency_id') and kind = 'EXTERNAL' and is_active and deleted_at is null;
    if not found then
      perform app_private.raise_app('Pilih instansi tujuan di luar Pemko Medan.', 'DATA_TIDAK_VALID');
    end if;
    v_note := nullif(trim(v_p ->> 'note'), '');
    if v_note is null or length(v_note) < 10 then
      perform app_private.raise_app('Tulis catatan untuk pelapor minimal 10 karakter.', 'DATA_TIDAK_VALID');
    end if;
    update public.reports set status = 'FORWARDED', forward_agency_id = v_agency.id, forward_note = v_note, forwarded_at = v_now
    where id = r.id returning * into n;
    perform app_private.add_event(n, 'FORWARDED', r.status, 'FORWARDED', a, v_label,
      format('Diteruskan ke %s', v_agency.name), v_note, false,
      jsonb_build_object('agency_id', v_agency.id, 'contact_phone', v_agency.contact_phone, 'website', v_agency.website));
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s diteruskan', n.code),
      format('Masalah ini ditangani %s. %s', v_agency.name, v_note), v_uid);

  -- -------------------------------------------------------------------------
  when 'merge' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Penggabungan laporan hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{SUBMITTED,VERIFIED}', 'digabungkan');
    select * into v_parent from public.reports
    where deleted_at is null
      and (id = app_private.to_uuid(v_p ->> 'parent_id') or code = upper(trim(v_p ->> 'parent_code')))
    for update;
    if not found then
      perform app_private.raise_app('Laporan induk tidak ditemukan.', 'DATA_TIDAK_VALID');
    end if;
    if v_parent.id = r.id then
      perform app_private.raise_app('Laporan tidak dapat digabungkan dengan dirinya sendiri.', 'DATA_TIDAK_VALID');
    end if;
    if v_parent.status in ('RESOLVED', 'REJECTED', 'FORWARDED', 'MERGED') then
      perform app_private.raise_app(
        format('Laporan induk berstatus "%s". Pilih laporan induk yang masih ditangani.', public.status_label(v_parent.status)),
        'STATUS_TIDAK_SAH');
    end if;

    update public.reports set status = 'MERGED', parent_id = v_parent.id, merged_at = v_now
    where id = r.id returning * into n;
    update public.reports set affected_count = v_parent.affected_count + r.affected_count
    where id = v_parent.id returning * into v_parent;

    perform app_private.add_event(n, 'MERGED', r.status, 'MERGED', a, v_label,
      format('Digabungkan dengan laporan %s', v_parent.code), nullif(trim(v_p ->> 'note'), ''), false,
      jsonb_build_object('parent_id', v_parent.id, 'parent_code', v_parent.code));
    perform app_private.add_event(v_parent, 'CHILD_MERGED', null, null, a, v_label,
      'Laporan serupa digabungkan ke laporan ini', format('Kini %s warga terdampak.', v_parent.affected_count), false,
      jsonb_build_object('child_id', n.id, 'child_code', n.code));
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s digabungkan', n.code),
      format('Laporan Anda digabungkan dengan %s yang menangani masalah yang sama. Kabar berikutnya mengikuti laporan itu.', v_parent.code),
      v_uid, '/lacak/' || v_parent.code);

  -- -------------------------------------------------------------------------
  when 'start' then
    perform app_private.require_role(a.role, '{OFFICER}', 'Hanya petugas yang ditugaskan yang dapat mulai mengerjakan.');
    perform app_private.require_status(r.status, '{ASSIGNED}', 'mulai dikerjakan');
    update public.reports set status = 'IN_PROGRESS', started_at = v_now where id = r.id returning * into n;
    perform app_private.add_event(n, 'STARTED', r.status, 'IN_PROGRESS', a, v_label, 'Mulai dikerjakan');
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s mulai dikerjakan', n.code),
      format('%s mulai mengerjakan pada %s.', v_label, public.fmt_wib(v_now)), v_uid);

  -- -------------------------------------------------------------------------
  when 'add_progress' then
    perform app_private.require_role(a.role, '{OFFICER}', 'Hanya petugas yang ditugaskan yang dapat menambah progres.');
    perform app_private.require_status(r.status, '{IN_PROGRESS}', 'diberi catatan progres');
    v_note := nullif(trim(v_p ->> 'note'), '');
    if v_note is null or length(v_note) not between 5 and 1000 then
      perform app_private.raise_app('Tulis catatan progres 5 sampai 1.000 karakter.', 'DATA_TIDAK_VALID');
    end if;
    if app_private.media_count(v_p -> 'media') > 5 then
      perform app_private.raise_app('Lampirkan paling banyak 5 foto progres.', 'DATA_TIDAK_VALID');
    end if;
    v_hidden := not app_private.to_bool(v_p ->> 'show_to_citizen');
    n := r;
    v_event := app_private.add_event(n, 'PROGRESS', null, null, a, v_label, 'Perkembangan pekerjaan', v_note, v_hidden);
    perform app_private.attach_media(n.id, 'PROGRESS', v_p -> 'media', v_uid, null, v_event, v_hidden);
    if not v_hidden then
      perform app_private.notify_followers(n, 'PROGRESS', format('Ada perkembangan laporan %s', n.code), left(v_note, 160), v_uid);
    end if;

  -- -------------------------------------------------------------------------
  when 'submit_proof' then
    perform app_private.require_role(a.role, '{OFFICER}', 'Hanya petugas yang ditugaskan yang dapat mengirim bukti.');
    perform app_private.require_status(r.status, '{IN_PROGRESS}', 'dikirimi bukti selesai');
    v_desc := trim(v_p ->> 'description');
    if v_desc is null or length(v_desc) not between 30 and 2000 then
      perform app_private.raise_app('Jelaskan pekerjaan yang dilakukan, minimal 30 karakter.', 'DATA_TIDAK_VALID');
    end if;
    v_work_date := app_private.to_date(v_p ->> 'work_date');
    if v_work_date is null then
      perform app_private.raise_app('Isi tanggal pengerjaan.', 'DATA_TIDAK_VALID');
    end if;
    if v_work_date > (v_now at time zone 'Asia/Jakarta')::date then
      perform app_private.raise_app('Tanggal pengerjaan tidak boleh di masa depan.', 'DATA_TIDAK_VALID');
    end if;
    if v_work_date < (r.submitted_at at time zone 'Asia/Jakarta')::date then
      perform app_private.raise_app('Tanggal pengerjaan tidak boleh sebelum laporan masuk.', 'DATA_TIDAK_VALID');
    end if;
    if not app_private.to_bool(v_p ->> 'declaration') then
      perform app_private.raise_app('Centang pernyataan bahwa bukti ini benar.', 'DATA_TIDAK_VALID');
    end if;
    if app_private.media_count(v_p -> 'before') not between 1 and 5 then
      perform app_private.raise_app('Lampirkan 1 sampai 5 foto sebelum dikerjakan.', 'DATA_TIDAK_VALID');
    end if;
    if app_private.media_count(v_p -> 'after') not between 1 and 5 then
      perform app_private.raise_app('Lampirkan 1 sampai 5 foto sesudah dikerjakan.', 'DATA_TIDAK_VALID');
    end if;
    if app_private.media_count(v_p -> 'supporting') > 3 then
      perform app_private.raise_app('Lampirkan paling banyak 3 dokumen pendukung.', 'DATA_TIDAK_VALID');
    end if;

    insert into public.completion_proofs (report_id, officer_id, description, work_date, declaration, submitted_at)
    values (r.id, v_uid, v_desc, v_work_date, true, v_now) returning * into v_proof;
    update public.reports set status = 'UNDER_REVIEW', proof_submitted_at = v_now, needs_action = false, return_reason = null
    where id = r.id returning * into n;
    v_event := app_private.add_event(n, 'PROOF_SUBMITTED', r.status, 'UNDER_REVIEW', a, v_label,
      'Bukti penyelesaian dikirim', null, false, jsonb_build_object('proof_id', v_proof.id));
    perform app_private.attach_media(n.id, 'BEFORE', v_p -> 'before', v_uid, v_proof.id, v_event, false);
    perform app_private.attach_media(n.id, 'AFTER', v_p -> 'after', v_uid, v_proof.id, v_event, false);
    perform app_private.attach_media(n.id, 'SUPPORTING', v_p -> 'supporting', v_uid, v_proof.id, v_event, false);

    perform app_private.notify_role('ADMIN', n, 'PROOF_SUBMITTED', format('Bukti %s menunggu ditinjau', n.code), n.title,
      '/admin/tinjau-bukti?laporan=' || n.id, v_uid);
    perform app_private.notify_followers(n, 'STATUS', format('Bukti penyelesaian %s sedang ditinjau', n.code),
      'Admin memeriksa foto sebelum dan sesudah sebelum laporan dinyatakan selesai.', v_uid);

  -- -------------------------------------------------------------------------
  when 'approve_proof' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Persetujuan bukti hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{UNDER_REVIEW}', 'disetujui');
    select * into v_proof from public.completion_proofs
    where report_id = r.id and status = 'PENDING' order by submitted_at desc limit 1 for update;
    if not found then
      perform app_private.raise_app('Bukti yang menunggu ditinjau tidak ditemukan.', 'TIDAK_DITEMUKAN');
    end if;
    update public.completion_proofs
    set status = 'APPROVED', reviewed_by = v_uid, reviewed_at = v_now, review_note = nullif(trim(v_p ->> 'note'), '')
    where id = v_proof.id;
    update public.reports
    set status = 'RESOLVED', resolved_at = v_now, sla_stopped_at = v_proof.submitted_at, needs_action = false
    where id = r.id returning * into n;
    perform app_private.add_event(n, 'PROOF_APPROVED', r.status, 'RESOLVED', a, v_label,
      'Bukti disetujui, laporan selesai', null, false, jsonb_build_object('proof_id', v_proof.id));
    perform app_private.notify_followers(n, 'RESOLVED', 'Laporan Anda selesai',
      format('Laporan %s selesai pada %s. Lihat foto sebelum dan sesudah.', n.code, public.fmt_wib(v_now)),
      v_uid, '/lacak/' || n.code || '#bukti');
    perform app_private.notify(n.assignee_id, n.id, 'PROOF_APPROVED', format('Bukti %s disetujui', n.code),
      'Laporan dinyatakan selesai dan buktinya tampil untuk publik.', '/petugas/tugas/' || n.id);

  -- -------------------------------------------------------------------------
  when 'return_proof' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Pengembalian bukti hanya dapat dilakukan admin.');
    perform app_private.require_status(r.status, '{UNDER_REVIEW}', 'dikembalikan ke petugas');
    v_note := nullif(trim(v_p ->> 'reason'), '');
    if v_note is null or length(v_note) < 10 then
      perform app_private.raise_app('Tulis alasan pengembalian minimal 10 karakter agar petugas tahu yang perlu diperbaiki.', 'DATA_TIDAK_VALID');
    end if;
    select * into v_proof from public.completion_proofs
    where report_id = r.id and status = 'PENDING' order by submitted_at desc limit 1 for update;
    if not found then
      perform app_private.raise_app('Bukti yang menunggu ditinjau tidak ditemukan.', 'TIDAK_DITEMUKAN');
    end if;
    update public.completion_proofs set status = 'RETURNED', reviewed_by = v_uid, reviewed_at = v_now, review_note = v_note
    where id = v_proof.id;
    update public.reports
    set status = 'IN_PROGRESS', needs_action = true, return_reason = v_note, proof_submitted_at = null
    where id = r.id returning * into n;
    perform app_private.add_event(n, 'PROOF_RETURNED', r.status, 'IN_PROGRESS', a, v_label,
      'Bukti dikembalikan ke petugas untuk dilengkapi', null, false, jsonb_build_object('proof_id', v_proof.id));
    perform app_private.add_event(n, 'NOTE', null, null, a, v_label, 'Alasan pengembalian bukti', v_note, true);
    perform app_private.notify(n.assignee_id, n.id, 'PROOF_RETURNED', format('Bukti %s dikembalikan', n.code), v_note,
      '/petugas/tugas/' || n.id);

  -- -------------------------------------------------------------------------
  when 'add_note' then
    perform app_private.require_role(a.role, '{ADMIN,SUPERVISOR,OFFICER}', 'Anda tidak dapat menambah catatan pada laporan ini.');
    v_note := nullif(trim(v_p ->> 'note'), '');
    if v_note is null or length(v_note) not between 3 and 2000 then
      perform app_private.raise_app('Tulis catatan 3 sampai 2.000 karakter.', 'DATA_TIDAK_VALID');
    end if;
    n := r;
    perform app_private.add_event(n, 'NOTE', null, null, a, v_label,
      case when a.role = 'SUPERVISOR' then 'Instruksi supervisor' else 'Catatan internal' end, v_note, true);
    if a.role = 'SUPERVISOR' and n.assignee_id is not null then
      perform app_private.notify(n.assignee_id, n.id, 'SUPERVISOR_NOTE', format('Instruksi supervisor untuk %s', n.code),
        left(v_note, 160), '/petugas/tugas/' || n.id);
    end if;

  -- -------------------------------------------------------------------------
  when 'set_media_visibility' then
    perform app_private.require_role(a.role, '{ADMIN}', 'Hanya admin yang dapat menyembunyikan foto.');
    v_hidden := app_private.to_bool(v_p ->> 'hidden');
    v_ids := array(select app_private.to_uuid(x) from jsonb_array_elements_text(
      case when jsonb_typeof(v_p -> 'media_ids') = 'array' then v_p -> 'media_ids' else '[]'::jsonb end) x);
    if app_private.to_bool(v_p ->> 'all') then
      update public.report_media set is_hidden = v_hidden where report_id = r.id;
      get diagnostics v_n = row_count;
      update public.reports set media_hidden = v_hidden where id = r.id returning * into n;
    else
      if cardinality(v_ids) = 0 then
        perform app_private.raise_app('Pilih foto yang akan disembunyikan atau ditampilkan.', 'DATA_TIDAK_VALID');
      end if;
      update public.report_media set is_hidden = v_hidden where report_id = r.id and id = any (v_ids);
      get diagnostics v_n = row_count;
      n := r;
    end if;
    perform app_private.add_event(n, case when v_hidden then 'MEDIA_HIDDEN' else 'MEDIA_SHOWN' end::public.report_event_type,
      null, null, a, v_label,
      case when v_hidden then 'Foto disembunyikan dari publik' else 'Foto ditampilkan kembali untuk publik' end,
      nullif(trim(v_p ->> 'reason'), ''), true, jsonb_build_object('count', v_n));

  -- -------------------------------------------------------------------------
  when 'support' then
    perform app_private.require_role(a.role, '{CITIZEN}', 'Dukungan laporan dari akun warga.');
    perform app_private.require_status(r.status, '{SUBMITTED,VERIFIED,ASSIGNED,IN_PROGRESS,UNDER_REVIEW}', 'didukung');
    if r.reporter_id = v_uid then
      perform app_private.raise_app('Ini laporan Anda sendiri.', 'DATA_TIDAK_VALID');
    end if;
    insert into public.report_supports (report_id, user_id) values (r.id, v_uid) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      perform app_private.raise_app('Anda sudah mendukung laporan ini.', 'SUDAH_DIDUKUNG');
    end if;
    update public.reports set support_count = support_count + 1, affected_count = affected_count + 1
    where id = r.id returning * into n;

  else
    perform app_private.raise_app('Aksi tidak dikenal.', 'AKSI_TIDAK_DIKENAL');
  end case;

  return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status,
    'status_label', public.status_label(n.status), 'affected_count', n.affected_count);
end;
$$;

comment on function public.transition_report(text, uuid, jsonb) is
  'Satu-satunya pintu perubahan status laporan. Aksi: submit, verify, assign, reassign, reject, forward, merge, start, add_progress, submit_proof, approve_proof, return_proof, add_note, set_media_visibility, support.';

-- ---------------------------------------------------------------------------
-- Pengecekan SLA berkala (dipanggil /api/cron/tick dengan service role)
-- ---------------------------------------------------------------------------
create or replace function public.run_sla_tick()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  r public.reports;
  v_n int := 0;
begin
  perform set_config('oneportal.transition', 'on', true);
  for r in
    select * from public.reports
    where deleted_at is null and escalated_at is null and due_at < now()
      and (status in ('VERIFIED', 'ASSIGNED', 'IN_PROGRESS')
        or (status = 'UNDER_REVIEW' and (proof_submitted_at is null or proof_submitted_at > due_at)))
    for update skip locked
  loop
    update public.reports set escalated_at = now() where id = r.id;
    perform app_private.add_event(r, 'ESCALATED', null, null, null::public.profiles, 'Sistem',
      'Melewati tenggat, dieskalasi ke supervisor', format('Tenggat %s terlewati.', public.fmt_wib(r.due_at)), true);
    perform app_private.notify_role('SUPERVISOR', r, 'ESCALATED', format('Laporan %s melewati tenggat', r.code), r.title,
      '/supervisor/laporan/' || r.id, null);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('escalated', v_n, 'checked_at', now());
end;
$$;

-- Hak eksekusi: transisi untuk pengguna yang masuk; tick hanya service role.
revoke all on function public.transition_report(text, uuid, jsonb) from public, anon;
grant execute on function public.transition_report(text, uuid, jsonb) to authenticated;
revoke all on function public.run_sla_tick() from public, anon, authenticated;
grant execute on function public.run_sla_tick() to service_role;

revoke all on all functions in schema app_private from public;
