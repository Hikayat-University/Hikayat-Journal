-- ============================================================
-- Hikayat Journal — Skema Inti
-- Peran: setiap akun yang login otomatis dianggap admin.
-- Tamu adalah siapa pun yang TIDAK login (anon key, tanpa sesi).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profil admin
-- Baris ini dibuat otomatis begitu seseorang mendaftar lewat
-- Supabase Auth. Kolom role selalu 'admin' pada versi ini karena
-- hanya admin yang punya akun; tamu tidak pernah punya baris di sini.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Semua admin boleh melihat daftar admin lain (untuk halaman Kelola Admin)
create policy "admin dapat melihat semua profil"
  on public.profiles for select
  using (auth.uid() is not null);

-- Seseorang hanya boleh mengubah profilnya sendiri
create policy "admin dapat mengubah profil sendiri"
  on public.profiles for update
  using (auth.uid() = id);

-- Fungsi + trigger: begitu user baru terdaftar di auth.users,
-- otomatis buat baris profil dengan role 'admin'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'admin');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. Jurnal
-- Konten umum: tamu dan admin sama-sama bisa membaca yang
-- berstatus 'published'. Hanya admin yang bisa insert/update/delete,
-- dan hanya admin yang bisa melihat draft.
-- ------------------------------------------------------------
create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  abstract text,
  file_url text,              -- link ke file PDF di Supabase Storage
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journals enable row level security;

create policy "siapa saja dapat membaca jurnal terbit"
  on public.journals for select
  using (status = 'published' or auth.uid() is not null);

create policy "admin dapat menambah jurnal"
  on public.journals for insert
  with check (auth.uid() is not null);

create policy "admin dapat mengubah jurnal"
  on public.journals for update
  using (auth.uid() is not null);

create policy "admin dapat menghapus jurnal"
  on public.journals for delete
  using (auth.uid() is not null);


-- ------------------------------------------------------------
-- 3. Artikel
-- Sama seperti jurnal, tapi kontennya teks langsung (bukan file).
-- ------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  excerpt text,
  content text,               -- isi artikel, boleh markdown/HTML sederhana
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

create policy "siapa saja dapat membaca artikel terbit"
  on public.articles for select
  using (status = 'published' or auth.uid() is not null);

create policy "admin dapat menambah artikel"
  on public.articles for insert
  with check (auth.uid() is not null);

create policy "admin dapat mengubah artikel"
  on public.articles for update
  using (auth.uid() is not null);

create policy "admin dapat menghapus artikel"
  on public.articles for delete
  using (auth.uid() is not null);


-- ------------------------------------------------------------
-- 4. Notulensi kelas
-- HANYA admin yang boleh membaca sama sekali. Tamu tidak
-- mendapat akses select apa pun ke tabel ini.
-- ------------------------------------------------------------
create table if not exists public.class_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_name text,
  session_date date,
  file_url text,
  summary text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_notes enable row level security;

create policy "hanya admin dapat membaca notulensi"
  on public.class_notes for select
  using (auth.uid() is not null);

create policy "admin dapat menambah notulensi"
  on public.class_notes for insert
  with check (auth.uid() is not null);

create policy "admin dapat mengubah notulensi"
  on public.class_notes for update
  using (auth.uid() is not null);

create policy "admin dapat menghapus notulensi"
  on public.class_notes for delete
  using (auth.uid() is not null);


-- ------------------------------------------------------------
-- Trigger updated_at generik
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.journals
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.articles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.class_notes
  for each row execute procedure public.set_updated_at();
