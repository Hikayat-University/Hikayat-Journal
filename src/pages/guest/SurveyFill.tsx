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
