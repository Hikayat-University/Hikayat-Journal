import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { Notice, type NoticeState } from '../../components/Notice';
import { supabase } from '../../lib/supabaseClient';
import type { Survey, SurveyQuestion, SurveySection } from '../../lib/types';
import {
  QuestionFields,
  draftFromQuestion,
  draftProblem,
  draftToRow,
  emptyDraft,
  typeLabels,
  type QuestionDraft,
} from './QuestionFields';

type Editing = { id: string; draft: QuestionDraft; answerCount: number | null };

export function SurveyBuilder() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [newDraft, setNewDraft] = useState<QuestionDraft>(emptyDraft);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  function fail(action: string, message: string) {
    setNotice({ type: 'error', text: `${action}: ${message}` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Jumlah jawaban responden untuk pertanyaan-pertanyaan ini; null kalau gagal dicek. */
  async function countAnswers(questionIds: string[]) {
    if (questionIds.length === 0) return 0;
    const { count, error } = await supabase
      .from('survey_answers')
      .select('id', { count: 'exact', head: true })
      .in('question_id', questionIds);
    return error ? null : count ?? 0;
  }

  function answersWarning(count: number | null, subject: string) {
    if (count === null) return `Jumlah jawaban tidak bisa dicek. Jawaban responden untuk ${subject} yang sudah masuk akan ikut terhapus permanen.`;
    if (count === 0) return 'Belum ada jawaban responden yang ikut terhapus.';
    return `${count} jawaban responden untuk ${subject} akan ikut terhapus permanen dan tidak bisa dikembalikan.`;
  }

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
    const { error } = await supabase.from('surveys').update(field).eq('id', id);
    if (error) return fail('Pengaturan gagal disimpan', error.message);
    setNotice({ type: 'success', text: 'Pengaturan tersimpan.' });
    load();
  }

  async function addSection() {
    if (!id || !newSectionTitle.trim()) return;
    const { error } = await supabase.from('survey_sections').insert({
      survey_id: id,
      title: newSectionTitle,
      description: newSectionDesc || null,
      position: sections.length,
    });
    if (error) return fail('Fase gagal ditambahkan', error.message);
    setNotice(null);
    setNewSectionTitle('');
    setNewSectionDesc('');
    load();
  }

  async function deleteSection(sec: SurveySection) {
    const questionIds = questions.filter((q) => q.section_id === sec.id).map((q) => q.id);
    const count = await countAnswers(questionIds);
    const ok = confirm(
      `Hapus fase "${sec.title}"? ${questionIds.length} pertanyaan di dalamnya ikut terhapus.\n\n${answersWarning(count, 'fase ini')}`
    );
    if (!ok) return;
    const { error } = await supabase.from('survey_sections').delete().eq('id', sec.id);
    if (error) return fail('Fase gagal dihapus', error.message);
    setNotice({ type: 'success', text: `Fase "${sec.title}" dihapus.` });
    load();
  }

  async function addQuestion() {
    if (!id || draftProblem(newDraft)) return;
    setBusy(true);
    const nextPosition = questions.reduce((max, q) => Math.max(max, q.position), -1) + 1;
    const { error } = await supabase
      .from('survey_questions')
      .insert({ survey_id: id, position: nextPosition, ...draftToRow(newDraft) });
    setBusy(false);
    // Kalau gagal, isian dibiarkan supaya tidak perlu diketik ulang.
    if (error) return fail('Pertanyaan gagal ditambahkan', error.message);
    setNotice(null);
    // Fase dan pengaturan likert dibiarkan, karena pertanyaan berikutnya biasanya serupa.
    setNewDraft({ ...newDraft, text: '', options: '' });
    load();
  }

  async function startEdit(q: SurveyQuestion) {
    setEditing({ id: q.id, draft: draftFromQuestion(q), answerCount: null });
    const count = await countAnswers([q.id]);
    setEditing((cur) => (cur?.id === q.id ? { ...cur, answerCount: count } : cur));
  }

  async function saveEdit() {
    if (!editing || draftProblem(editing.draft)) return;
    setBusy(true);
    const { error } = await supabase.from('survey_questions').update(draftToRow(editing.draft)).eq('id', editing.id);
    setBusy(false);
    if (error) return fail('Pertanyaan gagal disimpan', error.message);
    setNotice({ type: 'success', text: 'Pertanyaan tersimpan.' });
    setEditing(null);
    load();
  }

  /** Tukar urutan dengan pertanyaan tetangga di fase yang sama. */
  async function moveQuestion(q: SurveyQuestion, dir: -1 | 1) {
    const ordered = [...questions].sort((a, b) => a.position - b.position);
    const group = ordered.filter((x) => x.section_id === q.section_id);
    const neighbor = group[group.findIndex((x) => x.id === q.id) + dir];
    if (!neighbor) return;
    const i = ordered.findIndex((x) => x.id === q.id);
    const j = ordered.findIndex((x) => x.id === neighbor.id);
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];

    // Nomori ulang semuanya supaya posisi yang kembar atau bolong ikut rapi.
    const changes = ordered.map((x, pos) => ({ id: x.id, pos, old: x.position })).filter((c) => c.pos !== c.old);
    setBusy(true);
    setQuestions(ordered.map((x, pos) => ({ ...x, position: pos })));
    const results = await Promise.all(
      changes.map((c) => supabase.from('survey_questions').update({ position: c.pos }).eq('id', c.id))
    );
    setBusy(false);
    const err = results.find((r) => r.error)?.error;
    if (err) fail('Urutan gagal disimpan', err.message);
    load();
  }

  async function deleteQuestion(q: SurveyQuestion) {
    const count = await countAnswers([q.id]);
    if (!confirm(`Hapus pertanyaan "${q.question_text}"?\n\n${answersWarning(count, 'pertanyaan ini')}`)) return;
    const { error } = await supabase.from('survey_questions').delete().eq('id', q.id);
    if (error) return fail('Pertanyaan gagal dihapus', error.message);
    setNotice({ type: 'success', text: 'Pertanyaan dihapus.' });
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
      <Notice notice={notice} />

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
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteSection(sec)}>
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
        <QuestionFields draft={newDraft} onChange={setNewDraft} sections={sections} />
        {newDraft.text.trim() && draftProblem(newDraft) && (
          <p className="error-text" style={{ marginBottom: 12 }}>{draftProblem(newDraft)}</p>
        )}
        <button className="btn btn-accent" onClick={addQuestion} disabled={busy || !!draftProblem(newDraft)}>
          Tambah Pertanyaan
        </button>
      </div>

      {sections.length === 0 ? (
        renderGroup(questions)
      ) : (
        <>
          {ungrouped.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 8 }}>Tanpa fase</h4>
              {renderGroup(ungrouped)}
            </div>
          )}
          {sections.map((sec, si) => {
            const secQuestions = questions.filter((q) => q.section_id === sec.id);
            return (
              <div key={sec.id} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, color: 'var(--ink-light)', marginBottom: 8 }}>
                  Fase {si + 1}: {sec.title}
                </h4>
                {secQuestions.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Belum ada pertanyaan di fase ini.</p>
                ) : (
                  renderGroup(secQuestions)
                )}
              </div>
            );
          })}
        </>
      )}
    </AdminLayout>
  );

  function renderGroup(list: SurveyQuestion[]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((q, i) =>
          editing?.id === q.id ? (
            <div key={q.id} className="card" style={{ borderColor: 'var(--accent)' }}>
              <h4 style={{ fontSize: 15, marginBottom: 14 }}>Ubah pertanyaan {i + 1}</h4>
              <QuestionFields
                draft={editing.draft}
                onChange={(draft) => setEditing({ ...editing, draft })}
                sections={sections}
                // Selama jumlah jawaban belum diketahui, tipe dikunci dulu.
                lockType={editing.answerCount !== 0}
                hasAnswers={!!editing.answerCount}
              />
              {draftProblem(editing.draft) && (
                <p className="error-text" style={{ marginBottom: 12 }}>{draftProblem(editing.draft)}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-accent" onClick={saveEdit} disabled={busy || !!draftProblem(editing.draft)}>
                  Simpan
                </button>
                <button className="btn btn-outline" onClick={() => setEditing(null)}>
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div key={q.id} className="card question-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {i + 1}. {q.question_text}
                </div>
                <span className="badge">{typeLabels[q.question_type]}</span>{' '}
                {!q.is_required && <span className="badge">Opsional</span>}
              </div>
              <div className="question-actions">
                <button
                  className="btn btn-outline icon-btn"
                  onClick={() => moveQuestion(q, -1)}
                  disabled={busy || i === 0}
                  aria-label="Naikkan"
                  title="Naikkan"
                >
                  ↑
                </button>
                <button
                  className="btn btn-outline icon-btn"
                  onClick={() => moveQuestion(q, 1)}
                  disabled={busy || i === list.length - 1}
                  aria-label="Turunkan"
                  title="Turunkan"
                >
                  ↓
                </button>
                <button className="btn btn-outline" onClick={() => startEdit(q)} disabled={!!editing}>
                  Ubah
                </button>
                <button className="btn btn-outline" onClick={() => deleteQuestion(q)}>
                  Hapus
                </button>
              </div>
            </div>
          )
        )}
      </div>
    );
  }
}
