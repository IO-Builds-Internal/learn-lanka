-- Migration to support custom grade levels (Undergraduate, Other) and custom teacher sorting order

-- Update grade check constraint on profiles to allow 14 (Undergraduate) and 15 (Other)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_grade_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_grade_check CHECK (grade >= 6 AND grade <= 15);

-- Add sort_order column to profiles table for custom teacher sorting
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
