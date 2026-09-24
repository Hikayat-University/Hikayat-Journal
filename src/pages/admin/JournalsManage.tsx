import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { ListToolbar, ShowMore, useAdminList } from '../../components/AdminList';
import { Notice, type NoticeState } from '../../components/Notice';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { ContentStatus, Journal } from '../../lib/types';
import { nextPublishedAt } from '../../lib/publishedAt';
import { storageKey } from '../../lib/storage';
import { fetchAll } from '../../lib/fetchAll';

type JournalForm = {
  title: string;
  author: string;
  abstract: string;
  year: string;
  field: string;
  keywords: string;
  doi: string;
  file_url: string;
  status: ContentStatus;
};

const empty: JournalForm = {
  title: '',
  author: '',
  abstract: '',
  year: '',
  field: '',
  keywords: '',
  doi: '',
  file_url: '',
  status: 'draft',
};

const blankToNull = (v: string) => v.trim() || null;

export function JournalsManage() {
  const { session } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  // Mengganti key mengosongkan <input type="file"> setelah tersimpan.
  const [fileInputKey, setFileInputKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'' | ContentStatus>('');

  const list = useAdminList(
    journals,
    (j) => [j.title, j.author, j.field, j.year, j.keywords],
    statusFilter ? (j) => j.status === statusFilter : undefined
  );

  async function load() {
    const { data, error } = await fetchAll<Journal>((from, to) =>
      supabase.from('journals').select('*').order('created_at', { ascending: false }).order('id').range(from, to)
    );
    if (error) {
      setNotice({ type: 'error', text: `Gagal memuat daftar jurnal: ${error.message}` });
      return;
    }
    setJournals(data);
  }

  useEffect(() => {
    load();
  }, []);

  // Saran isian bidang dari jurnal yang sudah ada, supaya penulisannya seragam.
  const knownFields = useMemo(
    () => [...new Set(journals.map((j) => j.field?.trim()).filter((f): f is string => !!f))].sort((a, b) => a.localeCompare(b, 'id')),
    [journals]
  );

  const yearValue = form.year.trim();
  const yearInvalid = yearValue !== '' && !/^\d{4}$/.test(yearValue);
  const linkInvalid = form.file_url.trim() !== '' && !/^https?:\/\//.test(form.file_url.trim());

  function resetForm() {
    setForm(empty);
    setFile(null);
    setFileInputKey((k) => k + 1);
    setEditingId(null);
  }

  // Kalau gagal, isi form dibiarkan supaya tidak perlu diketik ulang.
  async function handleSave() {
    setSaving(true);
    setNotice(null);
    let file_url = blankToNull(form.file_url);
    let uploadedPath: string | null = null;

    if (file) {
      const path = storageKey(file.name);
      const { error: upErr } = await supabase.storage.from('journal-files').upload(path, file);
      if (upErr) {
        setNotice({ type: 'error', text: `PDF gagal diunggah, jurnal belum disimpan: ${upErr.message}` });
        setSaving(false);
        return;
      }
      uploadedPath = path;
      file_url = supabase.storage.from('journal-files').getPublicUrl(path).data.publicUrl;
    }

    const existing = editingId ? journals.find((j) => j.id === editingId) : undefined;
    const payload = {
      title: form.title.trim(),
      author: blankToNull(form.author),
      abstract: blankToNull(form.abstract),
      year: yearValue ? Number(yearValue) : null,
      field: blankToNull(form.field),
      keywords: blankToNull(form.keywords),
      doi: blankToNull(form.doi),
      file_url,
      status: form.status,
      published_at: nextPublishedAt(form.status, existing?.published_at),
      ...(editingId ? {} : { created_by: session?.user.id }),
    };

    const { error } = editingId
      ? await supabase.from('journals').update(payload).eq('id', editingId)
      : await supabase.from('journals').insert(payload);

    setSaving(false);
    if (error) {
      // PDF yang sudah terunggah dibuang supaya tidak jadi file yatim di storage.
      if (uploadedPath) await supabase.storage.from('journal-files').remove([uploadedPath]);
      setNotice({ type: 'error', text: `Jurnal gagal disimpan: ${error.message}` });
      return;
    }

    setNotice({ type: 'success', text: editingId ? 'Perubahan jurnal tersimpan.' : 'Jurnal baru tersimpan.' });
    resetForm();
    load();
  }

  function startEdit(j: Journal) {
    setEditingId(j.id);
    setFile(null);
    setFileInputKey((k) => k + 1);
    setForm({
      title: j.title,
      author: j.author ?? '',
      abstract: j.abstract ?? '',
      year: j.year ? String(j.year) : '',
      field: j.field ?? '',
      keywords: j.keywords ?? '',
      doi: j.doi ?? '',
      file_url: j.file_url ?? '',
      status: j.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus jurnal ini?')) return;
    const { error } = await supabase.from('journals').delete().eq('id', id);
    if (error) {
      setNotice({ type: 'error', text: `Jurnal gagal dihapus: ${error.message}` });
      return;
    }
    setNotice({ type: 'success', text: 'Jurnal dihapus.' });
    if (editingId === id) resetForm();
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Jurnal</h1>
      <Notice notice={notice} />

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Ubah Jurnal' : 'Tambah Jurnal Baru'}</h3>
        <div className="field">
          <label>Judul</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Penulis</label>
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>
        <div className="field">
          <label>Abstrak</label>
          <textarea rows={4} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} />
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: '0 1 140px' }}>
            <label>Tahun</label>
            <input
              inputMode="numeric"
              placeholder="2025"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            {yearInvalid && <div className="error-text" style={{ marginTop: 4 }}>Isi 4 angka, mis. 2025.</div>}
          </div>
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label>Bidang</label>
            <input
              list="journal-fields"
              placeholder="mis. Pendidikan"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
            />
            <datalist id="journal-fields">
              {knownFields.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="field">
          <label>Kata kunci (pisahkan dengan koma)</label>
          <input
            placeholder="hikayat, pendidikan karakter, sastra lisan"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          />
        </div>
        <div className="field">
          <label>DOI (opsional)</label>
          <input placeholder="10.1234/abcd.2025.001" value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} />
        </div>

        <div className="field">
          <label>File jurnal</label>
          {form.file_url && !file && (
            <div className="current-file">
              <a href={form.file_url} target="_blank" rel="noreferrer">
                Buka file saat ini
              </a>
              <button type="button" className="link-button" onClick={() => setForm({ ...form, file_url: '' })}>
                Lepas file
              </button>
            </div>
          )}
          <input
            key={fileInputKey}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 6px' }}>
            Unggah PDF, atau tempel link ke file (mis. Google Drive):
          </div>
          <input
            placeholder="https://…"
            value={file ? '' : form.file_url}
            disabled={!!file}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
          />
          {file && <div style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 6 }}>PDF yang diunggah akan menggantikan link.</div>}
          {linkInvalid && <div className="error-text" style={{ marginTop: 4 }}>Link harus diawali http:// atau https://</div>}
        </div>

        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
            <option value="draft">Draft</option>
            <option value="published">Terbit</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-accent"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || yearInvalid || (linkInvalid && !file)}
          >
            {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Tambah'}
          </button>
          {editingId && (
            <button className="btn btn-outline" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </div>

      <ListToolbar
        query={list.query}
        onQuery={list.setQuery}
        placeholder="Cari judul, penulis, bidang, tahun…"
        total={journals.length}
        shown={list.filtered.length}
      >
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | ContentStatus);
            list.resetLimit();
          }}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="published">Terbit</option>
          <option value="draft">Draft</option>
        </select>
      </ListToolbar>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.visible.map((j) => (
          <div key={j.id} className={`card admin-row${editingId === j.id ? ' editing' : ''}`}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{j.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-light)', margin: '4px 0 6px' }}>
                {[j.author, j.year, j.field].filter(Boolean).join(' · ') || 'Metadata belum lengkap'}
              </div>
              <span className="badge">{j.status === 'published' ? 'Terbit' : 'Draft'}</span>{' '}
              {!j.file_url && <span className="badge">Tanpa file</span>}
            </div>
            <div className="row-actions">
              {j.status === 'published' && (
                <Link to={`/jurnal/${j.id}`} target="_blank" className="btn btn-outline">
                  Lihat ↗
                </Link>
              )}
              <button className="btn btn-outline" onClick={() => startEdit(j)}>
                Ubah
              </button>
              <button className="btn btn-outline" onClick={() => handleDelete(j.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
        <ShowMore remaining={list.remaining} onClick={list.showMore} />
      </div>
    </AdminLayout>
  );
}
