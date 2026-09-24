-- ============================================================
-- Hikayat University Archive — Menonaktifkan admin
-- Admin tidak dihapus (jurnal/artikel/angket merujuk ke profilnya
-- lewat created_by), melainkan diblokir login lewat Edge Function
-- set-admin-status. Kolom ini mencatat kapan ia dinonaktifkan.
-- ============================================================

alter table public.profiles add column if not exists disabled_at timestamptz;
