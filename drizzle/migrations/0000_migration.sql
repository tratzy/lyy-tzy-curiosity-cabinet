
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- Is there already an admin? (lets the login page hide registration)
create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin') $$;
grant execute on function public.admin_exists() to anon, authenticated;

-- New user: profile + first account becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  uname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  insert into public.profiles (id, username) values (new.id, uname);
  perform pg_advisory_xact_lock(424242);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tools
create type public.tool_kind as enum ('static', 'dynamic');

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.tools(id) on delete cascade,
  kind public.tool_kind not null default 'dynamic',
  name text not null,
  slug text not null unique,
  description text not null default '',
  icon text not null default 'Wrench',
  category text not null default 'Tools',
  badge text,
  method text not null default 'GET' check (method in ('GET','POST','PUT','PATCH','DELETE')),
  endpoint text,
  body_type text not null default 'json' check (body_type in ('json','form','query')),
  params jsonb not null default '[]'::jsonb,
  response_type text not null default 'auto' check (response_type in ('auto','json','image','video','audio','text')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tools_parent_idx on public.tools(parent_id);

grant select on public.tools to anon;
grant select, insert, update, delete on public.tools to authenticated;
grant all on public.tools to service_role;
alter table public.tools enable row level security;

create policy "Anyone can view active tools" on public.tools for select to anon, authenticated using (is_active = true);
create policy "Admins can view all tools" on public.tools for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert tools" on public.tools for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update tools" on public.tools for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete tools" on public.tools for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Secret headers (API keys) — admin only, read by the server proxy
create table public.tool_secrets (
  tool_id uuid primary key references public.tools(id) on delete cascade,
  headers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tool_secrets to authenticated;
grant all on public.tool_secrets to service_role;
alter table public.tool_secrets enable row level security;
create policy "Admins manage tool secrets" on public.tool_secrets for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger tools_touch before update on public.tools for each row execute function public.touch_updated_at();
create trigger tool_secrets_touch before update on public.tool_secrets for each row execute function public.touch_updated_at();

-- Seed tools
insert into public.tools (id, kind, name, slug, description, icon, category, badge, sort_order) values
  ('11111111-1111-4111-8111-111111111111', 'static', 'Maker', 'maker', 'Kumpulan generator gambar: Brat, BratVid, QR Code', 'Sparkles', 'Maker', '3 TOOLS', 1),
  ('22222222-2222-4222-8222-222222222222', 'static', 'Utility', 'utility', 'Translate, IP lookup, dan kamus dalam satu tempat', 'Wrench', 'Tools', '3 TOOLS', 2);

insert into public.tools (parent_id, kind, name, slug, description, icon, category, badge, method, endpoint, params, response_type, sort_order) values
  ('11111111-1111-4111-8111-111111111111', 'dynamic', 'Brat', 'brat', 'Gambar teks gaya Brat', 'Type', 'Maker', 'PNG', 'GET',
   'https://api.siputzx.my.id/api/m/brat',
   '[{"key":"text","label":"Teks","type":"textarea","placeholder":"Tulis teks brat...","required":true}]'::jsonb, 'image', 1),
  ('11111111-1111-4111-8111-111111111111', 'dynamic', 'BratVid', 'bratvid', 'Brat versi animasi (GIF)', 'Film', 'Maker', 'GIF', 'GET',
   'https://api.siputzx.my.id/api/m/brat?isAnimated=true',
   '[{"key":"text","label":"Teks","type":"textarea","placeholder":"Tulis teks animasi...","required":true}]'::jsonb, 'image', 2),
  ('11111111-1111-4111-8111-111111111111', 'dynamic', 'QR Code', 'qr-code', 'Buat QR code dari teks atau link', 'QrCode', 'Maker', 'QR', 'GET',
   'https://api.qrserver.com/v1/create-qr-code/?size=512x512',
   '[{"key":"data","label":"Teks / Link","type":"text","placeholder":"https://...","required":true}]'::jsonb, 'image', 3),
  ('22222222-2222-4222-8222-222222222222', 'dynamic', 'Translate', 'translate', 'Terjemahkan teks ke bahasa lain', 'Languages', 'Tools', 'AI', 'GET',
   'https://api.siputzx.my.id/api/tools/translate?source=auto',
   '[{"key":"text","label":"Teks","type":"textarea","placeholder":"Hello world","required":true},{"key":"target","label":"Bahasa tujuan","type":"select","options":["id","en","ja","ko","ar","es"],"default":"id","required":true}]'::jsonb, 'json', 1),
  ('22222222-2222-4222-8222-222222222222', 'dynamic', 'IP Lookup', 'ip-lookup', 'Cek lokasi dan info sebuah IP', 'Globe', 'Tools', 'LOOKUP', 'GET',
   'https://ipwho.is/{ip}',
   '[{"key":"ip","label":"Alamat IP","type":"text","placeholder":"8.8.8.8","required":true}]'::jsonb, 'json', 2),
  ('22222222-2222-4222-8222-222222222222', 'dynamic', 'Kamus Inggris', 'kamus-inggris', 'Arti dan contoh kata bahasa Inggris', 'BookOpen', 'Tools', 'DICT', 'GET',
   'https://api.dictionaryapi.dev/api/v2/entries/en/{word}',
   '[{"key":"word","label":"Kata","type":"text","placeholder":"hello","required":true}]'::jsonb, 'json', 3);

insert into public.tools (kind, name, slug, description, icon, category, badge, method, endpoint, params, response_type, sort_order) values
  ('dynamic', 'Tebak Umur', 'tebak-umur', 'Tebak umur dari sebuah nama', 'Cake', 'Fun', 'FUN', 'GET',
   'https://api.agify.io', '[{"key":"name","label":"Nama","type":"text","placeholder":"Rizky","required":true}]'::jsonb, 'json', 3),
  ('dynamic', 'Random Advice', 'random-advice', 'Dapatkan nasihat acak setiap klik', 'Lightbulb', 'Fun', 'RANDOM', 'GET',
   'https://api.adviceslip.com/advice', '[]'::jsonb, 'json', 4),
  ('dynamic', 'Cat Fact', 'cat-fact', 'Fakta unik tentang kucing', 'Cat', 'Fun', 'FACT', 'GET',
   'https://catfact.ninja/fact', '[]'::jsonb, 'json', 5);
