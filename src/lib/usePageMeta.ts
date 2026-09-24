import { useEffect } from 'react';

const SITE_NAME = 'Hikayat Journal';
const DEFAULT_DESCRIPTION =
  'Jurnal, artikel, dan hasil riset dari kegiatan akademik Hikayat University, terbuka untuk dibaca siapa saja.';

function setMeta(selector: string, value: string) {
  document.querySelector(selector)?.setAttribute('content', value);
}

/**
 * Mengatur judul tab dan meta description halaman.
 * Tanpa `title`, judul kembali ke nama situs.
 */
export function usePageMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    const desc = description?.trim() ? truncate(description.trim(), 160) : DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', title ?? SITE_NAME);
    setMeta('meta[property="og:description"]', desc);
  }, [title, description]);
}

function truncate(text: string, max: number) {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
