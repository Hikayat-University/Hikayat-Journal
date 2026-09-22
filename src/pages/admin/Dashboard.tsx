import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

export function Dashboard() {
  const [counts, setCounts] = useState({ journals: 0, articles: 0, notes: 0, surveys: 0 });

  useEffect(() => {
    async function load() {
      const [j, a, n, s] = await Promise.all([
        supabase.from('journals').select('id', { count: 'exact', head: true }),
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('class_notes').select('id', { count: 'exact', head: true }),
        supabase.from('surveys').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({
        journals: j.count ?? 0,
        articles: a.count ?? 0,
        notes: n.count ?? 0,
        surveys: s.count ?? 0,
      });
    }
    load();
  }, []);

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Ringkasan</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Jurnal" value={counts.journals} />
        <StatCard label="Artikel" value={counts.articles} />
        <StatCard label="Notulensi" value={counts.notes} />
        <StatCard label="Angket" value={counts.surveys} />
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 32 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>{label}</div>
    </div>
  );
}
