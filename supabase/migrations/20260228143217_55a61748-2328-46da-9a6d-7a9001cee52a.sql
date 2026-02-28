
-- Add schedule_notified_at to class_months
ALTER TABLE public.class_months ADD COLUMN IF NOT EXISTS schedule_notified_at TIMESTAMP WITH TIME ZONE;

-- Add admin_note to class_enrollments
ALTER TABLE public.class_enrollments ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms_templates"
  ON public.sms_templates
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Admins can insert sms_templates"
  ON public.sms_templates
  FOR INSERT
  WITH CHECK (public.is_admin_or_mod(auth.uid()));

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  error_message TEXT,
  sent_by UUID
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms_logs"
  ON public.sms_logs
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Admins can insert sms_logs"
  ON public.sms_logs
  FOR INSERT
  WITH CHECK (public.is_admin_or_mod(auth.uid()));

-- Create lesson_attachments table
CREATE TABLE IF NOT EXISTS public.lesson_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('youtube', 'pdf', 'image')),
  title TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lesson_attachments"
  ON public.lesson_attachments
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Students can view lesson_attachments"
  ON public.lesson_attachments
  FOR SELECT
  USING (true);

-- Create paper_attachments table
CREATE TABLE IF NOT EXISTS public.paper_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  access_type TEXT NOT NULL DEFAULT 'free',
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage paper_attachments"
  ON public.paper_attachments
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Users can view free paper_attachments"
  ON public.paper_attachments
  FOR SELECT
  USING (
    access_type = 'free'
    OR public.is_admin_or_mod(auth.uid())
  );

-- Create paper_attachment_users table for selected user access
CREATE TABLE IF NOT EXISTS public.paper_attachment_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id UUID NOT NULL REFERENCES public.paper_attachments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attachment_id, user_id)
);

ALTER TABLE public.paper_attachment_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage paper_attachment_users"
  ON public.paper_attachment_users
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Create enrollment_payments table for private class payments
CREATE TABLE IF NOT EXISTS public.enrollment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage enrollment_payments"
  ON public.enrollment_payments
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Insert default SMS templates
INSERT INTO public.sms_templates (template_key, template_name, template_body) VALUES
  ('schedule_published', 'Class Schedule Published', 'Hi {student_name}! 📅 {class_name} schedule for {month} is now published. {class_count} classes scheduled. Log in to view details.'),
  ('schedule_rescheduled', 'Class Day Rescheduled', 'Hi {student_name}! 📅 {class_name} class on {old_date} has been rescheduled to {new_date} at {time}. Please update your calendar.'),
  ('rank_paper_published', 'Rank Paper Published', 'Hi {student_name}! 📝 New rank paper available: {paper_title} (Grade {grade}). Log in to attempt it before {lock_date}.'),
  ('payment_approved', 'Payment Approved', 'Hi {student_name}! ✅ Your payment of Rs.{amount} for {ref} has been approved. You now have access to class materials.'),
  ('payment_rejected', 'Payment Rejected', 'Hi {student_name}! ❌ Your payment for {ref} was rejected. Reason: {reason}. Please re-upload your slip.')
ON CONFLICT (template_key) DO NOTHING;
