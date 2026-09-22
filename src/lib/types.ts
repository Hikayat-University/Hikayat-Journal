export type Profile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'owner';
  created_at: string;
};

export type ContentStatus = 'draft' | 'published';

export type Journal = {
  id: string;
  title: string;
  author: string | null;
  abstract: string | null;
  file_url: string | null;
  cover_url: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  year: number | null;
  field: string | null;
  keywords: string | null;
  doi: string | null;
};

export type Article = {
  id: string;
  title: string;
  author: string | null;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassNote = {
  id: string;
  title: string;
  class_name: string | null;
  session_date: string | null;
  file_url: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'likert'
  | 'dropdown';

export type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  consent_text: string | null;
  is_open: boolean;
  is_anonymous: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SurveySection = {
  id: string;
  survey_id: string;
  position: number;
  title: string;
  description: string | null;
};

export type SurveyQuestion = {
  id: string;
  survey_id: string;
  section_id: string | null;
  position: number;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  likert_scale: number | null;
  likert_labels: { low?: string; high?: string } | null;
  is_required: boolean;
};

export type SurveyResponse = {
  id: string;
  survey_id: string;
  respondent_email: string | null;
  submitted_at: string;
};

export type SurveyAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_choice: string | null;
  answer_choices: string[] | null;
  answer_number: number | null;
};
