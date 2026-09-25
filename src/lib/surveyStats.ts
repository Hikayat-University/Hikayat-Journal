import type { SurveyAnswer, SurveyQuestion } from './types';
import { ordinalRamp } from './ordinalRamp';

export type BarRow = {
  key: string;
  label: string;
  count: number;
  /** Persen dari responden yang menjawab pertanyaan ini (0-100). */
  pct: number;
  color: string;
  /** Jawaban dengan teks opsi yang sudah tidak ada di pertanyaan (opsinya diganti setelah ada jawaban). */
  legacy?: boolean;
};

export type ChoiceStats = {
  kind: 'choice';
  answered: number;
  rows: BarRow[];
  /** Opsi dengan jawaban terbanyak; lebih dari satu kalau seri. */
  top: BarRow[];
  multi: boolean;
  mean?: number;
  scale?: number;
};

export type TextStats = {
  kind: 'text';
  answered: number;
  groups: { text: string; count: number }[];
};

const LEGACY_COLOR = '#c9c8c0';

function topRows(rows: BarRow[]) {
  const max = Math.max(0, ...rows.map((r) => r.count));
  return max === 0 ? [] : rows.filter((r) => r.count === max);
}

export function questionStats(q: SurveyQuestion, answers: SurveyAnswer[]): ChoiceStats | TextStats {
  const mine = answers.filter((a) => a.question_id === q.id);

  if (q.question_type === 'short_text' || q.question_type === 'long_text') {
    // Jawaban yang sama (abaikan huruf besar/kecil dan spasi) digabung.
    const groups = new Map<string, { text: string; count: number }>();
    let answered = 0;
    for (const a of mine) {
      const text = a.answer_text?.trim();
      if (!text) continue;
      answered++;
      const key = text.toLowerCase().replace(/\s+/g, ' ');
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { text, count: 1 });
    }
    return {
      kind: 'text',
      answered,
      groups: [...groups.values()].sort((x, y) => y.count - x.count || x.text.localeCompare(y.text, 'id')),
    };
  }

  if (q.question_type === 'likert') {
    const scale = q.likert_scale ?? 5;
    const counts = Array(scale).fill(0);
    let answered = 0;
    let sum = 0;
    for (const a of mine) {
      const n = a.answer_number;
      if (n == null || n < 1 || n > scale) continue;
      counts[n - 1]++;
      answered++;
      sum += n;
    }
    const colors = ordinalRamp(scale);
    const rows = counts.map((count, i) => {
      const n = i + 1;
      const end = n === 1 ? q.likert_labels?.low : n === scale ? q.likert_labels?.high : '';
      return {
        key: String(n),
        label: end ? `${n} · ${end}` : String(n),
        count,
        pct: answered ? (count / answered) * 100 : 0,
        color: colors[i],
      };
    });
    return { kind: 'choice', answered, rows, top: topRows(rows), multi: false, mean: answered ? sum / answered : undefined, scale };
  }

  // Pilihan ganda, kotak centang, dropdown.
  const multi = q.question_type === 'multi_choice';
  const options = q.options ?? [];
  const counts = new Map<string, number>(options.map((o) => [o, 0]));
  let answered = 0;
  for (const a of mine) {
    const picked = multi ? a.answer_choices ?? [] : a.answer_choice ? [a.answer_choice] : [];
    if (picked.length === 0) continue;
    answered++;
    for (const p of new Set(picked)) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const colors = ordinalRamp(options.length);
  const rows: BarRow[] = [...counts.entries()].map(([label, count]) => {
    const i = options.indexOf(label);
    return {
      key: label,
      label,
      count,
      pct: answered ? (count / answered) * 100 : 0,
      color: i >= 0 ? colors[i] : LEGACY_COLOR,
      legacy: i < 0,
    };
  });
  return { kind: 'choice', answered, rows, top: topRows(rows.filter((r) => !r.legacy)), multi };
}
