ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS question_no integer NULL,
  ADD COLUMN IF NOT EXISTS question_part text NULL,
  ADD COLUMN IF NOT EXISTS linked_group_id text NULL;

COMMENT ON COLUMN public.question_bank.question_no IS 'Past paper question number (MCQ: 1-50, Short Essay: 1-4, Essay: 5-10)';
COMMENT ON COLUMN public.question_bank.question_part IS 'Sub-part letter for essay questions e.g. A, B, C ... H';
COMMENT ON COLUMN public.question_bank.linked_group_id IS 'Group ID for linked MCQ questions that must appear together in paper generation';