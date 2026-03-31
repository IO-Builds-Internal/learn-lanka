
-- Allow admins to update any profile (e.g. assigning subject_id to teachers)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin_or_mod(auth.uid()))
WITH CHECK (is_admin_or_mod(auth.uid()));
