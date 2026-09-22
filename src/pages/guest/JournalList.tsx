import { useEffect, useState } from 'react';
import { GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Journal } from '../../lib/types';

export function JournalList() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('journals')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setJournals((data as Journal[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <GuestNav />
      <section className="container" style={{ padding: '56px 24px 96px' }}>
        <div className="eyebrow">Jurnal</div>
        <h1 style={{ fontSize: 40, marginTop: 8, marginBottom: 40 }}>Seluruh Jurnal Terbit</h1>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && journals.length === 0 && (
          <p style={{ color: 'var(--ink-faint)' }}>Belum ada jurnal yang diterbitkan.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {journals.map((j) => (
            <div key={j.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 22, marginBottom: 6 }}>{j.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>
                  {j.author}
                  {j.year ? ` · ${j.year}` : ''}
                  {j.field ? ` · ${j.field}` : ''}
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.6, maxWidth: 640 }}>
                  {j.abstract}
                </p>
                {j.keywords && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>Kata kunci: {j.keywords}</div>
                )}
              </div>
              {j.file_url && (
                <a href={j.file_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
                  Unduh PDF
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
