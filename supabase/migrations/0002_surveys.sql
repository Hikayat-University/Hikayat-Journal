-- ============================================================
-- Hikayat Journal — Fitur Angket Riset
-- Angket diakses lewat link unlisted (slug acak), TIDAK ditautkan
-- di navigasi publik manapun. Siapa saja yang punya link boleh
-- mengisi tanpa login. Hasil hanya bisa dilihat oleh admin
-- (siapa pun yang login — sesuai keputusan: semua admin lihat semua hasil).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Angket (survey)
-- ------------------------------------------------------------
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default encode(gen_random_bytes(9), 'base64url'), -- link unlisted
  title text not null,
  description text,
  consent_text text,            -- teks persetujuan responden, ditampilkan sebelum mengisi
  is_open boolean not null default true,   -- admin bisa menutup pengisian
  is_anonymous boolean not null default true, -- kalau true, tidak menyimpan email/IP responden
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.surveys enable row level security;

-- Tamu HANYA boleh membaca angket lewat slug-nya (bukan listing semua),
-- dan hanya kalau sedang dibuka. Ini ditegakkan lewat cara aplikasi query
-- (selalu filter by slug), didukung policy select terbuka pada is_open.
create policy "siapa saja dapat membaca angket yang terbuka via slug"
  on public.surveys for select
  using (is_open = true or auth.uid() is not null);

create policy "admin dapat membuat angket"
  on public.surveys for insert
  with check (auth.uid() is not null);

create policy "admin dapat mengubah angket"
  on public.surveys for update
  using (auth.uid() is not null);

create policy "admin dapat menghapus angket"
  on public.surveys for delete
  using (auth.uid() is not null);

create trigger set_updated_at before update on public.surveys
  for each row execute procedure public.set_updated_at();


-- ------------------------------------------------------------
-- 2. Pertanyaan angket
-- ------------------------------------------------------------
create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  position int not null default 0,
  question_text text not null,
  question_type text not null check (
    question_type in ('short_text', 'long_text', 'single_choice', 'multi_choice', 'likert', 'dropdown')
  ),
  options jsonb,              -- untuk single_choice/multi_choice/dropdown: ["Opsi A", "Opsi B", ...]
  likert_scale int,           -- untuk likert: jumlah titik skala, mis. 5 atau 7
  likert_labels jsonb,        -- untuk likert: label ujung skala, mis. {"low": "Sangat tidak setuju", "high": "Sangat setuju"}
  is_required boolean not null default true
);

alter table public.survey_questions enable row level security;

create policy "pertanyaan ikut aturan angket induk (select)"
  on public.survey_questions for select
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id and (s.is_open = true or auth.uid() is not null)
    )
  );

create policy "admin dapat mengelola pertanyaan"
  on public.survey_questions for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- ------------------------------------------------------------
-- 3. Respons (satu baris = satu orang mengisi satu angket)
-- Kalau survey.is_anonymous = true, kolom respondent_email harus NULL —
-- ditegakkan di aplikasi, bukan di database, supaya form tetap fleksibel.
-- ------------------------------------------------------------
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  respondent_email text,      -- diisi hanya kalau angket tidak anonim
  submitted_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

-- Tamu boleh INSERT (mengisi angket) selama angket sedang terbuka.
-- Tamu TIDAK boleh SELECT — supaya tidak bisa membaca jawaban orang lain.
create policy "siapa saja dapat mengisi angket yang terbuka"
  on public.survey_responses for insert
  with check (
    exists (select 1 from public.surveys s where s.id = survey_id and s.is_open = true)
  );

create policy "hanya admin dapat membaca respons"
  on public.survey_responses for select
  using (auth.uid() is not null);

create policy "hanya admin dapat menghapus respons"
  on public.survey_responses for delete
  using (auth.uid() is not null);


-- ------------------------------------------------------------
-- 4. Jawaban per pertanyaan
-- ------------------------------------------------------------
create table if not exists public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  question_id uuid not null references public.survey_questions (id) on delete cascade,
  answer_text text,           -- short_text / long_text
  answer_choice text,         -- single_choice / dropdown
  answer_choices jsonb,       -- multi_choice: ["Opsi A", "Opsi C"]
  answer_number int           -- likert
);

alter table public.survey_answers enable row level security;

create policy "siapa saja dapat menambah jawaban saat mengisi"
  on public.survey_answers for insert
  with check (
    exists (
      select 1 from public.survey_responses r
      join public.surveys s on s.id = r.survey_id
      where r.id = response_id and s.is_open = true
    )
  );

create policy "hanya admin dapat membaca jawaban"
  on public.survey_answers for select
  using (auth.uid() is not null);
