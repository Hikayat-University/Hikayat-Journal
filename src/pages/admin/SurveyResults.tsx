import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { fetchAll } from '../../lib/fetchAll';
import { questionStats, type ChoiceStats, type TextStats } from '../../lib/surveyStats';
import type { Survey, SurveyQuestion, SurveyResponse, SurveyAnswer, SurveySection } from '../../lib/types';
import { typeLabels } from './QuestionFields';

const fmtPct = (pct: number) => `${Math.round(pct)}%`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SurveyResults() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [s, q, sec, r, a] = await Promise.all([
        supabase.from('surveys').select('*').eq('id', id).single(),
        supabase.from('survey_questions').select('*').eq('survey_id', id).order('position', { ascending: true }),
        supabase.from('survey_sections').select('*').eq('survey_id', id).order('position', { ascending: true }),
        // Respons dan jawaban bisa lebih dari 1.000 baris, jadi diambil per halaman sampai habis.
        fetchAll<SurveyResponse>((from, to) =>
          supabase.from('survey_responses').select('*').eq('survey_id', id).order('id').range(from, to)
        ),
        // Jawaban difilter lewat relasi ke respons, bukan daftar ID yang bisa terlalu panjang untuk URL.
        fetchAll<SurveyAnswer>((from, to) =>
          supabase
            .from('survey_answers')
            .select('*, survey_responses!inner(survey_id)')
            .eq('survey_responses.survey_id', id)
            .order('id')
            .range(from, to)
        ),
      ]);

      const failed = [s.error, q.error, sec.error, r.error, a.error].find(Boolean);
      if (failed) {
        // Data yang tidak lengkap lebih berbahaya daripada tidak ada data sama sekali.
        setLoadError(`Hasil angket gagal dimuat lengkap: ${failed.message}. Muat ulang halaman sebelum membaca atau mengekspor hasil.`);
        return;
      }
      setSurvey(s.data as Survey);
      setQuestions((q.data as SurveyQuestion[]) ?? []);
      setSections((sec.data as SurveySection[]) ?? []);
      setResponses(r.data.sort((x, y) => x.submitted_at.localeCompare(y.submitted_at)));
      setAnswers(a.data);
    }
    load();
  }, [id]);

  // Indeks jawaban per respons + pertanyaan, dipakai untuk ekspor CSV.
  const answerIndex = useMemo(() => {
    const map = new Map<string, SurveyAnswer>();
    for (const a of answers) map.set(`${a.response_id}:${a.question_id}`, a);
    return map;
  }, [answers]);

  // Kelompok sama seperti yang dilihat responden: tanpa fase dulu, lalu per fase.
  const groups = useMemo(() => {
    const ungrouped = questions.filter((q) => !q.section_id || !sections.some((s) => s.id === q.section_id));
    const list: { id: string; title: string | null; questions: SurveyQuestion[] }[] = [];
    if (ungrouped.length) list.push({ id: 'none', title: sections.length ? 'Tanpa fase' : null, questions: ungrouped });
    sections.forEach((sec, i) =>
      list.push({ id: sec.id, title: `Fase ${i + 1}: ${sec.title}`, questions: questions.filter((q) => q.section_id === sec.id) })
    );
    return list;
  }, [questions, sections]);

  const stats = useMemo(() => new Map(questions.map((q) => [q.id, questionStats(q, answers)])), [questions, answers]);

  function exportCsv() {
    if (!survey) return;
    const headers = ['response_id', 'submitted_at', 'respondent_email', ...questions.map((q) => q.question_text)];
    const rows = responses.map((r) => {
      const base = [r.id, r.submitted_at, r.respondent_email ?? ''];
      const qVals = questions.map((q) => {
        const a = answerIndex.get(`${r.id}:${q.id}`);
        if (!a) return '';
        if (a.answer_choices) return a.answer_choices.join('; ');
        return a.answer_text ?? a.answer_choice ?? a.answer_number ?? '';
      });
      return [...base, ...qVals];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // BOM supaya Excel membaca UTF-8 dengan benar (huruf beraksen, tanda kutip miring).
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.title.replace(/\s+/g, '-').toLowerCase()}-hasil.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <AdminLayout>
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      </AdminLayout>
    );
  }
  if (!survey) return <AdminLayout>Memuat…</AdminLayout>;

  const lastResponse = responses.length ? responses[responses.length - 1].submitted_at : null;
  let number = 0;

  return (
    <AdminLayout>
      <Link to="/admin/angket" style={{ fontSize: 13, color: 'var(--ink-light)' }}>
        ← Kembali ke Angket
      </Link>

      <header className="results-header">
        <div>
          <div className="eyebrow">Hasil angket</div>
          <h1 className="results-title">{survey.title}</h1>
        </div>
        <button className="btn btn-accent" onClick={exportCsv} disabled={!responses.length}>
          Ekspor CSV
        </button>
      </header>

      <div className="results-summary">
        <div>
          <strong>{responses.length.toLocaleString('id-ID')}</strong>
          <span>responden</span>
        </div>
        <div>
          <strong>{questions.length}</strong>
          <span>pertanyaan</span>
        </div>
        <div>
          <strong>{lastResponse ? fmtDate(lastResponse) : '—'}</strong>
          <span>jawaban terakhir</span>
        </div>
      </div>

      {responses.length === 0 && <p style={{ color: 'var(--ink-light)' }}>Belum ada responden yang mengisi angket ini.</p>}

      {responses.length > 0 &&
        groups.map((g) => (
          <section key={g.id} className="results-group">
            {g.title && <h2 className="results-group-title">{g.title}</h2>}
            {g.questions.map((q) => {
              number++;
              const st = stats.get(q.id)!;
              return (
                <article key={q.id} className="result-card">
                  <div className="result-meta">
                    Pertanyaan {number} · {typeLabels[q.question_type]}
                  </div>
                  <h3 className="result-question">{q.question_text}</h3>
                  {st.kind === 'choice' ? (
                    <ChoiceResult stats={st} total={responses.length} />
                  ) : (
                    <TextResult stats={st} total={responses.length} />
                  )}
                </article>
              );
            })}
          </section>
        ))}
    </AdminLayout>
  );
}

function ChoiceResult({ stats, total }: { stats: ChoiceStats; total: number }) {
  const { answered, rows, top, multi, mean, scale } = stats;
  return (
    <>
      <p className="result-sub">
        {answered} dari {total} responden menjawab
        {top.length > 0 && (
          <>
            {' · '}Terbanyak: <strong>{top.map((t) => t.label).join(', ')}</strong> ({fmtPct(top[0].pct)})
          </>
        )}
      </p>
      {mean !== undefined && (
        <p className="result-mean">
          Rata-rata <strong>{mean.toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong> dari {scale}
        </p>
      )}
      {multi && <p className="result-note">Responden bisa memilih lebih dari satu, jadi jumlah persentasenya bisa lebih dari 100%.</p>}

      <ul className="bar-list">
        {rows.map((r) => {
          const isTop = top.includes(r);
          return (
            <li
              key={r.key}
              className={`bar-row${isTop ? ' is-top' : ''}${r.count === 0 ? ' is-zero' : ''}`}
              title={`${r.label}: ${r.count} dari ${answered} responden (${fmtPct(r.pct)})`}
            >
              <span className="bar-label">
                {r.label}
                {r.legacy && <span className="bar-legacy"> (opsi lama)</span>}
              </span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
              </span>
              <span className="bar-value">
                <strong>{r.count}</strong> · {fmtPct(r.pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const TEXT_PREVIEW = 8;

function TextResult({ stats, total }: { stats: TextStats; total: number }) {
  const { answered, groups } = stats;
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const needle = query.trim().toLowerCase();
  const filtered = needle ? groups.filter((g) => g.text.toLowerCase().includes(needle)) : groups;
  const visible = showAll || needle ? filtered : filtered.slice(0, TEXT_PREVIEW);

  return (
    <>
      <p className="result-sub">
        {answered} dari {total} responden menjawab
        {groups.length > 0 && ` · ${groups.length} jawaban berbeda`}
      </p>
      {groups.length > TEXT_PREVIEW && (
        <input
          type="search"
          className="text-answer-search"
          placeholder="Cari di jawaban…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari di jawaban"
        />
      )}
      {groups.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Belum ada jawaban.</p>
      ) : (
        <ul className="text-answers">
          {visible.map((g) => (
            <li key={g.text}>
              <span>{g.text}</span>
              {g.count > 1 && <span className="text-answer-count">×{g.count}</span>}
            </li>
          ))}
          {needle && filtered.length === 0 && <li className="text-answer-empty">Tidak ada jawaban yang cocok.</li>}
        </ul>
      )}
      {!needle && filtered.length > TEXT_PREVIEW && (
        <button className="text-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${filtered.length})`}
        </button>
      )}
    </>
  );
}
