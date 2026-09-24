import type { ContentStatus } from './types';

/**
 * Tanggal terbit hanya diisi saat konten pertama kali diterbitkan.
 * Mengedit konten yang sudah terbit tidak mengubah tanggalnya.
 */
export function nextPublishedAt(status: ContentStatus, current: string | null | undefined) {
  if (status !== 'published') return null;
  return current ?? new Date().toISOString();
}
