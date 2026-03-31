
ALTER TABLE public.profiles ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL DEFAULT NULL;
