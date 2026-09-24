import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { LOAD_ERROR, StatusMessage } from '../../components/StatusMessage';
import { supabase } from '../../lib/supabaseClient';
import type { Article } from '../../lib/types';
import { usePageMeta } from '../../lib/usePageMeta';

export function ArticleList() {
  usePageMeta('Artikel', 'Catatan dan pemikiran dari kegiatan akademik Hikayat University.');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        setArticles((data as Article[]) ?? []);
        setError(!!error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="guest-shell">
      <GuestNav />
      <section className="container page">
        <div className="eyebrow">Artikel</div>
        <h1 className="page-title">Seluruh Artikel</h1>

        {loading && <StatusMessage>Memuat…</StatusMessage>}
        {!loading && error && <StatusMessage tone="error">{LOAD_ERROR}</StatusMessage>}
        {!loading && !error && articles.length === 0 && <StatusMessage>Belum ada artikel yang diterbitkan.</StatusMessage>}

        <div className="card-grid">
          {articles.map((a) => (
            <Link key={a.id} to={`/artikel/${a.id}`} className="card card-link">
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{a.title}</h3>
              {a.author && <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>{a.author}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.5 }}>{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
      <GuestFooter />
    </div>
  );
}
