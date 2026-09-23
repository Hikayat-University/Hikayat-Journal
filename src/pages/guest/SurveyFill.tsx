  import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Survey, SurveyQuestion, SurveySection } from '../../lib/types';

type AnswerValue = string | string[] | number | null;

// Satu "halaman" pengisian: fase asli, atau pertanyaan tanpa fase yang
// ditampilkan sebagai halaman tanpa judul (kompatibel dengan angket lama).
type Page = { id: string | null; title: string | null; description: string | null; questions: SurveyQuestion[] };

export function SurveyFill() {
  const { slug } = useParams<{ slug: string }>();
  const [survey, setSurvey] = useState<Survey | null | undefined>(undefined);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [consented, setConsented] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('surveys')
      .select('*')
      .eq('slug', slug)
      .eq('is_open', true)
      .maybeSingle()
      .then(async ({ data }) => {
        setSurvey((data as Survey) ?? null);
        if (!data) return;

        const [{ data: secs }, { data: qs }] = await Promise.all([
          supabase.from('survey_sections').select('*').eq('survey_id', data.id).order('position', { ascending: true }),
          supabase.from('survey_questions').select('*').eq('survey_id', data.id).order('position', { ascending: true }),
        ]);

        const sections = (secs as SurveySection[]) ?? [];
        const questions = (qs as SurveyQuestion[]) ?? [];

        if (sections.length === 0) {
          // Angket tanpa fase: satu halaman berisi semua pertanyaan, seperti sebelumnya.
          setPages([{ id: null, title: null, description: null, questions }]);
          return;
        }

        const built: Page[] = [];
        const ungrouped = questions.filter((q) => !q.section_id);
        if (ungrouped.length > 0) {
          built.push({ id: 'ungrouped', title: null, description: null, questions: ungrouped });
        }
        for (const sec of sections) {
          built.push({
            id: sec.id,
            title: sec.title,
            description: sec.description,
            questions: questions.filter((q) => q.section_id === sec.id),
          });
        }
        setPages(built);
      });
  }, [slug]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function currentPageMissingRequired(): boolean {
    const page = pages[pageIndex];
    if (!page) return false;
    return page.questions.some((q) => {
      if (!q.is_required) return false;
      const v = answers[q.id];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
  }

  function handleNext() {
    if (currentPageMissingRequired()) {
      setError('Mohon lengkapi semua pertanyaan wajib di fase ini.');
      return;
    }
    setError(null);
    setPageIndex((i) => i + 1);
  }

  function handleBack() {
    setError(null);
    setPageIndex((i) => Math.max(0, i - 1));
  }

  async function handleSubmit() {
    if (!survey) return;
    if (currentPageMissingRequired()) {
      setError('Mohon lengkapi semua pertanyaan wajib di fase ini.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const allQuestions = pages.flatMap((p) => p.questions);
    const responseId = crypto.randomUUID();

    const { error: respErr } = await supabase.from('survey_responses').insert({
      id: responseId,
      survey_id: survey.id,
      respondent_email: survey.is_anonymous ? null : email || null,
    });

    if (respErr) {
      setError(`Gagal mengirim jawaban: ${respErr.message}`);
      setSubmitting(false);
      return;
    }

    const rows = allQuestions.map((q) => {
      const v = answers[q.id];
      return {
        response_id: responseId,
        question_id: q.id,
        answer_text: typeof v === 'string' && (q.question_type === 'short_text' || q.question_type === 'long_text') ? v : null,
        answer_choice: typeof v === 'string' && (q.question_type === 'single_choice' || q.question_type === 'dropdown') ? v : null,
        answer_choices: Array.isArray(v) ? v : null,
        answer_number: typeof v === 'number' ? v : null,
      };
    });

    const { error: ansErr } = await supabase.from('survey_answers').insert(rows);
    setSubmitting(false);
    if (ansErr) {
      setError(`Gagal mengirim jawaban: ${ansErr.message}`);
      return;
    }
    setSubmitted(true);
  }

  if (survey === undefined) {
    return <div className="container" style={{ padding: 80 }}>Memuat…</div>;
  }

  if (survey === null) {
    return (
      <div className="container" style={{ padding: 80, textAlign: 'center' }}>
        <h2>Angket tidak ditemukan</h2>
        <p style={{ color: 'var(--ink-light)' }}>Angket ini mungkin sudah ditutup atau tautannya keliru.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container" style={{ padding: 80, textAlign: 'center', maxWidth: 480 }}>
        <h2>Terima kasih!</h2>
        <p style={{ color: 'var(--ink-light)' }}>Jawaban kamu sudah kami terima.</p>
      </div>
    );
  }

  if (!consented && survey.consent_text) {
    return (
      <div className="container" style={{ padding: '64px 24px', maxWidth: 640 }}>
        <h1 style={{ fontSize: 30, marginBottom: 16 }}>{survey.title}</h1>
        <div className="card" style={{ marginBottom: 24, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {survey.consent_text}
        </div>
        <button className="btn btn-accent" onClick={() => setConsented(true)}>
          Saya setuju, lanjutkan
        </button>
      </div>
    );
  }

  const page = pages[pageIndex];
  const isMultiPage = pages.length > 1;
  const isLastPage = pageIndex === pages.length - 1;

  return (
    <div className="container" style={{ padding: '64px 24px', maxWidth: 640 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>{survey.title}</h1>
      {survey.description && (
        <p style={{ color: 'var(--ink-light)', marginBottom: 24, lineHeight: 1.6 }}>{survey.description}</p>
      )}

      {isMultiPage && (
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>
          Fase {pageIndex + 1} dari {pages.length}
        </div>
      )}

      {!survey.is_anonymous && pageIndex === 0 && (
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      )}

      {page?.title && (
        <div className="card" style={{ marginBottom: 20, background: 'var(--paper-dim)' }}>
          <h2 style={{ fontSize: 20, marginBottom: page.description ? 10 : 0 }}>{page.title}</h2>
          {page.description && (
            <div style={{ fontSize: 14, color: 'var(--ink-light)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {page.description}
            </div>
          )}
        </div>
      )}

      {page?.questions.map((q, idx) => (
        <QuestionField key={q.id} index={idx + 1} question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
      ))}

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        {isMultiPage && pageIndex > 0 && (
          <button className="btn btn-outline" onClick={handleBack} disabled={submitting}>
            Kembali
          </button>
        )}
        {isLastPage ? (
          <button className="btn btn-accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Mengirim…' : 'Kirim Jawaban'}
          </button>
        ) : (
          <button className="btn btn-accent" onClick={handleNext}>
            Lanjut
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionField({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  const label = `${index}. ${question.question_text}${question.is_required ? ' *' : ''}`;

  return (
    <div className="field card" style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 12 }}>{label}</label>

      {question.question_type === 'short_text' && (
        <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {question.question_type === 'long_text' && (
        <textarea rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}

      {question.question_type === 'dropdown' && (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Pilih…</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {question.question_type === 'single_choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(question.options ?? []).map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ink)' }}>
              <input
                type="radio"
                style={{ width: 'auto' }}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'multi_choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(question.options ?? []).map((opt) => {
            const arr = (value as string[]) ?? [];
            const checked = arr.includes(opt);
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ink)' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((o) => o !== opt) : [...arr, opt];
                    onChange(next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {question.question_type === 'likert' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', width: 100 }}>{question.likert_labels?.low}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {Array.from({ length: question.likert_scale ?? 5 }, (_, i) => i + 1).map((n) => (
              <label key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 12 }}>
                <input
                  type="radio"
                  style={{ width: 'auto' }}
                  checked={value === n}
                  onChange={() => onChange(n)}
                />
                {n}
              </label>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', width: 100, textAlign: 'right' }}>
            {question.likert_labels?.high}
          </span>
        </div>
      )}
    </div>
  );
}
