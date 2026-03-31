
-- Teachers can manage papers for their assigned subject
CREATE POLICY "Teachers can manage own subject papers"
ON public.papers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = papers.subject_id
      AND public.is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = papers.subject_id
      AND public.is_teacher(auth.uid())
  )
);

-- Teachers can manage syllabus lessons for their assigned subject
CREATE POLICY "Teachers can manage own subject syllabus"
ON public.syllabus_lessons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = syllabus_lessons.subject_id
      AND public.is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = syllabus_lessons.subject_id
      AND public.is_teacher(auth.uid())
  )
);

-- Teachers can manage question bank for their assigned subject
CREATE POLICY "Teachers can manage own subject questions"
ON public.question_bank
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = question_bank.subject_id
      AND public.is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subject_id = question_bank.subject_id
      AND public.is_teacher(auth.uid())
  )
);

-- Teachers can manage question bank options for questions in their subject
CREATE POLICY "Teachers can manage own subject question options"
ON public.question_bank_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.question_bank qb
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE qb.id = question_bank_options.question_id
      AND qb.subject_id = p.subject_id
      AND public.is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.question_bank qb
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE qb.id = question_bank_options.question_id
      AND qb.subject_id = p.subject_id
      AND public.is_teacher(auth.uid())
  )
);

-- Teachers can manage paper attachments for papers in their subject
CREATE POLICY "Teachers can manage own subject paper attachments"
ON public.paper_attachments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.papers pa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE pa.id = paper_attachments.paper_id
      AND pa.subject_id = p.subject_id
      AND public.is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.papers pa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE pa.id = paper_attachments.paper_id
      AND pa.subject_id = p.subject_id
      AND public.is_teacher(auth.uid())
  )
);
