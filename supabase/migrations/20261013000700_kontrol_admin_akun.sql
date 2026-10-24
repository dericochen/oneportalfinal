-- ONE PORTAL · Migrasi 7: kontrol penuh admin atas laporan + kelola akun oleh supervisor
--
-- 1. Fungsi transisi lama dipindah ke app_private.transition_core. Pintu publik
--    tetap SATU: public.transition_report(), yang kini juga menangani aksi admin
--    update_details (ubah tenggat, prioritas, kategori, instansi, isi), reopen,
--    delete (soft delete), dan restore; aksi lain diteruskan ke inti.
-- 2. Supervisor membuat dan mengelola akun staf (admin, petugas, supervisor).
--    Pendaftaran mandiri tetap hanya untuk warga (trigger handle_new_user).

alter type public.report_event_type add value if not exists 'DETAILS_UPDATED';
alter type public.report_event_type add value if not exists 'REOPENED';
alter type public.report_event_type add value if not exists 'DELETED';
alter type public.report_event_type add value if not exists 'RESTORED';

alter function public.transition_report(text, uuid, jsonb) set schema app_private;
alter function app_private.transition_report(text, uuid, jsonb) rename to transition_core;
revoke all on function app_private.transition_core(text, uuid, jsonb) from public, anon, authenticated;

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
  v_p jsonb := coalesce(p_payload, '{}'::jsonb);
  a public.profiles;
  r public.reports;
  n public.reports;
  v_cat public.report_categories;
  v_agency public.agencies;
  v_title text;
  v_desc text;
  v_addr text;
  v_note text;
  v_priority public.report_priority;
  v_reasons text[];
  v_due timestamptz;
  v_hours int;
  v_ubah text[] := '{}';
  v_due_berubah boolean := false;
begin
  if p_action not in ('update_details', 'reopen', 'delete', 'restore') then
    return app_private.transition_core(p_action, p_report_id, v_p);
  end if;

  perform set_config('oneportal.transition', 'on', true);
  if v_uid is null then
    perform app_private.raise_app('Anda perlu masuk terlebih dahulu.', 'BELUM_MASUK');
  end if;
  select * into a from public.profiles where id = v_uid;
  if not found or not a.is_active or a.deleted_at is not null then
    perform app_private.raise_app('Akun Anda tidak aktif. Hubungi supervisor.', 'AKUN_NONAKTIF');
  end if;
  perform app_private.require_role(a.role, '{ADMIN}', 'Hanya admin yang dapat mengubah data laporan.');

  select * into r from public.reports where id = p_report_id for update;
  if not found then
    perform app_private.raise_app('Laporan tidak ditemukan.', 'TIDAK_DITEMUKAN');
  end if;

  -- -------------------------------------------------------------------------
  if p_action = 'restore' then
    if r.deleted_at is null then
      perform app_private.raise_app('Laporan ini tidak sedang dihapus.', 'STATUS_TIDAK_SAH');
    end if;
    update public.reports set deleted_at = null where id = r.id returning * into n;
    perform app_private.add_event(n, 'RESTORED', null, null, a, 'Admin', 'Laporan dipulihkan', null, true);
    return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status, 'status_label', public.status_label(n.status));
  end if;

  if r.deleted_at is not null then
    perform app_private.raise_app('Laporan ini sudah dihapus. Pulihkan dulu untuk mengubahnya.', 'STATUS_TIDAK_SAH');
  end if;

  -- -------------------------------------------------------------------------
  if p_action = 'delete' then
    v_note := nullif(trim(v_p ->> 'reason'), '');
    if v_note is null or length(v_note) < 5 then
      perform app_private.raise_app('Tulis alasan penghapusan, minimal 5 karakter.', 'DATA_TIDAK_VALID');
    end if;
    update public.reports set deleted_at = now() where id = r.id returning * into n;
    perform app_private.add_event(n, 'DELETED', null, null, a, 'Admin', 'Laporan dihapus dari daftar', v_note, true);
    return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status, 'status_label', public.status_label(n.status));
  end if;

  -- -------------------------------------------------------------------------
  if p_action = 'reopen' then
    perform app_private.require_status(r.status, '{REJECTED,FORWARDED}', 'dibuka kembali');
    v_note := nullif(trim(v_p ->> 'reason'), '');
    if v_note is null or length(v_note) < 5 then
      perform app_private.raise_app('Tulis alasan membuka kembali laporan, minimal 5 karakter.', 'DATA_TIDAK_VALID');
    end if;
    update public.reports set status = 'SUBMITTED', reject_reason = null, rejected_at = null,
      forward_agency_id = null, forward_note = null, forwarded_at = null
    where id = r.id returning * into n;
    perform app_private.add_event(n, 'REOPENED', r.status, 'SUBMITTED', a, 'Admin', 'Laporan dibuka kembali untuk ditinjau ulang', v_note);
    perform app_private.notify_followers(n, 'STATUS', format('Laporan %s dibuka kembali', n.code),
      'Admin meninjau ulang laporan Anda.', v_uid);
    return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status, 'status_label', public.status_label(n.status));
  end if;

  -- -------------------------------------------------------------------------
  -- update_details: hanya kolom yang dikirim yang diubah.
  -- -------------------------------------------------------------------------
  n := r;

  if v_p ? 'title' then
    v_title := trim(v_p ->> 'title');
    if v_title is null or length(v_title) not between 10 and 120 then
      perform app_private.raise_app('Judul laporan perlu 10 sampai 120 karakter.', 'DATA_TIDAK_VALID');
    end if;
    if v_title is distinct from r.title then n.title := v_title; v_ubah := array_append(v_ubah, 'judul'); end if;
  end if;

  if v_p ? 'description' then
    v_desc := trim(v_p ->> 'description');
    if v_desc is null or length(v_desc) not between 20 and 2000 then
      perform app_private.raise_app('Deskripsi perlu 20 sampai 2.000 karakter.', 'DATA_TIDAK_VALID');
    end if;
    if v_desc is distinct from r.description then n.description := v_desc; v_ubah := array_append(v_ubah, 'deskripsi'); end if;
  end if;

  if v_p ? 'address' then
    v_addr := trim(v_p ->> 'address');
    if v_addr is null or length(v_addr) not between 5 and 300 then
      perform app_private.raise_app('Alamat atau patokan perlu 5 sampai 300 karakter.', 'DATA_TIDAK_VALID');
    end if;
    if v_addr is distinct from r.address then n.address := v_addr; v_ubah := array_append(v_ubah, 'alamat'); end if;
  end if;

  if v_p ? 'category_id' then
    select * into v_cat from public.report_categories
    where id = app_private.to_uuid(v_p ->> 'category_id') and deleted_at is null;
    if not found then
      perform app_private.raise_app('Kategori tidak ditemukan.', 'DATA_TIDAK_VALID');
    end if;
    if v_cat.id <> r.category_id then n.category_id := v_cat.id; v_ubah := array_append(v_ubah, 'kategori'); end if;
  end if;

  if v_p ? 'priority' then
    v_priority := app_private.to_priority(v_p ->> 'priority');
    if v_priority is null then
      perform app_private.raise_app('Prioritas tidak dikenal.', 'DATA_TIDAK_VALID');
    end if;
    if v_priority is distinct from r.priority then n.priority := v_priority; v_ubah := array_append(v_ubah, 'prioritas'); end if;
  end if;
  if v_p ? 'priority_reasons' then
    v_reasons := app_private.text_array(v_p -> 'priority_reasons');
    if v_reasons is distinct from r.priority_reasons then n.priority_reasons := v_reasons; v_ubah := array_append(v_ubah, 'alasan prioritas'); end if;
  end if;
  if v_p ? 'priority_note' then
    v_note := nullif(trim(v_p ->> 'priority_note'), '');
    if v_note is distinct from r.priority_note then n.priority_note := v_note; end if;
  end if;

  if v_p ? 'agency_id' then
    select * into v_agency from public.agencies
    where id = app_private.to_uuid(v_p ->> 'agency_id') and kind = 'INTERNAL' and deleted_at is null;
    if not found then
      perform app_private.raise_app('Pilih instansi internal Pemko yang masih ada.', 'DATA_TIDAK_VALID');
    end if;
    if v_agency.id is distinct from r.agency_id then
      if r.assignee_id is not null and r.status in ('ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW')
         and not exists (select 1 from public.profiles p where p.id = r.assignee_id and p.agency_id = v_agency.id) then
        perform app_private.raise_app('Petugas saat ini bukan anggota instansi itu. Alihkan tugas ke petugas instansi baru.', 'DATA_TIDAK_VALID');
      end if;
      n.agency_id := v_agency.id;
      v_ubah := array_append(v_ubah, 'instansi');
    end if;
  end if;

  if v_p ? 'is_confidential' then
    if app_private.to_bool(v_p ->> 'is_confidential') is distinct from r.is_confidential then
      n.is_confidential := app_private.to_bool(v_p ->> 'is_confidential');
      v_ubah := array_append(v_ubah, case when n.is_confidential then 'jadi rahasia' else 'jadi publik' end);
    end if;
  end if;

  -- Tenggat: diisi langsung, atau dihitung ulang dari matriks SLA.
  if v_p ? 'due_at' and nullif(trim(v_p ->> 'due_at'), '') is not null then
    v_due := app_private.to_ts(v_p ->> 'due_at');
    if v_due is null then
      perform app_private.raise_app('Format tenggat tidak valid.', 'DATA_TIDAK_VALID');
    end if;
    if v_due <= r.submitted_at then
      perform app_private.raise_app('Tenggat harus setelah laporan masuk.', 'DATA_TIDAK_VALID');
    end if;
  elsif app_private.to_bool(v_p ->> 'recalculate_due') then
    if n.priority is null then
      perform app_private.raise_app('Tetapkan prioritas dulu untuk menghitung tenggat dari SLA.', 'DATA_TIDAK_VALID');
    end if;
    select target_hours into v_hours from public.sla_policies where category_id = n.category_id and priority = n.priority;
    v_hours := coalesce(v_hours, case n.priority when 'EMERGENCY' then 24 when 'HIGH' then 72 when 'MEDIUM' then 168 else 336 end);
    v_due := coalesce(r.verified_at, now()) + make_interval(hours => v_hours);
    n.sla_target_hours := v_hours;
  end if;
  if v_due is not null and v_due is distinct from r.due_at then
    if r.status in ('RESOLVED', 'REJECTED', 'FORWARDED', 'MERGED') then
      perform app_private.raise_app('Tenggat laporan yang sudah final tidak dapat diubah.', 'STATUS_TIDAK_SAH');
    end if;
    n.due_at := v_due;
    if r.verified_at is not null then
      n.sla_target_hours := greatest(1, round(extract(epoch from v_due - r.verified_at) / 3600))::int;
    end if;
    -- Tenggat baru di masa depan: eskalasi boleh terjadi lagi bila kembali terlambat.
    if v_due > now() then n.escalated_at := null; end if;
    v_due_berubah := true;
    v_ubah := array_append(v_ubah, 'tenggat');
  end if;

  if cardinality(v_ubah) = 0 then
    perform app_private.raise_app('Tidak ada perubahan untuk disimpan.', 'TIDAK_ADA_PERUBAHAN');
  end if;

  update public.reports set
    title = n.title, description = n.description, address = n.address, category_id = n.category_id,
    priority = n.priority, priority_reasons = n.priority_reasons, priority_note = n.priority_note,
    agency_id = n.agency_id, is_confidential = n.is_confidential, due_at = n.due_at,
    sla_target_hours = n.sla_target_hours, escalated_at = n.escalated_at
  where id = r.id returning * into n;

  v_note := nullif(trim(v_p ->> 'note'), '');
  if v_due_berubah then
    -- Perubahan tenggat terlihat warga (transparansi), perubahan lain cukup internal.
    perform app_private.add_event(n, 'DETAILS_UPDATED', null, null, a, 'Admin',
      format('Target selesai diubah menjadi %s', public.fmt_wib(n.due_at)), v_note, false,
      jsonb_build_object('due_lama', r.due_at, 'due_baru', n.due_at));
    perform app_private.notify_followers(n, 'STATUS', format('Target selesai laporan %s diubah', n.code),
      format('Target selesai kini %s.', public.fmt_wib(n.due_at)), v_uid);
    perform app_private.notify(n.assignee_id, n.id, 'DUE_CHANGED', format('Tenggat %s diubah', n.code),
      format('Tenggat baru: %s.', public.fmt_wib(n.due_at)), '/petugas/tugas/' || n.id);
  end if;
  if cardinality(array_remove(v_ubah, 'tenggat')) > 0 then
    perform app_private.add_event(n, 'DETAILS_UPDATED', null, null, a, 'Admin',
      'Data laporan diperbarui: ' || array_to_string(array_remove(v_ubah, 'tenggat'), ', '), v_note, true);
  end if;

  return jsonb_build_object('id', n.id, 'code', n.code, 'status', n.status,
    'status_label', public.status_label(n.status), 'diubah', to_jsonb(v_ubah));
end;
$$;

comment on function public.transition_report(text, uuid, jsonb) is
  'Satu-satunya pintu perubahan laporan. Aksi admin: update_details, reopen, delete, restore; aksi lain (submit, verify, assign, ...) diteruskan ke app_private.transition_core.';
revoke all on function public.transition_report(text, uuid, jsonb) from public, anon;
grant execute on function public.transition_report(text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Kelola akun oleh supervisor
-- ---------------------------------------------------------------------------
create or replace function public.staff_list_accounts()
returns table (
  id uuid, email text, full_name text, phone text, role public.user_role, agency_id uuid, agency_name text,
  is_active boolean, is_demo boolean, active_tasks bigint, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if coalesce(public.app_role() <> 'SUPERVISOR', true) then
    perform app_private.raise_app('Hanya supervisor yang dapat mengelola akun.', 'TIDAK_BERHAK');
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.agency_id, ag.short_name, p.is_active, p.is_demo,
      (select count(*) from public.reports r where r.assignee_id = p.id and r.deleted_at is null
        and r.status in ('ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW')),
      p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.agencies ag on ag.id = p.agency_id
    where p.deleted_at is null
    order by case p.role when 'SUPERVISOR' then 0 when 'ADMIN' then 1 when 'OFFICER' then 2 else 3 end, p.full_name;
end;
$$;

create or replace function public.supervisor_set_profile(p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  t public.profiles;
  v_role public.user_role;
  v_agency uuid;
  v_active boolean;
  v_nama text;
  v_hp text;
  v_tugas int;
begin
  if coalesce(public.app_role() <> 'SUPERVISOR', true) then
    perform app_private.raise_app('Hanya supervisor yang dapat mengelola akun.', 'TIDAK_BERHAK');
  end if;
  select * into t from public.profiles where id = p_user and deleted_at is null for update;
  if not found then
    perform app_private.raise_app('Akun tidak ditemukan.', 'TIDAK_DITEMUKAN');
  end if;

  v_role := coalesce(nullif(p_payload ->> 'role', '')::public.user_role, t.role);
  v_active := coalesce((p_payload ->> 'is_active')::boolean, t.is_active);
  v_nama := coalesce(nullif(trim(p_payload ->> 'full_name'), ''), t.full_name);
  v_hp := case when p_payload ? 'phone' then nullif(trim(p_payload ->> 'phone'), '') else t.phone end;
  v_agency := case when v_role = 'OFFICER'
    then coalesce(app_private.to_uuid(p_payload ->> 'agency_id'), t.agency_id) else null end;

  if p_user = v_uid and (v_role <> t.role or not v_active) then
    perform app_private.raise_app('Anda tidak dapat mengubah peran atau menonaktifkan akun Anda sendiri.', 'TIDAK_BERHAK');
  end if;
  if (p_payload ? 'full_name') and length(v_nama) not between 2 and 120 then
    perform app_private.raise_app('Nama perlu 2 sampai 120 karakter.', 'DATA_TIDAK_VALID');
  end if;
  if v_hp is not null and v_hp !~ '^\+?[0-9 -]{8,20}$' then
    perform app_private.raise_app('Nomor HP tidak valid. Contoh: 0812 3456 7890.', 'DATA_TIDAK_VALID');
  end if;
  if v_role = 'OFFICER' and not exists (
    select 1 from public.agencies where id = v_agency and kind = 'INTERNAL' and is_active and deleted_at is null) then
    perform app_private.raise_app('Petugas lapangan wajib memilih instansi internal.', 'DATA_TIDAK_VALID');
  end if;
  -- Petugas yang masih memegang tugas tidak boleh dipindah/dinonaktifkan sebelum tugasnya dialihkan.
  if t.role = 'OFFICER' and (v_role <> 'OFFICER' or not v_active or v_agency is distinct from t.agency_id) then
    select count(*) into v_tugas from public.reports
    where assignee_id = t.id and deleted_at is null and status in ('ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW');
    if v_tugas > 0 then
      perform app_private.raise_app(format('Petugas ini masih memegang %s tugas aktif. Minta admin mengalihkannya dulu.', v_tugas), 'DATA_DIPAKAI');
    end if;
  end if;

  update public.profiles set role = v_role, agency_id = v_agency, is_active = v_active, full_name = v_nama, phone = v_hp
  where id = t.id returning * into t;
  return jsonb_build_object('id', t.id, 'role', t.role, 'is_active', t.is_active, 'agency_id', t.agency_id);
end;
$$;

revoke all on function public.staff_list_accounts() from public, anon;
revoke all on function public.supervisor_set_profile(uuid, jsonb) from public, anon;
grant execute on function public.staff_list_accounts() to authenticated;
grant execute on function public.supervisor_set_profile(uuid, jsonb) to authenticated;

-- Supervisor kini juga boleh melihat data master yang terhapus/nonaktif (sudah lewat is_staff).
-- Pengaturan teks hero beranda yang dapat diubah admin.
insert into public.site_settings (key, value, description) values
  ('beranda.judul', '"Bersama kita rawat Medan, mulai dari satu laporan."', 'Judul besar hero beranda. Kata "Medan" diberi garis kuning.'),
  ('beranda.kata_berganti', '"jalan berlubang, parit tersumbat, sampah menumpuk, lampu jalan mati, pohon tumbang"', 'Kata berganti di hero, dipisah koma.'),
  ('beranda.kalimat_pembuka', '"Laporkan sekarang, lalu pantau setiap langkahnya. Laporan baru dinyatakan selesai setelah ada bukti foto sebelum dan sesudah diperbaiki."', 'Kalimat di bawah judul hero.')
on conflict (key) do update set description = excluded.description
  where public.site_settings.key in ('beranda.judul', 'beranda.kata_berganti');
