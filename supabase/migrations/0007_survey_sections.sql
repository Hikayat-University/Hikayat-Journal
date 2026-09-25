-- ============================================================
-- Hikayat University Archive — Fase angket (survey_sections)
--
-- Tabel ini dulu dibuat langsung dari dashboard Supabase dan tidak
-- tercatat di folder migrasi. File ini mencatat strukturnya persis
-- seperti di database produksi (dicek 25 Sep 2026), supaya database
-- bisa dibangun ulang dari migrasi 0001-0007.
--
-- Aman dijalankan di database yang tabelnya sudah ada: semua perintah
-- memakai "if not exists" atau mengecek dulu, jadi tidak ada yang berubah.
-- ============================================================

create table if not exists public.survey_sections (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  position int not null default 0,
  title text not null,
  description text
);

-- Pertanyaan boleh masuk ke salah satu fase. Menghapus fase ikut
-- menghapus pertanyaan di dalamnya (dan jawaban responden untuknya).
alter table public.survey_questions add column if not exists section_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.survey_questions'::regclass
      and conname = 'survey_questions_section_id_fkey'
  ) then
    alter table public.survey_questions
      add constraint survey_questions_section_id_fkey
      foreign key (section_id) references public.survey_sections (id) on delete cascade;
  end if;
end
$$;

-- Aturan akses, sama dengan yang dipasang migrasi 0006. Diulang di sini
-- karena pada database baru 0006 berjalan sebelum tabel ini ada.
alter table public.survey_sections enable row level security;

drop policy if exists "fase ikut aturan angket induk (select)" on public.survey_sections;
drop policy if exists "admin dapat mengelola fase" on public.survey_sections;

create policy "fase ikut aturan angket induk (select)"
  on public.survey_sections for select
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id and (s.is_open = true or (select public.is_admin()))
    )
  );

create policy "admin dapat mengelola fase"
  on public.survey_sections for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
