// Impor data lama dari Hikayat Journal (Google Sheets CSV) ke Supabase.
//
// Jalankan SETELAH migrasi SQL dan akun admin pertama sudah dibuat:
//   node scripts/import-legacy-data.mjs
//
// Skrip ini meminta email + kata sandi admin secara interaktif (tidak
// disimpan di mana pun), lalu login supaya insert lolos aturan RLS
// yang mensyaratkan pengirim adalah admin yang login.
//
// File asli (PDF di Google Drive, dokumen di Google Docs) TIDAK diunduh
// ulang — link aslinya disalin apa adanya ke kolom file_url. Ini paling
// aman karena tidak menebak-nebak izin akses file, dan situs lama pun
// tidak pernah menyalin file itu ke servernya sendiri.

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import 'dotenv/config';

const JOURNAL_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS3NnGuIRou-yGn_Ly-YJFFwL18UWakhwrKK1UG0dIv_1KqaBICXdNUMzrRw3vczjFv44ZfTTjS-w7l/pub?gid=0&single=true&output=csv';
const ARTICLE_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1TnqMwOW-qtPEGbAxRX8g_0QeSbOzDwQvLGc9HPGIH2vaHJHU9A5oQmcc9D-hicV3gikNnJtKw8_z/pub?gid=400814333&single=true&output=csv';
const NOTULENSI_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUyQvfAF1RsW5HzoDa20hj194fOmnv2F6z_g5wACIq2bfyNvstuAl0jE1Y6qAkgnmfuEmPa5WW_eY9/pub?gid=502880469&single=true&output=csv';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ditemukan. Pastikan file .env sudah diisi.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengambil ${url}: ${res.status}`);
  const text = await res.text();
  return parse(text, { columns: true, skip_empty_lines: true });
}

// Ubah "DD/MM/YYYY" menjadi "YYYY-MM-DD"; kembalikan null kalau formatnya tak dikenali.
function toIsoDate(value) {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question('Email admin: ');
  const password = await rl.question('Kata sandi admin: ');
  rl.close();

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !authData.session) {
    console.error('Login gagal:', authErr?.message ?? 'sesi tidak didapat');
    process.exit(1);
  }
  console.log(`Login berhasil sebagai ${authData.user.email}.`);

  // ---------- Jurnal ----------
  console.log('\nMengambil data jurnal…');
  const journalRows = await fetchCsv(JOURNAL_CSV);
  console.log(`Ditemukan ${journalRows.length} baris jurnal.`);

  for (const row of journalRows) {
    const title = row['Judul']?.trim();
    if (!title) continue;

    const payload = {
      title,
      author: row['Penulis']?.trim() || null,
      abstract: row['Abstrak']?.trim() || null,
      year: row['Tahun'] ? parseInt(row['Tahun'], 10) || null : null,
      field: row['Bidang']?.trim() || null,
      keywords: row['Kata Kunci']?.trim() || null,
      doi: row['Doi']?.trim() || null,
      file_url: row['Pdf']?.trim() || row['Link']?.trim() || null,
      cover_url: row['Sampul']?.trim() || null,
      status: 'published',
      published_at: new Date().toISOString(),
      created_by: authData.user.id,
    };

    const { error } = await supabase.from('journals').insert(payload);
    if (error) {
      console.error(`  ✗ Gagal impor "${title}":`, error.message);
    } else {
      console.log(`  ✓ ${title}`);
    }
  }

  // ---------- Artikel ----------
  console.log('\nMengambil data artikel…');
  const articleRows = await fetchCsv(ARTICLE_CSV);
  console.log(`Ditemukan ${articleRows.length} baris artikel.`);

  for (const row of articleRows) {
    const title = row['Judul Artikel']?.trim();
    if (!title) continue;

    const payload = {
      title,
      author: row['Penulis']?.trim() || null,
      excerpt: null,
      content: null,
      cover_url: row['Link Sampul']?.trim() || null,
      status: 'draft', // konten teksnya belum ada di sheet lama, jadi masuk draft — lengkapi manual nanti
      created_by: authData.user.id,
    };

    const { error } = await supabase.from('articles').insert(payload);
    if (error) {
      console.error(`  ✗ Gagal impor "${title}":`, error.message);
    } else {
      console.log(`  ✓ ${title} (draft — lengkapi isi artikelnya lewat halaman admin)`);
    }
  }

  // ---------- Notulensi ----------
  console.log('\nMengambil data notulensi…');
  const notesRows = await fetchCsv(NOTULENSI_CSV);
  console.log(`Ditemukan ${notesRows.length} baris notulensi.`);

  for (const row of notesRows) {
    const title = row['Judul Diskusi']?.trim();
    if (!title) continue;

    const payload = {
      title,
      class_name: row['Peserta']?.trim() || null,
      session_date: toIsoDate(row['waktu']),
      summary: row['Deskripsi']?.trim() || null,
      file_url: row['link Dokumen']?.trim() || null,
      created_by: authData.user.id,
    };

    const { error } = await supabase.from('class_notes').insert(payload);
    if (error) {
      console.error(`  ✗ Gagal impor "${title}":`, error.message);
    } else {
      console.log(`  ✓ ${title}`);
    }
  }

  console.log('\nSelesai.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
