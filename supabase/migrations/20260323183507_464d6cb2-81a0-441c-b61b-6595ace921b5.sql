
-- Fix RLS policies for answer_access_payments table
-- Allow authenticated users to insert their own records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'answer_access_payments' AND policyname = 'Users can insert own answer_access_payments'
  ) THEN
    CREATE POLICY "Users can insert own answer_access_payments"
      ON public.answer_access_payments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'answer_access_payments' AND policyname = 'Users can view own answer_access_payments'
  ) THEN
    CREATE POLICY "Users can view own answer_access_payments"
      ON public.answer_access_payments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'answer_access_payments' AND policyname = 'Users can update own answer_access_payments'
  ) THEN
    CREATE POLICY "Users can update own answer_access_payments"
      ON public.answer_access_payments
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Payments table policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can insert own payments'
  ) THEN
    CREATE POLICY "Users can insert own payments"
      ON public.payments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can view own payments'
  ) THEN
    CREATE POLICY "Users can view own payments"
      ON public.payments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
