-- ONE PORTAL · Migrasi 1: skema inti
-- Postgres 15+ (Supabase) dengan PostGIS. Nama tabel/kolom bahasa Inggris;
-- teks yang tampil ke pengguna berbahasa Indonesia.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('CITIZEN', 'ADMIN', 'OFFICER', 'SUPERVISOR');

create type public.report_status as enum (
  'SUBMITTED',     -- Diterima
  'VERIFIED',      -- Diverifikasi
  'ASSIGNED',      -- Ditugaskan
  'IN_PROGRESS',   -- Dikerjakan
  'UNDER_REVIEW',  -- Peninjauan bukti
  'RESOLVED',      -- Selesai (final)
  'REJECTED',      -- Ditolak (final)
  'FORWARDED',     -- Diteruskan (final)
  'MERGED'         -- Digabungkan (final)
);

-- Urutan enum = urutan antrean (Darurat lebih dulu).
create type public.report_priority as enum ('EMERGENCY', 'HIGH', 'MEDIUM', 'LOW');

create type public.agency_kind as enum ('INTERNAL', 'EXTERNAL');

create type public.media_kind as enum ('INITIAL', 'PROGRESS', 'BEFORE', 'AFTER', 'SUPPORTING');

create type public.report_event_type as enum (
  'SUBMITTED', 'VERIFIED', 'ASSIGNED', 'REASSIGNED', 'STARTED', 'PROGRESS',
  'PROOF_SUBMITTED', 'PROOF_APPROVED', 'PROOF_RETURNED',
  'REJECTED', 'FORWARDED', 'MERGED', 'CHILD_MERGED',
  'NOTE', 'ESCALATED', 'SUPPORTED', 'MEDIA_HIDDEN', 'MEDIA_SHOWN', 'FLAGGED', 'RECURRENCE_LINKED'
);

create type public.proof_status as enum ('PENDING', 'APPROVED', 'RETURNED');

create type public.service_status as enum ('DRAFT', 'PUBLISHED', 'INACTIVE');
create type public.news_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.news_kind as enum ('NEWS', 'ANNOUNCEMENT', 'DISRUPTION');

create type public.facility_kind as enum (
  'PUSKESMAS', 'HOSPITAL', 'SCHOOL', 'DISTRICT_OFFICE', 'VILLAGE_OFFICE', 'SERVICE_OFFICE', 'PARK', 'MARKET', 'OTHER'
);

-- ---------------------------------------------------------------------------
-- Wilayah
-- ---------------------------------------------------------------------------
create table public.city_boundaries (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  osm_relation_id bigint,
  boundary extensions.geometry(MultiPolygon, 4326) not null,
  updated_at timestamptz not null default now()
);
comment on table public.city_boundaries is 'Batas Kota Medan (satu baris). Sumber: OpenStreetMap (ODbL).';

create table public.districts (
  code text primary key check (code ~ '^\d{2}\.\d{2}\.\d{2}$'),
  name text not null unique,
  center extensions.geography(Point, 4326),
  boundary extensions.geometry(MultiPolygon, 4326),
  osm_relation_id bigint,
  population integer check (population is null or population >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.districts is 'Kecamatan. Kode wilayah Kemendagri; titik pusat dan batas dari OpenStreetMap.';

create table public.villages (
  code text primary key check (code ~ '^\d{2}\.\d{2}\.\d{2}\.\d{4}$'),
  district_code text not null references public.districts (code) on update cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (district_code, name)
);
comment on table public.villages is 'Kelurahan. Kode dan nama dari data kode wilayah Kemendagri.';

-- ---------------------------------------------------------------------------
-- Instansi & pengguna
-- ---------------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) between 3 and 160),
  short_name text not null check (length(trim(short_name)) between 2 and 60),
  kind public.agency_kind not null default 'INTERNAL',
  description text,
  contact_phone text,
  contact_email text,
  address text,
  website text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.agencies is 'Instansi internal (OPD Pemko, simulasi) dan eksternal (tujuan status Diteruskan).';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 -]{8,20}$'),
  role public.user_role not null default 'CITIZEN',
  agency_id uuid references public.agencies (id),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint petugas_wajib_instansi check (role <> 'OFFICER' or agency_id is not null)
);
comment on table public.profiles is 'Profil pengguna. Tanpa NIK (prinsip minimisasi data UU PDP).';

-- ---------------------------------------------------------------------------
-- Kategori & SLA
-- ---------------------------------------------------------------------------
create table public.report_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) between 3 and 80),
  description text,
  icon text not null default 'lainnya',
  default_agency_id uuid references public.agencies (id),
  -- Kategori yang biasanya bukan kewenangan Pemko (mis. air bersih) diberi saran "Teruskan".
  suggest_forward_agency_id uuid references public.agencies (id),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.report_categories (id) on delete cascade,
  priority public.report_priority not null,
  target_hours integer not null check (target_hours between 1 and 2160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, priority)
);
comment on table public.sla_policies is 'Matriks SLA kategori x prioritas. Default: Darurat 24 jam, Tinggi 72 jam, Sedang 7 hari, Rendah 14 hari.';

-- ---------------------------------------------------------------------------
-- Layanan (ONE SERVICE)
-- ---------------------------------------------------------------------------
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) between 3 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) between 3 and 160),
  summary text not null default '',
  category_id uuid not null references public.service_categories (id),
  agency_id uuid references public.agencies (id),
  status public.service_status not null default 'DRAFT',
  -- Daftar dinamis berurutan: [{ "teks": "...", "catatan": "..." }]
  requirements jsonb not null default '[]'::jsonb check (jsonb_typeof(requirements) = 'array'),
  -- [{ "judul": "...", "rincian": "..." }]
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  duration text,
  cost text,
  product text,
  complaint_info text,
  hours text,
  location_name text,
  address text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  contact_phone text,
  contact_email text,
  legal_basis text,
  needs_review boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on column public.services.needs_review is 'Ditandai bila biaya/dasar hukum belum pasti dan perlu dicek tim.';

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) between 5 and 300),
  answer text not null check (length(trim(answer)) >= 5),
  service_id uuid references public.services (id) on delete set null,
  topic text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (length(trim(title)) between 5 and 200),
  kind public.news_kind not null default 'NEWS',
  summary text not null default '',
  body text not null default '',
  status public.news_status not null default 'DRAFT',
  is_pinned boolean not null default false,
  cover_path text,
  published_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 120),
  body text,
  link_url text,
  link_label text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) between 3 and 160),
  kind public.facility_kind not null default 'OTHER',
  address text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326),
  district_code text references public.districts (code) on update cascade,
  village_code text references public.villages (code) on update cascade,
  -- Token acak untuk URL /f/[qr]; bukan id berurutan.
  qr_token text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  osm_ref text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.facilities is 'Fasilitas publik. Data dari OpenStreetMap (ODbL), atribusi wajib.';

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------------
-- Laporan (ONE REPORT)
-- ---------------------------------------------------------------------------
create table public.area_cases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^AC-\d{4}-\d{3,}$'),
  title text not null check (length(trim(title)) between 5 and 160),
  description text,
  district_code text references public.districts (code) on update cascade,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.report_code_counters (
  year integer primary key,
  last_number integer not null default 0
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^OP-\d{4}-\d{5}$'),
  title text not null check (length(trim(title)) between 10 and 120),
  description text not null check (length(trim(description)) between 20 and 2000),
  category_id uuid not null references public.report_categories (id),
  service_id uuid references public.services (id) on delete set null,
  facility_id uuid references public.facilities (id) on delete set null,

  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326),
  district_code text not null references public.districts (code) on update cascade,
  village_code text not null references public.villages (code) on update cascade,
  address text not null check (length(trim(address)) between 5 and 300),

  reporter_id uuid not null references public.profiles (id),
  is_anonymous boolean not null default false,
  is_confidential boolean not null default false,
  reporter_phone text check (reporter_phone is null or reporter_phone ~ '^\+?[0-9 -]{8,20}$'),
  consent_at timestamptz not null,
  channel text not null default 'WEB' check (channel in ('WEB', 'QR', 'PHONE', 'WALK_IN', 'SOCIAL')),

  status public.report_status not null default 'SUBMITTED',
  priority public.report_priority,
  priority_reasons text[] not null default '{}',
  priority_note text,
  agency_id uuid references public.agencies (id),
  assignee_id uuid references public.profiles (id),
  sla_target_hours integer,
  due_at timestamptz,
  sla_stopped_at timestamptz,
  escalated_at timestamptz,

  parent_id uuid references public.reports (id),
  previous_report_id uuid references public.reports (id),
  area_case_id uuid references public.area_cases (id) on delete set null,
  support_count integer not null default 0 check (support_count >= 0),
  affected_count integer not null default 1 check (affected_count >= 1),

  reject_reason text,
  forward_agency_id uuid references public.agencies (id),
  forward_note text,
  needs_action boolean not null default false,
  return_reason text,
  media_hidden boolean not null default false,
  flagged boolean not null default false,

  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  proof_submitted_at timestamptz,
  resolved_at timestamptz,
  rejected_at timestamptz,
  forwarded_at timestamptz,
  merged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint induk_bukan_diri_sendiri check (parent_id is null or parent_id <> id),
  constraint berulang_bukan_diri_sendiri check (previous_report_id is null or previous_report_id <> id),
  constraint merged_punya_induk check (status <> 'MERGED' or parent_id is not null),
  constraint resolved_punya_waktu check (status <> 'RESOLVED' or resolved_at is not null),
  constraint ditolak_punya_alasan check (status <> 'REJECTED' or reject_reason is not null),
  constraint diteruskan_punya_tujuan check (status <> 'FORWARDED' or forward_agency_id is not null),
  constraint ditugaskan_punya_petugas check (
    status not in ('ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW') or assignee_id is not null
  ),
  constraint terverifikasi_punya_prioritas check (
    status in ('SUBMITTED', 'REJECTED', 'FORWARDED', 'MERGED') or (priority is not null and agency_id is not null and due_at is not null)
  )
);
comment on column public.reports.is_anonymous is 'Identitas pelapor disembunyikan dari petugas dan publik.';
comment on column public.reports.is_confidential is 'Tidak tampil di peta/daftar publik; tetap dihitung di statistik agregat.';
comment on column public.reports.sla_stopped_at is 'Waktu pengiriman bukti yang akhirnya disetujui; jam SLA berhenti di sini.';
comment on column public.reports.needs_action is 'Bukti dikembalikan admin: tampil paling atas di daftar petugas.';

create table public.completion_proofs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  officer_id uuid not null references public.profiles (id),
  description text not null check (length(trim(description)) >= 30),
  work_date date not null,
  declaration boolean not null check (declaration),
  status public.proof_status not null default 'PENDING',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table public.report_events (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  type public.report_event_type not null,
  from_status public.report_status,
  to_status public.report_status,
  actor_id uuid references public.profiles (id),
  actor_role public.user_role,
  -- Label yang tampil: peran/instansi, bukan nama pribadi.
  actor_label text not null,
  title text not null,
  note text,
  -- Catatan internal hanya untuk staf.
  is_internal boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.report_events is 'Riwayat (audit trail). Tidak dapat diubah atau dihapus.';

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null unique,
  thumb_path text,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/webp', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  width integer,
  height integer,
  caption text,
  proof_id uuid references public.completion_proofs (id) on delete cascade,
  event_id bigint references public.report_events (id),
  uploaded_by uuid not null references public.profiles (id),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.report_supports (
  report_id uuid not null references public.reports (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Notifikasi, audit, moderasi
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.blocked_words (
  word text primary key check (word ~ '^[a-z]{3,40}$')
);
comment on table public.blocked_words is 'Filter kata kasar sederhana: laporan yang memuatnya ditandai untuk ditinjau, tidak otomatis ditolak.';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
create index districts_boundary_gix on public.districts using gist (boundary);
create index villages_district_idx on public.villages (district_code);
create index profiles_role_idx on public.profiles (role) where deleted_at is null;
create index profiles_agency_idx on public.profiles (agency_id) where role = 'OFFICER';

create index reports_status_idx on public.reports (status) where deleted_at is null;
create index reports_queue_idx on public.reports (status, priority, due_at) where deleted_at is null;
create index reports_category_idx on public.reports (category_id);
create index reports_district_idx on public.reports (district_code);
create index reports_village_idx on public.reports (village_code);
create index reports_agency_idx on public.reports (agency_id);
create index reports_assignee_idx on public.reports (assignee_id, status);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_submitted_idx on public.reports (submitted_at desc);
create index reports_resolved_idx on public.reports (resolved_at desc) where status = 'RESOLVED';
create index reports_due_idx on public.reports (due_at) where status in ('VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW');
create index reports_parent_idx on public.reports (parent_id) where parent_id is not null;
create index reports_previous_idx on public.reports (previous_report_id) where previous_report_id is not null;
create index reports_location_gix on public.reports using gist (location);

create index report_events_report_idx on public.report_events (report_id, created_at desc);
create index report_media_report_idx on public.report_media (report_id, kind);
create index report_media_proof_idx on public.report_media (proof_id) where proof_id is not null;
create index completion_proofs_report_idx on public.completion_proofs (report_id, submitted_at desc);
create index report_supports_user_idx on public.report_supports (user_id);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index audit_logs_table_idx on public.audit_logs (table_name, record_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create index services_category_idx on public.services (category_id) where deleted_at is null;
create index services_status_idx on public.services (status) where deleted_at is null;
create index faqs_service_idx on public.faqs (service_id);
create index news_published_idx on public.news (status, published_at desc) where deleted_at is null;
create index facilities_location_gix on public.facilities using gist (location);
create index facilities_district_idx on public.facilities (district_code);
