-- ============================================================
-- Hikayat Journal — Kolom tambahan pada jurnal
-- Untuk menampung metadata yang ada di data lama (Google Sheets):
-- tahun terbit, bidang keilmuan, kata kunci, dan DOI.
-- ============================================================

alter table public.journals add column if not exists year int;
alter table public.journals add column if not exists field text;
alter table public.journals add column if not exists keywords text;
alter table public.journals add column if not exists doi text;
