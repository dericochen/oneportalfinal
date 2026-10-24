-- ONE PORTAL · Migrasi 6: daftar wilayah untuk form laporan (kecamatan + titik
-- pusat dalam lat/lng + kelurahan), dalam satu panggilan.

create or replace function public.daftar_wilayah()
returns jsonb
language sql stable security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'kode', d.code,
    'nama', d.name,
    'lat', ST_Y(d.center::geometry),
    'lng', ST_X(d.center::geometry),
    'kelurahan', (
      select coalesce(jsonb_agg(jsonb_build_object('kode', v.code, 'nama', v.name) order by v.name), '[]')
      from public.villages v
      where v.district_code = d.code and v.is_active and v.deleted_at is null
    )
  ) order by d.name), '[]')
  from public.districts d
  where d.is_active and d.deleted_at is null
$$;

grant execute on function public.daftar_wilayah() to anon, authenticated;
