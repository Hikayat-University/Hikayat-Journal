import { useEffect, useState } from 'react';
import { GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Article } from '../../lib/types';

export function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [active, setActive] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setArticles((data as Article[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (active) {
    return (
      <div>
        <GuestNav />
        <section className="container" style={{ padding: '56px 24px 96px', maxWidth: 760 }}>
          <button onClick={() => setActive(null)} className="btn btn-outline" style={{ marginBottom: 32 }}>
            ← Kembali
          </button>
          <div className="eyebrow">Artikel</div>
          <h1 style={{ fontSize: 36, marginTop: 8, marginBottom: 8 }}>{active.title}</h1>
          {active.author && <div style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 32 }}>{active.author}</div>}
          <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {active.content}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <GuestNav />
      <section className="container" style={{ padding: '56px 24px 96px' }}>
        <div className="eyebrow">Artikel</div>
        <h1 style={{ fontSize: 40, marginTop: 8, marginBottom: 40 }}>Seluruh Artikel</h1>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && articles.length === 0 && (
          <p style={{ color: 'var(--ink-faint)' }}>Belum ada artikel yang diterbitkan.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {articles.map((a) => (
            <button
              key={a.id}
              onClick={() => setActive(a)}
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--paper-mid)' }}
            >
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{a.title}</h3>
              {a.author && <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>{a.author}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.5 }}>{a.excerpt}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
