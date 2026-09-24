import type { PostgrestError } from '@supabase/supabase-js';

// Supabase mengembalikan paling banyak 1.000 baris per permintaan.
const PAGE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Mengambil semua baris dengan meminta per 1.000 sampai habis.
 * `query(from, to)` harus memakai urutan yang stabil (mis. order by id)
 * supaya tidak ada baris yang terlewat atau terulang antarhalaman.
 */
export async function fetchAll<T>(query: (from: number, to: number) => Page<T>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}
