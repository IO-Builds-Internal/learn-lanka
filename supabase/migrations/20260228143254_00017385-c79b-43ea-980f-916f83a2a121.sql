
-- Fix contact_messages - add missing columns
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS responded_by UUID;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site_settings"
  ON public.site_settings
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (public.is_admin_or_mod(auth.uid()));

-- Insert default settings
INSERT INTO public.site_settings (key, value, description) VALUES
  ('site_name', 'A/L ICT', 'Site display name'),
  ('site_tagline', 'Advanced Level ICT Classes', 'Site tagline'),
  ('contact_phone', '', 'Contact phone number'),
  ('contact_email', '', 'Contact email address'),
  ('facebook_url', '', 'Facebook page URL'),
  ('youtube_url', '', 'YouTube channel URL'),
  ('whatsapp_number', '', 'WhatsApp number for contact'),
  ('announcement_text', '', 'Homepage announcement banner text'),
  ('announcement_active', 'false', 'Whether announcement banner is active')
ON CONFLICT (key) DO NOTHING;
