import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { ContentStatus, Journal } from '../../lib/types';

const empty: { title: string; author: string; abstract: string; status: ContentStatus } = {
  title: '',
  author: '',
  abstract: '',
  status: 'draft',
};

export function JournalsManage() {
  const { session } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('journals').select('*').order('created_at', { ascending: false });
    setJournals((data as Journal[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    let file_url: string | null = null;

    if (file) {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('journal-files').upload(path, file);
      if (!upErr) {
        const { data } = supabase.storage.from('journal-files').getPublicUrl(path);
        file_url = data.publicUrl;
      }
    }

    const payload = {
      ...form,
      ...(file_url ? { file_url } : {}),
      published_at: form.status === 'published' ? new Date().toISOString() : null,
      created_by: session?.user.id,
    };

    if (editingId) {
      await supabase.from('journals').update(payload).eq('id', editingId);
    } else {
      await supabase.from('journals').insert(payload);
    }

    setForm(empty);
    setFile(null);
    setEditingId(null);
    setSaving(false);
    load();
  }

  function startEdit(j: Journal) {
    setEditingId(j.id);
    setForm({ title: j.title, author: j.author ?? '', abstract: j.abstract ?? '', status: j.status });
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus jurnal ini?')) return;
    await supabase.from('journals').delete().eq('id', id);
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Jurnal</h1>

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
          <textarea rows={3} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} />
        </div>
        <div className="field">
          <label>File PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
            <option value="draft">Draft</option>
            <option value="published">Terbit</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving || !form.title}>
            {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Tambah'}
          </button>
          {editingId && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditingId(null);
                setForm(empty);
              }}
            >
              Batal
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {journals.map((j) => (
          <div key={j.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{j.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>
                <span className="badge">{j.status === 'published' ? 'Terbit' : 'Draft'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => startEdit(j)}>
                Ubah
              </button>
              <button className="btn btn-outline" onClick={() => handleDelete(j.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
