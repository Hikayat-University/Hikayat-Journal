import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Article } from '../../lib/types';

export function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
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

  return (
    <div>
      <GuestNav />
      <section className="container page">
        <div className="eyebrow">Artikel</div>
        <h1 className="page-title">Seluruh Artikel</h1>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && articles.length === 0 && (
          <p style={{ color: 'var(--ink-faint)' }}>Belum ada artikel yang diterbitkan.</p>
        )}

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
