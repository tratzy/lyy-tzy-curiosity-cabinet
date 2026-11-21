create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  background_path text,
  background_dim smallint not null default 60 check (background_dim between 0 and 95),
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Anyone can view site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins can insert site settings" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update site settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.site_settings (id) values (1) on conflict do nothing;

create policy "Anyone can read site assets" on storage.objects for select to anon, authenticated using (bucket_id = 'site-assets');
create policy "Admins upload site assets" on storage.objects for insert to authenticated with check (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update site assets" on storage.objects for update to authenticated using (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete site assets" on storage.objects for delete to authenticated using (bucket_id = 'site-assets' and public.has_role(auth.uid(), 'admin'));