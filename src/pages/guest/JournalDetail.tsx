import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Journal } from '../../lib/types';
import { JournalMeta } from './JournalList';

export function JournalDetail() {
  const { id } = useParams();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('journals')
      .select('*')
      .eq('id', id ?? '')
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data }) => {
        setJournal((data as Journal | null) ?? null);
        setLoading(false);
      });
  }, [id]);

  return (
    <div>
      <GuestNav />
      <section className="container page page-narrow">
        <Link to="/jurnal" className="btn btn-outline" style={{ marginBottom: 32 }}>
          ← Semua jurnal
        </Link>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && !journal && (
          <p style={{ color: 'var(--ink-faint)' }}>Jurnal tidak ditemukan atau belum diterbitkan.</p>
        )}

        {journal && (
          <article>
            <div className="eyebrow">Jurnal</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginTop: 8, marginBottom: 8 }}>{journal.title}</h1>
            <JournalMeta journal={journal} />

            {journal.abstract && (
              <>
                <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Abstrak</h2>
                <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{journal.abstract}</p>
              </>
            )}

            {journal.keywords && (
              <p style={{ fontSize: 13, color: 'var(--ink-light)', marginTop: 20 }}>Kata kunci: {journal.keywords}</p>
            )}

            {journal.file_url && (
              <a href={journal.file_url} target="_blank" rel="noreferrer" className="btn btn-accent" style={{ marginTop: 24 }}>
                Unduh PDF
              </a>
            )}
          </article>
        )}
      </section>
      <GuestFooter />
    </div>
  );
}
