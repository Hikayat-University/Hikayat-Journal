import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { Survey } from '../../lib/types';

export function SurveysManage() {
  const { session } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    setSurveys((data as Survey[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    await supabase.from('surveys').insert({ title, created_by: session?.user.id });
    setTitle('');
    setCreating(false);
    load();
  }

  async function toggleOpen(s: Survey) {
    await supabase.from('surveys').update({ is_open: !s.is_open }).eq('id', s.id);
    load();
  }

  const linkFor = (slug: string) => `${window.location.origin}/angket/${slug}`;

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Angket Riset</h1>

      <div className="card" style={{ marginBottom: 32, display: 'flex', gap: 8 }}>
        <input placeholder="Judul angket baru…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-accent" onClick={handleCreate} disabled={creating}>
          Buat Angket
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {surveys.map((s) => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <span className="badge">{s.is_open ? 'Terbuka' : 'Ditutup'}</span>{' '}
                <span className="badge">{s.is_anonymous ? 'Anonim' : 'Dengan email'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/admin/angket/${s.id}/edit`} className="btn btn-outline">
                  Kelola Pertanyaan
                </Link>
                <Link to={`/admin/angket/${s.id}/hasil`} className="btn btn-outline">
                  Lihat Hasil
                </Link>
                <button className="btn btn-outline" onClick={() => toggleOpen(s)}>
                  {s.is_open ? 'Tutup' : 'Buka'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-light)', display: 'flex', gap: 8, alignItems: 'center' }}>
              Link unlisted:
              <code style={{ background: 'var(--paper-dim)', padding: '2px 8px', borderRadius: 6 }}>
                {linkFor(s.slug)}
              </code>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => navigator.clipboard.writeText(linkFor(s.slug))}
              >
                Salin
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
