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
    setSubmitted(true
