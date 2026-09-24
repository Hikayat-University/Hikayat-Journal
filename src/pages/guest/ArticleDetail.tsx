import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Article } from '../../lib/types';

export function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('articles')
      .select('*')
      .eq('id', id ?? '')
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data }) => {
        setArticle((data as Article | null) ?? null);
        setLoading(false);
      });
  }, [id]);

  return (
    <div>
      <GuestNav />
      <section className="container page page-narrow">
        <Link to="/artikel" className="btn btn-outline" style={{ marginBottom: 32 }}>
          ← Semua artikel
        </Link>

        {loading && <p style={{ color: 'var(--ink-faint)' }}>Memuat…</p>}
        {!loading && !article && (
          <p style={{ color: 'var(--ink-faint)' }}>Artikel tidak ditemukan atau belum diterbitkan.</p>
        )}

        {article && (
          <article>
            <div className="eyebrow">Artikel</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginTop: 8, marginBottom: 8 }}>{article.title}</h1>
            {article.author && (
              <div style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 32 }}>{article.author}</div>
            )}
            <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
              {article.content}
            </div>
          </article>
        )}
      </section>
      <GuestFooter />
    </div>
  );
}
