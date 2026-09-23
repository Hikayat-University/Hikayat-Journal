import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import type { QuestionType, Survey, SurveyQuestion, SurveySection } from '../../lib/types';

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
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [newType, setNewType] = useState<QuestionType>('short_text');
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newSectionId, setNewSectionId] = useState<string>('');

  async function load() {
    if (!id) return;
    const { data: s } = await supabase.from('surveys').select('*').eq('id', id).single();
    setSurvey(s as Survey);

    const { data: secs } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('survey_id', id)
      .order('position', { ascending: true });
    setSections((secs as SurveySection[]) ?? []);

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

  async function addSection() {
    if (!id || !newSectionTitle.trim()) return;
    await supabase.from('survey_sections').insert({
      survey_id: id,
      title: newSectionTitle,
      description: newSectionDesc || null,
      position: sections.length,
    });
    setNewSectionTitle('');
    setNewSectionDesc('');
    load();
  }

  async function deleteSection(sectionId: string) {
    if (!confirm('Hapus fase ini? Semua pertanyaan di dalamnya ikut terhapus.')) return;
    await supabase.from('survey_sections').delete().eq('id', sectionId);
    load();
  }

  async function addQuestion() {
    if (!id || !newText.trim()) return;
    const needsOptions = ['single_choice', 'multi_choice', 'dropdown'].includes(newType);
    await supabase.from('survey_questions').insert({
      survey_id: id,
      section_id: newSectionId || null,
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

  const ungrouped = questions.filter((q) => !q.section_id);

  return (
    <AdminLayout>
      <Link to="/admin/angket" style={{ fontSize: 13, color: 'var(--ink-light)' }}>
        ← Kembali ke Angket
      </Link>
      <h1 style={{ fontSize: 28, margin: '8px 0 24px' }}>{survey.title}</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Pengaturan</h3>
        <div className="field">
          <label>Judul Angket</label>
          <input
            defaultValue={survey.title}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== survey.title) updateSurveyField({ title: next });
            }}
          />
        </div>
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
        <h3 style={{ marginBottom: 4 }}>Fase Angket</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 16 }}>
          Bagi angket jadi beberapa fase — tiap fase punya judul dan penjelasan sendiri, dan responden
          tap "Lanjut" untuk pindah ke fase berikutnya. Kalau tidak dibuat fase sama sekali, angket
          tampil satu halaman seperti biasa.
        </p>

        {sections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {sections.map((sec, i) => (
              <div
                key={sec.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'var(--paper-dim)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    Fase {i + 1}: {sec.title}
                  </div>
                  {sec.description && (
                    <div style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 2 }}>{sec.description}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {questions.filter((q) => q.section_id === sec.id).length} pertanyaan
                  </div>
                </div>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteSection(sec.id)}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label>Judul fase baru</label>
          <input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="mis. Tangkap Pencuri Waktumu!" />
        </div>
        <div className="field">
          <label>Deskripsi / penjelasan fase (opsional)</label>
          <textarea
            rows={3}
            value={newSectionDesc}
            onChange={(e) => setNewSectionDesc(e.target.value)}
            placeholder="mis. Selalu: 90-100%, Sering: 75-89%, ..."
          />
        </div>
        <button className="btn btn-accent" onClick={addSection} disabled={!newSectionTitle.trim()}>
          Tambah Fase
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Tambah Pertanyaan</h3>

        {sections.length > 0 && (
          <div className="field">
            <label>Masuk ke fase mana</label>
            <select value={newSectionId} onChange={(e) => setNewSectionId(e.target.value)}>
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

      {sections.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, i) => (
            <QuestionRow key={q.id} q={q} index={i} onDelete={() => deleteQuestion(q.id)} />
          ))}
        </div>
      ) : (
        <>
          {ungrouped.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 8 }}>Tanpa fase</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ungrouped.map((q, i) => (
                  <QuestionRow key={q.id} q={q} index={i} onDelete={() => deleteQuestion(q.id)} />
                ))}
              </div>
            </div>
          )}
          {sections.map((sec, si) => {
            const secQuestions = questions.filter((q) => q.section_id === sec.id);
            return (
              <div key={sec.id} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 8 }}>
                  Fase {si + 1}: {sec.title}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {secQuestions.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Belum ada pertanyaan di fase ini.</p>
                  )}
                  {secQuestions.map((q, i) => (
                    <QuestionRow key={q.id} q={q} index={i} onDelete={() => deleteQuestion(q.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </AdminLayout>
  );
}

function QuestionRow({ q, index, onDelete }: { q: SurveyQuestion; index: number; onDelete: () => void }) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600 }}>
          {index + 1}. {q.question_text}
        </div>
        <span className="badge">{typeLabels[q.question_type]}</span>
      </div>
      <button className="btn btn-outline" onClick={onDelete}>
        Hapus
      </button>
    </div>
  );
}
