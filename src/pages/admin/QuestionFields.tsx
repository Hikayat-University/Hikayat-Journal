import type { QuestionType, SurveyQuestion, SurveySection } from '../../lib/types';

export const typeLabels: Record<QuestionType, string> = {
  short_text: 'Teks Singkat',
  long_text: 'Teks Panjang',
  single_choice: 'Pilihan Ganda',
  multi_choice: 'Kotak Centang',
  likert: 'Skala Likert',
  dropdown: 'Dropdown',
};

const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown'];
const LIKERT_SCALES = [3, 4, 5, 6, 7, 10];

export type QuestionDraft = {
  text: string;
  type: QuestionType;
  options: string; // satu opsi per baris
  required: boolean;
  likertScale: number;
  likertLow: string;
  likertHigh: string;
  sectionId: string;
};

export const emptyDraft: QuestionDraft = {
  text: '',
  type: 'short_text',
  options: '',
  required: true,
  likertScale: 5,
  likertLow: 'Sangat tidak setuju',
  likertHigh: 'Sangat setuju',
  sectionId: '',
};

export function draftFromQuestion(q: SurveyQuestion): QuestionDraft {
  return {
    text: q.question_text,
    type: q.question_type,
    options: (q.options ?? []).join('\n'),
    required: q.is_required,
    likertScale: q.likert_scale ?? 5,
    likertLow: q.likert_labels?.low ?? '',
    likertHigh: q.likert_labels?.high ?? '',
    sectionId: q.section_id ?? '',
  };
}

function parseOptions(raw: string) {
  return [...new Set(raw.split('\n').map((o) => o.trim()).filter(Boolean))];
}

/** Pesan kesalahan isian, atau null kalau draft siap disimpan. */
export function draftProblem(d: QuestionDraft) {
  if (!d.text.trim()) return 'Teks pertanyaan belum diisi.';
  if (CHOICE_TYPES.includes(d.type) && parseOptions(d.options).length < 2) return 'Isi minimal 2 opsi, satu per baris.';
  return null;
}

/** Kolom-kolom yang disimpan ke survey_questions. */
export function draftToRow(d: QuestionDraft) {
  const isChoice = CHOICE_TYPES.includes(d.type);
  const isLikert = d.type === 'likert';
  return {
    question_text: d.text.trim(),
    question_type: d.type,
    section_id: d.sectionId || null,
    is_required: d.required,
    options: isChoice ? parseOptions(d.options) : null,
    likert_scale: isLikert ? d.likertScale : null,
    likert_labels: isLikert ? { low: d.likertLow.trim(), high: d.likertHigh.trim() } : null,
  };
}

export function QuestionFields({
  draft,
  onChange,
  sections,
  lockType,
  hasAnswers,
}: {
  draft: QuestionDraft;
  onChange: (d: QuestionDraft) => void;
  sections: SurveySection[];
  /** Tipe tidak bisa diganti kalau sudah ada jawaban, karena bentuk jawabannya berbeda. */
  lockType?: boolean;
  hasAnswers?: boolean;
}) {
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch });

  return (
    <>
      {sections.length > 0 && (
        <div className="field">
          <label>Masuk ke fase mana</label>
          <select value={draft.sectionId} onChange={(e) => set({ sectionId: e.target.value })}>
            <option value="">— Tanpa fase (tampil di halaman umum) —</option>
            {sections.map((sec, i) => (
              <option key={sec.id} value={sec.id}>
                Fase {i + 1}: {sec.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Pertanyaan</label>
        <input value={draft.text} onChange={(e) => set({ text: e.target.value })} />
      </div>

      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 200px' }}>
          <label>Tipe</label>
          <select value={draft.type} disabled={lockType} onChange={(e) => set({ type: e.target.value as QuestionType })}>
            {Object.entries(typeLabels).map(([val, lbl]) => (
              <option key={val} value={val}>
                {lbl}
              </option>
            ))}
          </select>
        </div>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', flex: '0 0 auto', height: 40 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={draft.required} onChange={(e) => set({ required: e.target.checked })} />
          Wajib diisi
        </label>
      </div>
      {lockType && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: -8, marginBottom: 16 }}>
          Tipe tidak bisa diganti karena pertanyaan ini sudah punya jawaban.
        </p>
      )}

      {CHOICE_TYPES.includes(draft.type) && (
        <div className="field">
          <label>Opsi (satu per baris)</label>
          <textarea rows={4} value={draft.options} onChange={(e) => set({ options: e.target.value })} placeholder={'Opsi A\nOpsi B\nOpsi C'} />
          {hasAnswers && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>
              Jawaban yang sudah masuk menyimpan teks opsi lama. Kalau teks opsi diubah, jawaban lama tetap tercatat dengan teks
              lamanya di hasil.
            </div>
          )}
        </div>
      )}

      {draft.type === 'likert' && (
        <div className="form-row">
          <div className="field" style={{ flex: '0 1 120px' }}>
            <label>Jumlah skala</label>
            <select value={draft.likertScale} onChange={(e) => set({ likertScale: Number(e.target.value) })}>
              {LIKERT_SCALES.map((n) => (
                <option key={n} value={n}>
                  1–{n}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label>Label angka 1</label>
            <input value={draft.likertLow} onChange={(e) => set({ likertLow: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label>Label angka {draft.likertScale}</label>
            <input value={draft.likertHigh} onChange={(e) => set({ likertHigh: e.target.value })} />
          </div>
        </div>
      )}
    </>
  );
}
