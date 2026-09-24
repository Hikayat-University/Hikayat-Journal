import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
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
      <section className="container page">
        <div className="eyebrow">Jurnal</div>
        <h1 className="page-title">Seluruh Jurnal Terbit</h1>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && journals.length === 0 && (
          <p style={{ color: 'var(--ink-faint)' }}>Belum ada jurnal yang diterbitkan.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {journals.map((j) => (
            <div key={j.id} className="card journal-row">
              <div>
                <h3 style={{ fontSize: 22, marginBottom: 6 }}>
                  <Link to={`/jurnal/${j.id}`} className="title-link">
                    {j.title}
                  </Link>
                </h3>
                <JournalMeta journal={j} />
                <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.6, maxWidth: 640 }}>
                  {j.abstract}
                </p>
                {j.keywords && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>Kata kunci: {j.keywords}</div>
                )}
              </div>
              {j.file_url && (
                <a href={j.file_url} target="_blank" rel="noreferrer" className="btn btn-outline">
                  Unduh PDF
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
      <GuestFooter />
    </div>
  );
}

export function JournalMeta({ journal }: { journal: Journal }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>
      {journal.author}
      {journal.year ? ` · ${journal.year}` : ''}
      {journal.field ? ` · ${journal.field}` : ''}
    </div>
  );
}
