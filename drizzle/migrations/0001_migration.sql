
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  video_path text not null,
  title text,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.banners to anon;
grant select, insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;
alter table public.banners enable row level security;

create policy "Anyone can view active banners" on public.banners for select to anon, authenticated using (is_active = true);
create policy "Admins can view all banners" on public.banners for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert banners" on public.banners for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update banners" on public.banners for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete banners" on public.banners for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Storage: banner videos are readable by everyone (via signed links), writable only by admins
create policy "Anyone can read banner videos" on storage.objects for select to anon, authenticated using (bucket_id = 'banners');
create policy "Admins upload banner videos" on storage.objects for insert to authenticated with check (bucket_id = 'banners' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update banner videos" on storage.objects for update to authenticated using (bucket_id = 'banners' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete banner videos" on storage.objects for delete to authenticated using (bucket_id = 'banners' and public.has_role(auth.uid(), 'admin'));
