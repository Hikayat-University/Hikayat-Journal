/**
 * Nama objek storage yang aman: spasi, huruf beraksen, dan simbol diganti "-"
 * supaya upload tidak ditolak Supabase karena nama file.
 */
export function storageKey(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : '';
  const clean =
    base
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'file';
  return `${Date.now()}-${clean}${ext}`;
}

export type NoteFile = { kind: 'storage'; path: string } | { kind: 'external'; url: string } | null;

/**
 * file_url notulensi datang dalam tiga bentuk:
 * - "class-notes/<path>"               : upload lewat halaman admin
 * - ".../storage/v1/.../class-notes/<path>" : URL storage lengkap
 * - link lain (mis. Google Drive)      : hasil impor data lama
 */
export function parseNoteFile(fileUrl: string | null): NoteFile {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('class-notes/')) return { kind: 'storage', path: fileUrl.slice('class-notes/'.length) };
  const marker = '/class-notes/';
  if (fileUrl.includes('/storage/v1/') && fileUrl.includes(marker)) {
    return { kind: 'storage', path: decodeURIComponent(fileUrl.split(marker).pop()!.split('?')[0]) };
  }
  if (/^https?:\/\//.test(fileUrl)) return { kind: 'external', url: fileUrl };
  return null;
}
