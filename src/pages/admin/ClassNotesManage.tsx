import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Notice, type NoticeState } from '../../components/Notice';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { ClassNote } from '../../lib/types';
import { parseNoteFile, storageKey } from '../../lib/storage';

const empty = { title: '', class_name: '', session_date: '', summary: '' };

export function ClassNotesManage() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  // Saat mengedit: file di storage yang dipertahankan kalau tidak diganti.
  const [keptFile, setKeptFile] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<NoticeState>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function load() {
    const { data, error } = await supabase.from('class_notes').select('*').order('created_at', { ascending: false });
    if (error) {
      setNotice({ type: 'error', text: `Gagal memuat notulensi: ${error.message}` });
      return;
    }
    setNotes((data as ClassNote[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  // Bucket notulensi privat: file di storage dibuka lewat signed URL sesaat (1 jam).
  // Link luar hasil impor data lama (mis. Google Drive) dipakai apa adanya.
  useEffect(() => {
    async function makeLinks() {
      const entries: Record<string, string> = {};
      const storageNotes: { id: string; path: string }[] = [];
      for (const n of notes) {
        const f = parseNoteFile(n.file_url);
        if (f?.kind === 'external') entries[n.id] = f.url;
        if (f?.kind === 'storage') storageNotes.push({ id: n.id, path: f.path });
      }
      if (storageNotes.length) {
        const { data } = await supabase.storage
          .from('class-notes')
          .createSignedUrls(storageNotes.map((n) => n.path), 3600);
        data?.forEach((d, i) => {
          if (d.signedUrl) entries[storageNotes[i].id] = d.signedUrl;
        });
      }
      setLinks(entries);
    }
    if (notes.length) makeLinks();
  }, [notes]);

  const linkInvalid = link.trim() !== '' && !/^https?:\/\//.test(link.trim());

  function resetForm() {
    setForm(empty);
    setFile(null);
    setFileInputKey((k) => k + 1);
    setKeptFile(null);
    setLink('');
    setEditingId(null);
  }

  function startEdit(n: ClassNote) {
    const f = parseNoteFile(n.file_url);
    setEditingId(n.id);
    setForm({
      title: n.title,
      class_name: n.class_name ?? '',
      session_date: n.session_date ?? '',
      summary: n.summary ?? '',
    });
    setFile(null);
    setFileInputKey((k) => k + 1);
    setKeptFile(f?.kind === 'storage' ? n.file_url : null);
    setLink(f?.kind === 'external' ? f.url : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Kalau gagal, isi form dibiarkan supaya tidak perlu diketik ulang.
  async function handleSave() {
    setSaving(true);
    setNotice(null);
    let path: string | null = null;

    if (file) {
      path = storageKey(file.name);
      const { error: upErr } = await supabase.storage.from('class-notes').upload(path, file);
      if (upErr) {
        setNotice({ type: 'error', text: `File gagal diunggah, notulensi belum disimpan: ${upErr.message}` });
        setSaving(false);
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      class_name: form.class_name.trim() || null,
      session_date: form.session_date || null,
      summary: form.summary.trim() || null,
      // Upload disimpan sebagai path; signed URL dibuat saat ditampilkan.
      file_url: path ? `class-notes/${path}` : link.trim() || keptFile,
    };

    const { error } = editingId
      ? await supabase.from('class_notes').update(payload).eq('id', editingId)
      : await supabase.from('class_notes').insert({ ...payload, created_by: session?.user.id });

    setSaving(false);
    if (error) {
      if (path) await supabase.storage.from('class-notes').remove([path]);
      setNotice({ type: 'error', text: `Notulensi gagal disimpan: ${error.message}` });
      return;
    }

    setNotice({ type: 'success', text: editingId ? 'Perubahan notulensi tersimpan.' : 'Notulensi tersimpan.' });
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus notulensi ini?')) return;
    const { error } = await supabase.from('class_notes').delete().eq('id', id);
    if (error) {
      setNotice({ type: 'error', text: `Notulensi gagal dihapus: ${error.message}` });
      return;
    }
    setNotice({ type: 'success', text: 'Notulensi dihapus.' });
    if (editingId === id) resetForm();
    load();
  }

  // Hanya untuk file di storage; link luar sudah terlihat di kolom link.
  const currentFileHref = editingId && keptFile ? links[editingId] : undefined;

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Notulensi Kelas</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 24 }}>
        Hanya terlihat oleh admin yang login — tamu tidak punya akses ke halaman ini maupun datanya.
      </p>
      <Notice notice={notice} />

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Ubah Notulensi' : 'Tambah Notulensi'}</h3>
        <div className="field">
          <label>Judul</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label>Nama Kelas</label>
            <input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '0 1 200px' }}>
            <label>Tanggal Sesi</label>
            <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Ringkasan</label>
          <textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div className="field">
          <label>File (PDF/gambar)</label>
          {keptFile && !file && (
            <div className="current-file">
              {currentFileHref ? (
                <a href={currentFileHref} target="_blank" rel="noreferrer">
                  Buka file saat ini
                </a>
              ) : (
                <span>Ada file tersimpan</span>
              )}
              <button
                type="button"
                className="link-button"
                onClick={() => setKeptFile(null)}
              >
                Lepas file
              </button>
            </div>
          )}
          <input key={fileInputKey} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '8px 0 6px' }}>
            Unggah file, atau tempel link (mis. Google Drive):
          </div>
          <input
            placeholder="https://…"
            value={file ? '' : link}
            disabled={!!file}
            onChange={(e) => {
              setLink(e.target.value);
              if (e.target.value.trim()) setKeptFile(null);
            }}
          />
          {linkInvalid && <div className="error-text" style={{ marginTop: 4 }}>Link harus diawali http:// atau https://</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving || !form.title.trim() || (linkInvalid && !file)}>
            {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Tambah'}
          </button>
          {editingId && (
            <button className="btn btn-outline" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notes.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              ...(editingId === n.id ? { borderColor: 'var(--accent)' } : {}),
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>
                {[n.class_name, n.session_date].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {links[n.id] && (
                <a href={links[n.id]} target="_blank" rel="noreferrer" className="btn btn-outline">
                  Buka File
                </a>
              )}
              <button className="btn btn-outline" onClick={() => startEdit(n)}>
                Ubah
              </button>
              <button className="btn btn-outline" onClick={() => handleDelete(n.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
