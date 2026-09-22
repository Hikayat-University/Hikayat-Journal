-- ============================================================
-- Hikayat Journal — Storage Buckets
-- 'public-media'  : cover jurnal/artikel — boleh dibaca siapa saja
-- 'journal-files' : PDF jurnal terbit    — boleh dibaca siapa saja
-- 'class-notes'   : PDF notulensi        — HANYA admin
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('public-media', 'public-media', true),
  ('journal-files', 'journal-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('class-notes', 'class-notes', false)
on conflict (id) do nothing;

-- public-media & journal-files: siapa saja boleh baca, hanya admin boleh tulis
create policy "siapa saja baca media publik"
  on storage.objects for select
  using (bucket_id in ('public-media', 'journal-files'));

create policy "admin unggah media publik"
  on storage.objects for insert
  with check (bucket_id in ('public-media', 'journal-files') and auth.uid() is not null);

create policy "admin hapus media publik"
  on storage.objects for delete
  using (bucket_id in ('public-media', 'journal-files') and auth.uid() is not null);

-- class-notes: hanya admin, baca maupun tulis
create policy "hanya admin baca notulensi"
  on storage.objects for select
  using (bucket_id = 'class-notes' and auth.uid() is not null);

create policy "admin unggah notulensi"
  on storage.objects for insert
  with check (bucket_id = 'class-notes' and auth.uid() is not null);

create policy "admin hapus notulensi"
  on storage.objects for delete
  using (bucket_id = 'class-notes' and auth.uid() is not null);
