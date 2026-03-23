
-- Syllabus lessons table (with optional subtopics via parent_id)
CREATE TABLE public.syllabus_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  grade integer,
  medium text,
  subject text NOT NULL DEFAULT 'ICT',
  sort_order integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES public.syllabus_lessons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.syllabus_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage syllabus_lessons"
  ON public.syllabus_lessons FOR ALL
  USING (is_admin_or_mod(auth.uid()));

CREATE POLICY "Authenticated can view syllabus_lessons"
  ON public.syllabus_lessons FOR SELECT
  TO authenticated
  USING (true);

-- Question bank table
CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL DEFAULT 'MCQ',
  question_text text,
  question_image_url text,
  category text NOT NULL DEFAULT 'OTHER',
  past_paper_ref text,
  medium text,
  grade integer,
  subject text NOT NULL DEFAULT 'ICT',
  lesson_id uuid REFERENCES public.syllabus_lessons(id) ON DELETE SET NULL,
  correct_option_no integer,
  explain_video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage question_bank"
  ON public.question_bank FOR ALL
  USING (is_admin_or_mod(auth.uid()));

CREATE POLICY "Authenticated can view question_bank"
  ON public.question_bank FOR SELECT
  TO authenticated
  USING (true);

-- Question options table (for MCQ options - text or image)
CREATE TABLE public.question_bank_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  option_no integer NOT NULL,
  option_text text,
  option_image_url text,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage question_bank_options"
  ON public.question_bank_options FOR ALL
  USING (is_admin_or_mod(auth.uid()));

CREATE POLICY "Authenticated can view question_bank_options"
  ON public.question_bank_options FOR SELECT
  TO authenticated
  USING (true);
