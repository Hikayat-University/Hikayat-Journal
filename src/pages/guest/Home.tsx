import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GuestNav } from '../../components/GuestNav';
import { supabase } from '../../lib/supabaseClient';
import type { Article, Journal } from '../../lib/types';

export function Home() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);

  useEffect(() => {
    supabase
      .from('journals')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data, count }) => {
        setJournals((data as Journal[]) ?? []);
        setJournalCount(count ?? 0);
      });

    supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data, count }) => {
        setArticles((data as Article[]) ?? []);
        setArticleCount(count ?? 0);
      });
  }, []);

  return (
    <div>
      <GuestNav />

      {/* Hero */}
      <section className="container" style={{ padding: '96px 24px 72px' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Portal Akademik &amp; Portofolio
        </div>
        <h1 style={{ fontSize: 56, lineHeight: 1.1, maxWidth: 760 }}>
          Dokumentasi Karya. <br />
          <span style={{ color: 'var(--accent)' }}>Riset yang Terbuka.</span>
        </h1>
        <p style={{ color: 'var(--ink-light)', maxWidth: 560, fontSize: 17, marginTop: 20, lineHeight: 1.6 }}>
          Hikayat Journal menghimpun jurnal, artikel, dan hasil riset dari kegiatan akademik kami — terbuka
          untuk dibaca siapa saja.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
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
          <Stat value={journalCount} label="Jurnal Terbit" />
          <Stat value={articleCount} label="Artikel" />
        </div>
      </section>

      {/* Jurnal terbaru */}
      <section className="container" style={{ padding: '72px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div className="eyebrow">Jurnal Terbaru</div>
            <h2 style={{ fontSize: 32, marginTop: 8 }}>Karya Terkini</h2>
          </div>
          <Link to="/jurnal" style={{ fontSize: 14, color: 'var(--ink-light)' }}>
            Lihat semua →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {journals.map((j) => (
            <div key={j.id} className="card">
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{j.title}</h3>
              {j.author && <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>{j.author}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.5 }}>{j.abstract}</p>
            </div>
          ))}
          {journals.length === 0 && (
            <p style={{ color: 'var(--ink-faint)' }}>Belum ada jurnal yang diterbitkan.</p>
          )}
        </div>
      </section>

      {/* Artikel terbaru */}
      <section className="container" style={{ padding: '0 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div className="eyebrow">Artikel Terbaru</div>
            <h2 style={{ fontSize: 32, marginTop: 8 }}>Catatan &amp; Pemikiran</h2>
          </div>
          <Link to="/artikel" style={{ fontSize: 14, color: 'var(--ink-light)' }}>
            Lihat semua →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {articles.map((a) => (
            <div key={a.id} className="card">
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{a.title}</h3>
              {a.author && <div style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 10 }}>{a.author}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.5 }}>{a.excerpt}</p>
            </div>
          ))}
          {articles.length === 0 && (
            <p style={{ color: 'var(--ink-faint)' }}>Belum ada artikel yang diterbitkan.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 36 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{label}</div>
    </div>
  );
}
