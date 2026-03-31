
-- Drop the overly permissive SELECT policy on lesson_attachments
DROP POLICY IF EXISTS "Students can view lesson_attachments" ON public.lesson_attachments;

-- Create a proper access-controlled SELECT policy mirroring the lessons table logic
CREATE POLICY "Students can view lesson_attachments via lesson access" ON public.lesson_attachments
FOR SELECT TO public
USING (
  is_admin_or_mod(auth.uid())
  OR
  -- Private class: active enrollment
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN class_days cd ON cd.id = l.class_day_id
    JOIN class_months cm ON cm.id = cd.class_month_id
    JOIN classes c ON c.id = cm.class_id
    JOIN class_enrollments ce ON ce.class_id = c.id
    WHERE l.id = lesson_attachments.lesson_id
      AND ce.user_id = auth.uid()
      AND ce.status = 'ACTIVE'
      AND c.is_private = true
  )
  OR
  -- Public class: approved payment for that month
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN class_days cd ON cd.id = l.class_day_id
    JOIN class_months cm ON cm.id = cd.class_month_id
    JOIN classes c ON c.id = cm.class_id
    JOIN payments p ON p.ref_id = (c.id::text || '-' || cm.year_month)
      AND p.payment_type = 'CLASS_MONTH'
      AND p.status = 'APPROVED'
      AND p.user_id = auth.uid()
    WHERE l.id = lesson_attachments.lesson_id
      AND c.is_private = false
  )
  OR
  -- Teachers who own the class
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN class_days cd ON cd.id = l.class_day_id
    JOIN class_months cm ON cm.id = cd.class_month_id
    JOIN classes c ON c.id = cm.class_id
    WHERE l.id = lesson_attachments.lesson_id
      AND c.teacher_id = auth.uid()
  )
);
