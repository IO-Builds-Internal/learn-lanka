-- Enable realtime for answer_access_payments so students get live updates when admin approves
ALTER PUBLICATION supabase_realtime ADD TABLE public.answer_access_payments;

-- Insert SMS template for answer access approval (ignore if already exists)
INSERT INTO public.sms_templates (template_key, template_name, template_body, description, variables, is_active)
VALUES (
  'answer_access_approved',
  'Answer Access Approved',
  'Hi {name}, your payment has been verified! You now have lifetime access to answers & review videos for all your generated papers. Visit classmate.lk to view them.',
  'Sent to students when their answer access payment is approved by admin',
  ARRAY['name'],
  true
)
ON CONFLICT (template_key) DO NOTHING;