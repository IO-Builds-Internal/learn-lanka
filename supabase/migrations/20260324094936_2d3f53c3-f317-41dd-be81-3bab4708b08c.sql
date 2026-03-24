ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS question_images jsonb NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.question_bank.question_images IS 'Ordered array of image URLs for essay/short-essay questions';