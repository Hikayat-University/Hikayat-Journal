import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { ClassNote } from '../../lib/types';

const empty = { title: '', class_name: '', session_date: '', summary: '' };

export function ClassNotesManage() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from('class_notes').select('*').order('created_at', { ascending: false });
    setNotes((data as ClassNote[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  // Bucket notulensi privat: buat signed URL sesaat untuk tiap file supaya bisa diunduh admin
  useEffect(() => {
    async function makeLinks() {
      const entries: Record<string, string> = {};
      for (const n of notes) {
        if (!n.file_url) continue;
        const path = n.file_url.split('/class-notes/').pop();
        if (!path) continue;
        const { data } = await supabase.storage.from('class-notes').createSignedUrl(path, 3600);
        if (data?.signedUrl) entries[n.id] = data.signedUrl;
      }
      setLinks(entries);
    }
    if (notes.length) makeLinks();
  }, [notes]);

  async function handleSave() {
    setSaving(true);
    let file_url: string | null = null;

    if (file) {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('class-notes').upload(path, file);
      if (!upErr) file_url = path; // simpan path saja, signed URL dibuat saat ditampilkan
    }

    await supabase.from('class_notes').insert({
      ...form,
      session_date: form.session_date || null,
      file_url: file_url ? `class-notes/${file_url}` : null,
      created_by: session?.user.id,
    });

    setForm(empty);
    setFile(null);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus notulensi ini?')) return;
    await supabase.from('class_notes').delete().eq('id', id);
    load();
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Notulensi Kelas</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 24 }}>
        Hanya terlihat oleh admin yang login — tamu tidak punya akses ke halaman ini maupun datanya.
      </p>

      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Tambah Notulensi</h3>
        <div className="field">
          <label>Judul</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Nama Kelas</label>
          <input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Tanggal Sesi</label>
          <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
        </div>
        <div className="field">
          <label>Ringkasan</label>
          <textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div className="field">
          <label>File (PDF/gambar)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving || !form.title}>
          {saving ? 'Menyimpan…' : 'Tambah'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notes.map((n) => (
          <div key={n.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>
                {n.class_name} {n.session_date ? `· ${n.session_date}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {links[n.id] && (
                <a href={links[n.id]} target="_blank" rel="noreferrer" className="btn btn-outline">
                  Buka File
                </a>
              )}
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
