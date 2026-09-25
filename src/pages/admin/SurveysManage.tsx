import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import type { Survey, SurveyQuestion } from '../../lib/types';

export function SurveysManage() {
  const { session } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    if (error) {
      setError(`Gagal memuat daftar angket: ${error.message}`);
      return;
    }
    setSurveys((data as Survey[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    const { error } = await supabase.from('surveys').insert({ title, created_by: session?.user.id });
    setCreating(false);
    if (error) {
      setError(`Gagal membuat angket: ${error.message}`);
      return;
    }
    setTitle('');
    load();
  }

  async function toggleOpen(s: Survey) {
    const { error } = await supabase.from('surveys').update({ is_open: !s.is_open }).eq('id', s.id);
    if (error) {
      setError(`Gagal mengubah status: ${error.message}`);
      return;
    }
    load();
  }

  function startEditTitle(s: Survey) {
    setEditingId(s.id);
    setEditTitle(s.title);
  }

  async function saveTitle(s: Survey) {
    if (!editTitle.trim()) return;
    setBusyId(s.id);
    const { error } = await supabase.from('surveys').update({ title: editTitle.trim() }).eq('id', s.id);
    setBusyId(null);
    if (error) {
      setError(`Gagal mengubah judul: ${error.message}`);
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleDuplicate(s: Survey) {
    setBusyId(s.id);
    setError(null);

    const { data: newSurvey, error: surveyErr } = await supabase
      .from('surveys')
      .insert({
        title: `${s.title} (Salinan)`,
        description: s.description,
        consent_text: s.consent_text,
        is_open: false,
        is_anonymous: s.is_anonymous,
        created_by: session?.user.id,
      })
      .select()
      .single();

    if (surveyErr || !newSurvey) {
      setError(`Gagal menduplikat angket: ${surveyErr?.message}`);
      setBusyId(null);
      return;
    }

    const { data: sections } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('survey_id', s.id)
      .order('position', { ascending: true });

    const sectionIdMap: Record<string, string> = {};
    if (sections && sections.length) {
      for (const sec of sections as { id: string; position: number; title: string; description: string | null }[]) {
        const { data: newSec, error: secErr } = await supabase
          .from('survey_sections')
          .insert({ survey_id: newSurvey.id, position: sec.position, title: sec.title, description: sec.description })
          .select()
          .single();
        if (secErr) {
          setError(`Angket terduplikat, tapi fase gagal disalin: ${secErr.message}`);
          continue;
        }
        if (newSec) sectionIdMap[sec.id] = newSec.id;
      }
    }

    const { data: questions } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', s.id)
      .order('position', { ascending: true });

    if (questions && questions.length) {
      const rows = (questions as SurveyQuestion[]).map((q) => ({
        survey_id: newSurvey.id,
        section_id: q.section_id ? sectionIdMap[q.section_id] ?? null : null,
        position: q.position,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        likert_scale: q.likert_scale,
        likert_labels: q.likert_labels,
        is_required: q.is_required,
      }));
      const { error: qErr } = await supabase.from('survey_questions').insert(rows);
      if (qErr) {
        setError(`Angket terduplikat, tapi pertanyaan gagal disalin: ${qErr.message}`);
      }
    }

    setBusyId(null);
    load();
  }

  async function handleDelete(s: Survey) {
    setBusyId(s.id);
    const { error } = await supabase.from('surveys').delete().eq('id', s.id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (error) {
      setError(`Gagal menghapus angket: ${error.message}`);
      return;
    }
    load();
  }

  const linkFor = (slug: string) => `${window.location.origin}/angket/${slug}`;

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Angket Riset</h1>

      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 32, display: 'flex', gap: 8 }}>
        <input placeholder="Judul angket baru…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-accent" style={{ whiteSpace: 'nowrap' }} onClick={handleCreate} disabled={creating}>
          Buat Angket
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {surveys.map((s) => (
          <div key={s.id} className="card survey-card">
            {editingId === s.id ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input style={{ flex: '1 1 240px', width: 'auto' }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                <button className="btn btn-accent" onClick={() => saveTitle(s)} disabled={busyId === s.id}>
                  Simpan
                </button>
                <button className="btn btn-outline" onClick={() => setEditingId(null)}>
                  Batal
                </button>
              </div>
            ) : (
              <div className="survey-head">
                <h3 className="survey-title">{s.title}</h3>
                <div className="survey-badges">
                  <span className={`badge ${s.is_open ? 'badge-success' : 'badge-muted'}`}>{s.is_open ? 'Terbuka' : 'Ditutup'}</span>
                  <span className="badge badge-muted">{s.is_anonymous ? 'Anonim' : 'Dengan email'}</span>
                </div>
              </div>
            )}

            {editingId !== s.id && (
              <div className="survey-actions">
                <div className="survey-actions-main">
                  <Link to={`/admin/angket/${s.id}/edit`} className="btn">
                    Kelola Pertanyaan
                  </Link>
                  <Link to={`/admin/angket/${s.id}/hasil`} className="btn btn-outline">
                    Lihat Hasil
                  </Link>
                  <button className="btn btn-outline" onClick={() => toggleOpen(s)}>
                    {s.is_open ? 'Tutup Angket' : 'Buka Angket'}
                  </button>
                </div>
                <div className="survey-actions-more">
                  <button className="text-btn" onClick={() => startEditTitle(s)}>
                    Ubah judul
                  </button>
                  <button className="text-btn" onClick={() => handleDuplicate(s)} disabled={busyId === s.id}>
                    {busyId === s.id ? 'Menduplikat…' : 'Duplikat'}
                  </button>
                  <button className="text-btn text-btn-danger" onClick={() => setConfirmDeleteId(s.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            )}

            {confirmDeleteId === s.id && (
              <div
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 14, color: 'var(--accent)' }}>
                  Kamu yakin akan menghapus angket "{s.title}"? Semua pertanyaan dan jawaban responden yang
                  sudah masuk akan ikut terhapus dan tidak bisa dikembalikan.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-accent" onClick={() => handleDelete(s)} disabled={busyId === s.id}>
                    {busyId === s.id ? 'Menghapus…' : 'Ya, Hapus'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="survey-link">
              <span className="survey-link-label">Link angket</span>
              <code>{linkFor(s.slug)}</code>
              <button
                className="btn btn-outline"
                onClick={() => {
                  navigator.clipboard.writeText(linkFor(s.slug));
                  setCopiedId(s.id);
                  setTimeout(() => setCopiedId((cur) => (cur === s.id ? null : cur)), 2000);
                }}
              >
                {copiedId === s.id ? 'Tersalin ✓' : 'Salin'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
