import { useState, type ReactNode } from 'react';

const PAGE_SIZE = 25;

/**
 * Pencarian teks + "tampilkan lagi" untuk daftar di halaman admin.
 * `fields` mengambil teks yang dicari dari tiap item.
 */
export function useAdminList<T>(items: T[], fields: (item: T) => (string | number | null | undefined)[], extraFilter?: (item: T) => boolean) {
  const [query, setQueryState] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const needle = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (extraFilter && !extraFilter(item)) return false;
    if (!needle) return true;
    return fields(item).some((v) => v != null && String(v).toLowerCase().includes(needle));
  });

  return {
    query,
    setQuery(q: string) {
      setQueryState(q);
      setLimit(PAGE_SIZE);
    },
    resetLimit: () => setLimit(PAGE_SIZE),
    filtered,
    visible: filtered.slice(0, limit),
    remaining: Math.max(0, filtered.length - limit),
    showMore: () => setLimit((l) => l + PAGE_SIZE),
  };
}

export function ListToolbar({
  query,
  onQuery,
  placeholder,
  children,
  total,
  shown,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  children?: ReactNode;
  total: number;
  shown: number;
}) {
  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {children}
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 12 }}>
        {shown === total ? `${total} item` : `${shown} dari ${total} item`}
      </p>
    </>
  );
}

export function ShowMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null;
  return (
    <button className="btn btn-outline" style={{ alignSelf: 'center', marginTop: 8 }} onClick={onClick}>
      Tampilkan {Math.min(remaining, PAGE_SIZE)} lagi ({remaining} tersisa)
    </button>
  );
}
