-- ONE PORTAL · Migrasi 8: alamat domisili akun
--
-- Setiap akun baru wajib mengisi alamat domisili saat ini: alamat (jalan,
-- nomor rumah, gang/lingkungan), RT, RW, kode pos, kecamatan, dan kelurahan
-- (Kota Medan). Pendaftaran warga (/daftar) dan pembuatan akun oleh supervisor
-- (/supervisor/akun) sama-sama mewajibkannya.
--
-- Alamat disimpan di tabel terpisah, bukan di profiles, agar alamat rumah tidak
-- ikut terbaca lewat kebijakan RLS profil (mis. petugas yang melihat kontak
-- pelapor tugasnya). Yang dapat membaca: pemilik akun dan supervisor.
-- Penulisan hanya lewat fungsi (validasi + pesan Bahasa Indonesia).

-- Kunci gabungan untuk memastikan kelurahan memang berada di kecamatan yang dipilih.
alter table public.villages add constraint villages_code_district_key unique (code, district_code);

create table public.profile_addresses (
  id uuid primary key references public.profiles (id) on delete cascade,
  address text not null check (length(trim(address)) between 5 and 300),
  rt text not null check (rt ~ '^\d{3}$' and rt <> '000'),
  rw text not null check (rw ~ '^\d{3}$' and rw <> '000'),
  postal_code text not null check (postal_code ~ '^\d{5}$'),
  district_code text not null,
  village_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kelurahan_sesuai_kecamatan foreign key (village_code, district_code)
    references public.villages (code, district_code) on update cascade
);
comment on table public.profile_addresses is
  'Alamat domisili saat ini per akun (RT/RW, kode pos, kecamatan, kelurahan). Hanya terbaca pemilik dan supervisor.';

create index profile_addresses_district_idx on public.profile_addresses (district_code);
create index profile_addresses_village_idx on public.profile_addresses (village_code);

create trigger set_updated_at before update on public.profile_addresses
  for each row execute function app_private.set_updated_at();
create trigger write_audit after insert or update or delete on public.profile_addresses
  for each row execute function app_private.write_audit();

alter table public.profile_addresses enable row level security;
create policy "pengguna membaca alamat sendiri" on public.profile_addresses for select
  using (id = auth.uid());
create policy "supervisor membaca semua alamat" on public.profile_addresses for select
  using (public.app_role() = 'SUPERVISOR');
revoke all on public.profile_addresses from anon, authenticated;
grant select on public.profile_addresses to authenticated;

-- ---------------------------------------------------------------------------
-- Validasi & simpan (satu pintu untuk pendaftaran, pengguna, dan supervisor)
-- Payload: { address, rt, rw, postal_code, district_code, village_code }
-- ---------------------------------------------------------------------------
create or replace function app_private.save_address(p_user uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_addr text := nullif(trim(p ->> 'address'), '');
  v_rt text := nullif(regexp_replace(coalesce(p ->> 'rt', ''), '\s', '', 'g'), '');
  v_rw text := nullif(regexp_replace(coalesce(p ->> 'rw', ''), '\s', '', 'g'), '');
  v_pos text := nullif(regexp_replace(coalesce(p ->> 'postal_code', ''), '\s', '', 'g'), '');
  v_kec text := nullif(trim(p ->> 'district_code'), '');
  v_kel text := nullif(trim(p ->> 'village_code'), '');
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    perform app_private.raise_app('Isi alamat domisili saat ini.', 'DATA_TIDAK_VALID');
  end if;
  if v_addr is null or length(v_addr) not between 5 and 300 then
    perform app_private.raise_app('Tulis alamat domisili (jalan, nomor rumah, gang), 5 sampai 300 karakter.', 'DATA_TIDAK_VALID');
  end if;
  -- Tanpa cast ke angka: urutan evaluasi OR tidak dijamin, jadi '0'/'000' ditolak lewat pola.
  if v_rt is null or v_rt !~ '^\d{1,3}$' or v_rt ~ '^0+$' then
    perform app_private.raise_app('RT diisi angka 1 sampai 3 digit, contoh: 003.', 'DATA_TIDAK_VALID');
  end if;
  if v_rw is null or v_rw !~ '^\d{1,3}$' or v_rw ~ '^0+$' then
    perform app_private.raise_app('RW diisi angka 1 sampai 3 digit, contoh: 005.', 'DATA_TIDAK_VALID');
  end if;
  if v_pos is null or v_pos !~ '^\d{5}$' then
    perform app_private.raise_app('Kode pos terdiri dari 5 angka, contoh: 20228.', 'DATA_TIDAK_VALID');
  end if;
  if not exists (
    select 1 from public.villages v
    join public.districts d on d.code = v.district_code
    where v.code = v_kel and v.district_code = v_kec
      and v.is_active and v.deleted_at is null and d.is_active and d.deleted_at is null
  ) then
    perform app_private.raise_app('Pilih kecamatan dan kelurahan domisili yang sesuai.', 'DATA_TIDAK_VALID');
  end if;

  insert into public.profile_addresses (id, address, rt, rw, postal_code, district_code, village_code)
  values (p_user, v_addr, lpad(v_rt, 3, '0'), lpad(v_rw, 3, '0'), v_pos, v_kec, v_kel)
  on conflict (id) do update set
    address = excluded.address, rt = excluded.rt, rw = excluded.rw, postal_code = excluded.postal_code,
    district_code = excluded.district_code, village_code = excluded.village_code;
end;
$$;
revoke all on function app_private.save_address(uuid, jsonb) from public, anon, authenticated;

-- Pendaftaran: alamat dari metadata `domicile` (divalidasi server action lebih dulu;
-- data tidak sah dari pemanggil langsung API membuat pendaftaran gagal).
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
  if jsonb_typeof(new.raw_user_meta_data -> 'domicile') = 'object' then
    perform app_private.save_address(new.id, new.raw_user_meta_data -> 'domicile');
  end if;
  return new;
end;
$$;

-- Pengguna mengisi/mengubah alamat domisilinya sendiri (mis. akun lama yang belum punya alamat).
create or replace function public.save_my_address(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    perform app_private.raise_app('Anda perlu masuk terlebih dahulu.', 'BELUM_MASUK');
  end if;
  if public.app_role() is null then
    perform app_private.raise_app('Akun Anda tidak aktif. Hubungi supervisor.', 'AKUN_NONAKTIF');
  end if;
  perform app_private.save_address(auth.uid(), p_payload);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.save_my_address(jsonb) from public, anon;
grant execute on function public.save_my_address(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Supervisor: kelola akun kini juga menetapkan alamat domisili (payload.domicile)
-- ---------------------------------------------------------------------------
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

  if p_payload ? 'domicile' then
    perform app_private.save_address(t.id, p_payload -> 'domicile');
  end if;
  return jsonb_build_object('id', t.id, 'role', t.role, 'is_active', t.is_active, 'agency_id', t.agency_id);
end;
$$;

revoke all on function public.supervisor_set_profile(uuid, jsonb) from public, anon;
grant execute on function public.supervisor_set_profile(uuid, jsonb) to authenticated;
