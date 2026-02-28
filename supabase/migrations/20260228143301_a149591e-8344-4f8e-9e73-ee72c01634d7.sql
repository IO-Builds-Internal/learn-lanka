
-- Add missing columns to sms_templates
ALTER TABLE public.sms_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.sms_templates ADD COLUMN IF NOT EXISTS variables TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.sms_templates ADD COLUMN IF NOT EXISTS updated_by UUID;
