import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import type { QuestionType, Survey, SurveyQuestion } from '../../lib/types';

const typeLabels: Record<QuestionType, string> = {
  short_text: 'Teks Singkat',
  long_text: 'Teks Panjang',
  single_choice: 'Pilihan Ganda',
  multi_choice: 'Kotak Centang',
  likert: 'Skala Likert',
  dropdown: 'Dropdown',
};

export function SurveyBuilder() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [newType, setNewType] = useState<QuestionType>('short_text');
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState('');

  async function load() {
    if (!id) return;
    const { data: s } = await supabase.from('surveys').select('*').eq('id', id).single();
    setSurvey(s as Survey);
    const { data: qs } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', id)
      .order('position', { ascending: true });
    setQuestions((qs as SurveyQuestion[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateSurveyField(field: Partial<Survey>) {
    if (!id) return;
    await supabase.from('surveys').update(field).eq('id', id);
    load();
  }

  async function addQuestion() {
    if (!id || !newText.trim()) return;
    const needsOptions = ['single_choice', 'multi_choice', 'dropdown'].includes(newType);
    await supabase.from('survey_questions').insert({
      survey_id: id,
      question_text: newText,
      question_type: newType,
      position: questions.length,
      options: needsOptions ? newOptions.split(',').map((o) => o.trim()).filter(Boolean) : null,
      likert_scale: newType === 'likert' ? 5 : null,
      likert_labels: newType === 'likert' ? { low: 'Sangat tidak setuju', high: 'Sangat setuju' } : null,
    });
    setNewText('');
    setNewOptions('');
    load();
  }

  async function deleteQuestion(qid: string) {
    await supabase.from('survey_questions').delete().eq('id', qid);
    load();
  }

  if (!survey) return <AdminLayout>Memuat…</AdminLayout>;

  return (
    <AdminLayout>
      <Link to="/admin/angket" style={{ fontSize: 13, color: 'var(--ink-light)' }}>
        ← Kembali ke Angket
      </Link>
      <h1 style={{ fontSize: 28, margin: '8px 0 24px' }}>{survey.title}</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Pengaturan</h3>
        <div className="field">
          <label>Deskripsi</label>
          <textarea
            rows={2}
            defaultValue={survey.description ?? ''}
            onBlur={(e) => updateSurveyField({ description: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Teks Persetujuan Responden (kosongkan jika tidak perlu)</label>
          <textarea
            rows={3}
            defaultValue={survey.consent_text ?? ''}
            onBlur={(e) => updateSurveyField({ consent_text: e.target.value })}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={survey.is_anonymous}
            onChange={(e) => updateSurveyField({ is_anonymous: e.target.checked })}
          />
          Angket anonim (tidak menyimpan email responden)
        </label>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Tambah Pertanyaan</h3>
        <div className="field">
          <label>Pertanyaan</label>
          <input value={newText} onChange={(e) => setNewText(e.target.value)} />
        </div>
        <div className="field">
          <label>Tipe</label>
          <select value={newType} onChange={(e) => setNewType(e.target.value as QuestionType)}>
            {Object.entries(typeLabels).map(([val, lbl]) => (
              <option key={val} value={val}>
                {lbl}
              </option>
            ))}
          </select>
        </div>
        {['single_choice', 'multi_choice', 'dropdown'].includes(newType) && (
          <div className="field">
            <label>Opsi (pisahkan dengan koma)</label>
            <input value={newOptions} onChange={(e) => setNewOptions(e.target.value)} placeholder="Opsi A, Opsi B, Opsi C" />
          </div>
        )}
        <button className="btn btn-accent" onClick={addQuestion}>
          Tambah Pertanyaan
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map((q, i) => (
          <div key={q.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {i + 1}. {q.question_text}
              </div>
              <span className="badge">{typeLabels[q.question_type]}</span>
            </div>
            <button className="btn btn-outline" onClick={() => deleteQuestion(q.id)}>
              Hapus
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
