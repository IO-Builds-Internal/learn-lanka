
-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_name text DEFAULT 'BookOpen',
  color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (is_admin_or_mod(auth.uid()));

-- Add columns to existing tables
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'APPROVED';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);
ALTER TABLE public.rank_papers ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);
ALTER TABLE public.syllabus_lessons ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);

-- Seed subjects
INSERT INTO public.subjects (slug, name, description, icon_name, color, sort_order) VALUES
  ('ict', 'ICT', 'Information & Communication Technology', 'Monitor', '#3b82f6', 1),
  ('combined-maths', 'Combined Mathematics', 'Pure & Applied Mathematics', 'Calculator', '#8b5cf6', 2),
  ('physics', 'Physics', 'Advanced Level Physics', 'Atom', '#06b6d4', 3),
  ('chemistry', 'Chemistry', 'Advanced Level Chemistry', 'FlaskConical', '#10b981', 4),
  ('biology', 'Biology', 'Advanced Level Biology', 'Leaf', '#22c55e', 5),
  ('accounting', 'Accounting', 'Financial & Management Accounting', 'Receipt', '#f59e0b', 6),
  ('economics', 'Economics', 'Micro & Macro Economics', 'TrendingUp', '#ef4444', 7),
  ('business-studies', 'Business Studies', 'Business Management & Entrepreneurship', 'Briefcase', '#f97316', 8),
  ('political-science', 'Political Science', 'Government & Political Systems', 'Scale', '#6366f1', 9),
  ('sinhala', 'Sinhala', 'Sinhala Language & Literature', 'Languages', '#ec4899', 10),
  ('tamil', 'Tamil', 'Tamil Language & Literature', 'Languages', '#d946ef', 11),
  ('english', 'English', 'English Language & Literature', 'BookText', '#0ea5e9', 12),
  ('geography', 'Geography', 'Physical & Human Geography', 'Globe', '#14b8a6', 13),
  ('buddhist-civilization', 'Buddhist Civilization', 'Buddhist Philosophy & History', 'Landmark', '#a855f7', 14),
  ('art', 'Art', 'Visual Arts & Aesthetics', 'Palette', '#f43f5e', 15),
  ('music', 'Music', 'Music Theory & Practice', 'Music', '#e879f9', 16),
  ('logic', 'Logic', 'Formal Logic & Reasoning', 'Brain', '#64748b', 17),
  ('agriculture', 'Agriculture', 'Agricultural Science', 'Sprout', '#84cc16', 18),
  ('home-economics', 'Home Economics', 'Home Management & Nutrition', 'Home', '#fb923c', 19)
ON CONFLICT (slug) DO NOTHING;
