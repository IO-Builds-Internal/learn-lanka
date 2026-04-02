
CREATE POLICY "Teachers can insert own classes"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (
  is_teacher(auth.uid())
  AND teacher_id = auth.uid()
  AND created_by = auth.uid()
);
