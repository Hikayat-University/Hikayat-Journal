import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GuestFooter, GuestNav } from '../../components/GuestNav';
import { LOAD_ERROR, StatusMessage } from '../../components/StatusMessage';
import { supabase } from '../../lib/supabaseClient';
import type { Journal } from '../../lib/types';
import { usePageMeta } from '../../lib/usePageMeta';

export function JournalList() {
  usePageMeta('Jurnal', 'Seluruh jurnal yang diterbitkan Hikayat Journal, bisa dicari per judul, penulis, bidang, dan tahun.');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter disimpan di URL (?q=&bidang=&tahun=) supaya hasil pencarian bisa dibagikan.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const field = params.get('bidang') ?? '';
  const year = params.get('tahun') ?? '';

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    supabase
      .from('journals')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        setJournals((data as Journal[]) ?? []);
        setError(!!error);
        setLoading(false);
      });
  }, []);

  const fields = useMemo(
    () => [...new Set(journals.map((j) => j.field?.trim()).filter((f): f is string => !!f))].sort((a, b) => a.localeCompare(b, 'id')),
    [journals]
  );
  const years = useMemo(
    () => [...new Set(journals.map((j) => j.year).filter((y): y is number => !!y))].sort((a, b) => b - a),
    [journals]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return journals.filter((j) => {
      if (field && j.field?.trim() !== field) return false;
      if (year && String(j.year) !== year) return false;
      if (!needle) return true;
      return [j.title, j.author, j.abstract, j.keywords, j.field].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [journals, q, field, year]);

  const hasFilter = !!(q || field || year);

  return (
    <div className="guest-shell">
      <GuestNav />
      <section className="container page">
        <div className="eyebrow">Jurnal</div>
        <h1 className="page-title">Seluruh Jurnal Terbit</h1>

        {journals.length > 0 && (
          <div className="filter-bar">
            <input
              type="search"
              placeholder="Cari judul, penulis, atau kata kunci…"
              value={q}
              onChange={(e) => setFilter('q', e.target.value)}
              aria-label="Cari jurnal"
            />
            {fields.length > 0 && (
              <select value={field} onChange={(e) => setFilter('bidang', e.target.value)} aria-label="Filter bidang">
                <option value="">Semua bidang</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
            {years.length > 0 && (
              <select value={year} onChange={(e) => setFilter('tahun', e.target.value)} aria-label="Filter tahun">
                <option value="">Semua tahun</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {loading && <StatusMessage>Memuat…</StatusMessage>}
        {!loading && error && <StatusMessage tone="error">{LOAD_ERROR}</StatusMessage>}
        {!loading && !error && journals.length === 0 && <StatusMessage>Belum ada jurnal yang diterbitkan.</StatusMessage>}
        {hasFilter && journals.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 16 }}>
            {filtered.length === 0 ? 'Tidak ada jurnal yang cocok.' : `${filtered.length} dari ${journals.length} jurnal`}
            {' · '}
            <button type="button" className="link-button" onClick={() => setParams({}, { replace: true })}>
              Hapus filter
            </button>
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((j) => (
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
      {[journal.author, journal.year, journal.field].filter(Boolean).join(' · ')}
    </div>
  );
}
