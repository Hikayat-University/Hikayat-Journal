import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { Markdown } from '../../components/Markdown';
import { LOAD_ERROR, StatusMessage } from '../../components/StatusMessage';
import { supabase } from '../../lib/supabaseClient';
import type { Article } from '../../lib/types';
import { usePageMeta } from '../../lib/usePageMeta';

// Kode Postgres untuk ID yang bukan UUID valid: diperlakukan sebagai "tidak ditemukan".
const INVALID_ID = '22P02';

export function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageMeta(article?.title ?? (loading ? null : 'Artikel tidak ditemukan'), article?.excerpt);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('articles')
      .select('*')
      .eq('id', id ?? '')
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data, error }) => {
        setArticle((data as Article | null) ?? null);
        setError(!!error && error.code !== INVALID_ID);
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="guest-shell">
      <GuestNav />
      <section className="container page page-narrow">
        <Link to="/artikel" className="btn btn-outline" style={{ marginBottom: 32 }}>
          ← Semua artikel
        </Link>

        {loading && <StatusMessage>Memuat…</StatusMessage>}
        {!loading && error && <StatusMessage tone="error">{LOAD_ERROR}</StatusMessage>}
        {!loading && !error && !article && <StatusMessage>Artikel tidak ditemukan atau belum diterbitkan.</StatusMessage>}

        {article && (
          <article>
            <div className="eyebrow">Artikel</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginTop: 8, marginBottom: 8 }}>{article.title}</h1>
            {article.author && (
              <div style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 32 }}>{article.author}</div>
            )}
            {article.content && <Markdown>{article.content}</Markdown>}
          </article>
        )}
      </section>
      <GuestFooter />
    </div>
  );
}
