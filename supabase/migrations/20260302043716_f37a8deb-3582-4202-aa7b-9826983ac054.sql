
-- Step 1: Add user_id to contact_messages
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- Step 2: Policy for users to view their own messages
CREATE POLICY "Users can view own contact_messages"
  ON public.contact_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Step 3: Create contact_replies table
CREATE TABLE public.contact_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  sender_id uuid NULL,
  sender_role text NOT NULL DEFAULT 'user',
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;

-- Step 5: Admins can do everything
CREATE POLICY "Admins can manage contact_replies"
  ON public.contact_replies FOR ALL
  USING (is_admin_or_mod(auth.uid()));

-- Step 6: Users can view replies on their own conversations
CREATE POLICY "Users can view replies on own messages"
  ON public.contact_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_messages cm
      WHERE cm.id = contact_replies.message_id
        AND cm.user_id = auth.uid()
    )
    OR sender_id = auth.uid()
  );

-- Step 7: Users can insert their own replies on open conversations
CREATE POLICY "Users can insert own replies"
  ON public.contact_replies FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.contact_messages cm
      WHERE cm.id = contact_replies.message_id
        AND cm.user_id = auth.uid()
        AND cm.status NOT IN ('RESOLVED', 'CLOSED')
    )
  );
