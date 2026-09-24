import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { LOAD_ERROR, StatusMessage } from '../../components/StatusMessage';
import { supabase } from '../../lib/supabaseClient';
import type { Article, Journal } from '../../lib/types';
import { usePageMeta } from '../../lib/usePageMeta';

type Latest<T> = { items: T[]; count: number; loading: boolean; error: boolean };

const initial = { items: [], count: 0, loading: true, error: false };

export function Home() {
  usePageMeta();
  const [journals, setJournals] = useState<Latest<Journal>>(initial);
  const [articles, setArticles] = useState<Latest<Article>>(initial);

  useEffect(() => {
    supabase
      .from('journals')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data, count, error }) => {
        setJournals({ items: (data as Journal[]) ?? [], count: count ?? 0, loading: false, error: !!error });
      });

    supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data, count, error }) => {
        setArticles({ items: (data as Article[]) ?? [], count: count ?? 0, loading: false, error: !!error });
      });
  }, []);

  return (
    <div className="guest-shell">
      <GuestNav />

      {/* Hero */}
      <section className="container hero">
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Portal Akademik &amp; Portofolio
        </div>
        <h1 className="hero-title">
          Dokumentasi Karya. <br />
          <span style={{ color: 'var(--accent)' }}>Riset yang Terbuka.</span>
        </h1>
        <p style={{ color: 'var(--ink-light)', maxWidth: 560, fontSize: 17, marginTop: 20, lineHeight: 1.6 }}>
          Hikayat University Archive menghimpun jurnal, artikel, dan hasil riset dari kegiatan akademik kami — terbuka
          untuk dibaca siapa saja.
        </p>
        <div className="btn-row" style={{ marginTop: 32 }}>
          <Link to="/jurnal" className="btn btn-accent">
            Jelajahi Jurnal →
          </Link>
          <Link to="/artikel" className="btn btn-outline">
            Baca Artikel
          </Link>
        </div>
      </section>

      {/* Stat strip */}
      <section style={{ background: 'var(--ink)', color: 'var(--white)', padding: '32px 0' }}>
        <div
          className="container"
          style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}
        >
          <Stat value={journals} label="Jurnal Terbit" />
          <Stat value={articles} label="Artikel" />
        </div>
      </section>

      {/* Jurnal terbaru */}
      <section className="container section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Jurnal Terbaru</div>
            <h2 style={{ fontSize: 32, marginTop: 8 }}>Karya Terkini</h2>
          </div>
          <Link to="/jurnal" style={{ fontSize: 14, color: 'var(--ink-light)' }}>
            Lihat semua →
          </Link>
        </div>
        <LatestStatus state={journals} empty="Belum ada jurnal yang diterbitkan." />
        <div className="card-grid">
          {journals.items.map((j) => (
            <Link key={j.id} to={`/jurnal/${j.id}`} className="card card-link">
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{j.title}</h3>
              {j.author && <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>{j.author}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.5 }}>{j.abstract}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Artikel terbaru */}
      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Artikel Terbaru</div>
            <h2 style={{ fontSize: 32, marginTop: 8 }}>Catatan &amp; Pemikiran</h2>
          </div>
          <Link to="/artikel" style={{ fontSize: 14, color: 'var(--ink-light)' }}>
            Lihat semua →
          </Link>
        </div>
        <LatestStatus state={articles} empty="Belum ada artikel yang diterbitkan." />
        <div className="card-grid">
          {articles.items.map((a) => (
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

function LatestStatus({ state, empty }: { state: Latest<unknown>; empty: string }) {
  if (state.loading) return <StatusMessage>Memuat…</StatusMessage>;
  if (state.error) return <StatusMessage tone="error">{LOAD_ERROR}</StatusMessage>;
  if (state.items.length === 0) return <StatusMessage>{empty}</StatusMessage>;
  return null;
}

function Stat({ value, label }: { value: Latest<unknown>; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 36 }}>
        {value.loading || value.error ? '–' : value.count}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</div>
    </div>
  );
}
