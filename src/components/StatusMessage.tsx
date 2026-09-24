import type { ReactNode } from 'react';

export function StatusMessage({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <p className={tone === 'error' ? 'error-text' : undefined} style={tone === 'muted' ? { color: 'var(--ink-faint)' } : undefined}>
      {children}
    </p>
  );
}

export const LOAD_ERROR = 'Gagal memuat data. Periksa koneksi internet lalu muat ulang halaman.';
