import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { Article, ContentStatus } from '../../lib/types';

const empty: { title: string; author: string; excerpt: string; content: string; status: ContentStatus } = {
  title: '',
  author: '',
  excerpt: '',
  content: '',
  status: 'draft',
};

export function ArticlesManage() {
  const { session } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    setArticles((data as Article[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
      created_by: session?.user.id,
    };
    if (editingId) {
      await supabase.from('articles').update(payload).eq('id', editingId);
    } else {
      await supabase.from('articles').insert(payload);
    }
    setForm(empty);
    setEditingId(null);
    setSaving(false);
    load();
  }

  function startEdit(a: Article) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      author: a.author ?? '',
      excerpt: a.excerpt ?? '',
      content: a.content ?? '',
      status: a.status,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus artikel ini?')) return;
    await supabase.from('articles').delete().eq('id', id);
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Artikel</h1>

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Ubah Artikel' : 'Tulis Artikel Baru'}</h3>
        <div className="field">
          <label>Judul</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Penulis</label>
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>
        <div className="field">
          <label>Ringkasan</label>
          <textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="field">
          <label>Isi Artikel</label>
          <textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
            Mendukung Markdown: <code>## Subjudul</code>, <code>**tebal**</code>, <code>*miring*</code>,{' '}
            <code>[teks](https://tautan)</code>, <code>![keterangan](https://url-gambar)</code>, daftar dengan <code>- </code>.
          </div>
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
        {articles.map((a) => (
          <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <span className="badge">{a.status === 'published' ? 'Terbit' : 'Draft'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => startEdit(a)}>
                Ubah
              </button>
              <button className="btn btn-outline" onClick={() => handleDelete(a.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
