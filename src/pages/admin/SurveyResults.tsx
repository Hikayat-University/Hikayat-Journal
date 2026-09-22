import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import type { Survey, SurveyQuestion, SurveyResponse, SurveyAnswer } from '../../lib/types';

export function SurveyResults() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from('surveys').select('*').eq('id', id).single().then(({ data }) => setSurvey(data as Survey));
    supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', id)
      .order('position', { ascending: true })
      .then(({ data }) => setQuestions((data as SurveyQuestion[]) ?? []));
    supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', id)
      .then(async ({ data }) => {
        const resp = (data as SurveyResponse[]) ?? [];
        setResponses(resp);
        if (resp.length) {
          const { data: ans } = await supabase
            .from('survey_answers')
            .select('*')
            .in('response_id', resp.map((r) => r.id));
          setAnswers((ans as SurveyAnswer[]) ?? []);
        }
      });
  }, [id]);

  const chartData = useMemo(() => {
    return questions
      .filter((q) => ['single_choice', 'multi_choice', 'dropdown', 'likert'].includes(q.question_type))
      .map((q) => {
        const qAnswers = answers.filter((a) => a.question_id === q.id);
        const tally: Record<string, number> = {};

        qAnswers.forEach((a) => {
          if (q.question_type === 'multi_choice' && a.answer_choices) {
            a.answer_choices.forEach((c) => (tally[c] = (tally[c] ?? 0) + 1));
          } else if (q.question_type === 'likert' && a.answer_number != null) {
            const key = String(a.answer_number);
            tally[key] = (tally[key] ?? 0) + 1;
          } else if (a.answer_choice) {
            tally[a.answer_choice] = (tally[a.answer_choice] ?? 0) + 1;
          }
        });

        return {
          question: q,
          data: Object.entries(tally).map(([name, count]) => ({ name, count })),
        };
      });
  }, [questions, answers]);

  function exportCsv() {
    if (!survey) return;
    const headers = ['response_id', 'submitted_at', 'respondent_email', ...questions.map((q) => q.question_text)];
    const rows = responses.map((r) => {
      const base = [r.id, r.submitted_at, r.respondent_email ?? ''];
      const qVals = questions.map((q) => {
        const a = answers.find((x) => x.response_id === r.id && x.question_id === q.id);
        if (!a) return '';
        if (a.answer_choices) return a.answer_choices.join('; ');
        return a.answer_text ?? a.answer_choice ?? a.answer_number ?? '';
      });
      return [...base, ...qVals];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.title.replace(/\s+/g, '-').toLowerCase()}-hasil.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!survey) return <AdminLayout>Memuat…</AdminLayout>;

  return (
    <AdminLayout>
      <Link to="/admin/angket" style={{ fontSize: 13, color: 'var(--ink-light)' }}>
        ← Kembali ke Angket
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
        <h1 style={{ fontSize: 28 }}>{survey.title} — Hasil</h1>
        <button className="btn btn-accent" onClick={exportCsv} disabled={!responses.length}>
          Ekspor CSV
        </button>
      </div>

      <p style={{ marginBottom: 24, color: 'var(--ink-light)' }}>{responses.length} responden mengisi angket ini.</p>

      {chartData.map(({ question, data }) => (
        <div key={question.id} className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>{question.question_text}</h3>
          {data.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Belum ada jawaban.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-mid)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}

      {questions
        .filter((q) => q.question_type === 'short_text' || q.question_type === 'long_text')
        .map((q) => (
          <div key={q.id} className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>{q.question_text}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {answers
                .filter((a) => a.question_id === q.id && a.answer_text)
                .map((a) => (
                  <div key={a.id} style={{ fontSize: 14, padding: '8px 12px', background: 'var(--paper-dim)', borderRadius: 8 }}>
                    {a.answer_text}
                  </div>
                ))}
            </div>
          </div>
        ))}
    </AdminLayout>
  );
}
