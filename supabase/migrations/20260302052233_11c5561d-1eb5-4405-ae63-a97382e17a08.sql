
CREATE TABLE public.playground_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playground_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playground files"
ON public.playground_files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playground files"
ON public.playground_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playground files"
ON public.playground_files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playground files"
ON public.playground_files FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_playground_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_playground_files_updated_at
BEFORE UPDATE ON public.playground_files
FOR EACH ROW EXECUTE FUNCTION public.update_playground_files_updated_at();
