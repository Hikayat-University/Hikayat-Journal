-- ============================================================
-- Hikayat University Archive — Hanya admin aktif yang boleh menulis
--
-- Sebelumnya semua aturan RLS hanya mengecek "sudah login"
-- (auth.uid() is not null), dan setiap akun baru otomatis ber-role
-- 'admin'. Siapa pun yang bisa mendaftar lewat Supabase Auth jadi admin.
--
-- Migrasi ini:
-- 1. Menambah role 'member' dan menjadikannya default akun baru.
--    Admin baru diangkat oleh Edge Function invite-admin.
-- 2. Membuat fungsi is_admin(): role admin/owner dan tidak dinonaktifkan.
-- 3. Mengganti semua aturan "sudah login" dengan is_admin().
-- 4. Menutup celah: pengguna tidak bisa lagi mengubah profilnya sendiri
--    (dulu termasuk kolom role, jadi siapa pun bisa mengangkat diri jadi admin).
-- 5. Mengaktifkan RLS dan memasang aturan untuk survey_sections.
--
-- Aman dijalankan ulang. Profil yang sudah ada TIDAK diubah; periksa
-- daftar di halaman Kelola Admin dan nonaktifkan akun yang tidak dikenal.
-- ============================================================

-- 1. Role 'member' untuk akun yang belum diangkat jadi admin -----------------

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'owner', 'member'));
alter table public.profiles alter column role set default 'member';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'member');
  return new;
end;
$$;

-- 2. is_admin() -------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
      and disabled_at is null
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3 & 4. Profil ---------------------------------------------------------------

drop policy if exists "admin dapat melihat semua profil" on public.profiles;
drop policy if exists "admin dapat mengubah profil sendiri" on public.profiles;
drop policy if exists "admin melihat semua profil, pengguna melihat profil sendiri" on public.profiles;

-- Admin melihat semua profil (Kelola Admin); pengguna lain hanya profilnya
-- sendiri, supaya aplikasi bisa tahu ia bukan admin.
create policy "admin melihat semua profil, pengguna melihat profil sendiri"
  on public.profiles for select
  using (id = auth.uid() or (select public.is_admin()));
-- Tidak ada policy update/insert/delete: perubahan profil hanya lewat
-- Edge Function (service role) atau trigger.

-- Jurnal ----------------------------------------------------------------------

drop policy if exists "siapa saja dapat membaca jurnal terbit" on public.journals;
drop policy if exists "admin dapat menambah jurnal" on public.journals;
drop policy if exists "admin dapat mengubah jurnal" on public.journals;
drop policy if exists "admin dapat menghapus jurnal" on public.journals;

create policy "siapa saja dapat membaca jurnal terbit"
  on public.journals for select
  using (status = 'published' or (select public.is_admin()));
create policy "admin dapat menambah jurnal"
  on public.journals for insert
  with check ((select public.is_admin()));
create policy "admin dapat mengubah jurnal"
  on public.journals for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "admin dapat menghapus jurnal"
  on public.journals for delete
  using ((select public.is_admin()));

-- Artikel ---------------------------------------------------------------------

drop policy if exists "siapa saja dapat membaca artikel terbit" on public.articles;
drop policy if exists "admin dapat menambah artikel" on public.articles;
drop policy if exists "admin dapat mengubah artikel" on public.articles;
drop policy if exists "admin dapat menghapus artikel" on public.articles;

create policy "siapa saja dapat membaca artikel terbit"
  on public.articles for select
  using (status = 'published' or (select public.is_admin()));
create policy "admin dapat menambah artikel"
  on public.articles for insert
  with check ((select public.is_admin()));
create policy "admin dapat mengubah artikel"
  on public.articles for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "admin dapat menghapus artikel"
  on public.articles for delete
  using ((select public.is_admin()));

-- Notulensi -------------------------------------------------------------------

drop policy if exists "hanya admin dapat membaca notulensi" on public.class_notes;
drop policy if exists "admin dapat menambah notulensi" on public.class_notes;
drop policy if exists "admin dapat mengubah notulensi" on public.class_notes;
drop policy if exists "admin dapat menghapus notulensi" on public.class_notes;

create policy "hanya admin dapat membaca notulensi"
  on public.class_notes for select
  using ((select public.is_admin()));
create policy "admin dapat menambah notulensi"
  on public.class_notes for insert
  with check ((select public.is_admin()));
create policy "admin dapat mengubah notulensi"
  on public.class_notes for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "admin dapat menghapus notulensi"
  on public.class_notes for delete
  using ((select public.is_admin()));

-- Angket ----------------------------------------------------------------------

drop policy if exists "siapa saja dapat membaca angket yang terbuka via slug" on public.surveys;
drop policy if exists "admin dapat membuat angket" on public.surveys;
drop policy if exists "admin dapat mengubah angket" on public.surveys;
drop policy if exists "admin dapat menghapus angket" on public.surveys;

create policy "siapa saja dapat membaca angket yang terbuka via slug"
  on public.surveys for select
  using (is_open = true or (select public.is_admin()));
create policy "admin dapat membuat angket"
  on public.surveys for insert
  with check ((select public.is_admin()));
create policy "admin dapat mengubah angket"
  on public.surveys for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "admin dapat menghapus angket"
  on public.surveys for delete
  using ((select public.is_admin()));

drop policy if exists "pertanyaan ikut aturan angket induk (select)" on public.survey_questions;
drop policy if exists "admin dapat mengelola pertanyaan" on public.survey_questions;

create policy "pertanyaan ikut aturan angket induk (select)"
  on public.survey_questions for select
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id and (s.is_open = true or (select public.is_admin()))
    )
  );
create policy "admin dapat mengelola pertanyaan"
  on public.survey_questions for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Respons & jawaban: tamu tetap boleh mengisi (policy insert tidak diubah),
-- hanya admin yang boleh membaca/menghapus.
drop policy if exists "hanya admin dapat membaca respons" on public.survey_responses;
drop policy if exists "hanya admin dapat menghapus respons" on public.survey_responses;
create policy "hanya admin dapat membaca respons"
  on public.survey_responses for select
  using ((select public.is_admin()));
create policy "hanya admin dapat menghapus respons"
  on public.survey_responses for delete
  using ((select public.is_admin()));

drop policy if exists "hanya admin dapat membaca jawaban" on public.survey_answers;
create policy "hanya admin dapat membaca jawaban"
  on public.survey_answers for select
  using ((select public.is_admin()));

-- 5. Fase angket (survey_sections) -------------------------------------------
-- Tabel ini dibuat di luar folder migrasi, jadi aturan lamanya tidak
-- diketahui. Semua policy lamanya dibuang lalu diganti yang di bawah.

do $$
declare
  p record;
begin
  if to_regclass('public.survey_sections') is null then
    raise notice 'Tabel survey_sections tidak ada, bagian ini dilewati.';
    return;
  end if;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'survey_sections' loop
    execute format('drop policy %I on public.survey_sections', p.policyname);
  end loop;

  execute 'alter table public.survey_sections enable row level security';

  execute $p$
    create policy "fase ikut aturan angket induk (select)"
      on public.survey_sections for select
      using (
        exists (
          select 1 from public.surveys s
          where s.id = survey_id and (s.is_open = true or (select public.is_admin()))
        )
      )
  $p$;

  execute $p$
    create policy "admin dapat mengelola fase"
      on public.survey_sections for all
      using ((select public.is_admin()))
      with check ((select public.is_admin()))
  $p$;
end
$$;

-- Storage -----------------------------------------------------------------------

drop policy if exists "admin unggah media publik" on storage.objects;
drop policy if exists "admin hapus media publik" on storage.objects;
drop policy if exists "hanya admin baca notulensi" on storage.objects;
drop policy if exists "admin unggah notulensi" on storage.objects;
drop policy if exists "admin hapus notulensi" on storage.objects;

create policy "admin unggah media publik"
  on storage.objects for insert
  with check (bucket_id in ('public-media', 'journal-files') and (select public.is_admin()));
create policy "admin hapus media publik"
  on storage.objects for delete
  using (bucket_id in ('public-media', 'journal-files') and (select public.is_admin()));
create policy "hanya admin baca notulensi"
  on storage.objects for select
  using (bucket_id = 'class-notes' and (select public.is_admin()));
create policy "admin unggah notulensi"
  on storage.objects for insert
  with check (bucket_id = 'class-notes' and (select public.is_admin()));
create policy "admin hapus notulensi"
  on storage.objects for delete
  using (bucket_id = 'class-notes' and (select public.is_admin()));
