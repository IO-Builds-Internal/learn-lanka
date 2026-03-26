
-- Drop existing "Paid users can view lessons" policy
DROP POLICY IF EXISTS "Paid users can view lessons" ON public.lessons;

-- Re-create with improved logic:
-- 1. Admins/mods always pass
-- 2. Private class enrolled ACTIVE students always pass (no payment required)
-- 3. Public class students need an APPROVED CLASS_MONTH payment
CREATE POLICY "Students can view lessons based on access rules"
ON public.lessons
FOR SELECT
USING (
  is_admin_or_mod(auth.uid())
  OR
  -- Private class: just need active enrollment
  EXISTS (
    SELECT 1
    FROM class_days cd
    JOIN class_months cm ON cm.id = cd.class_month_id
    JOIN classes c ON c.id = cm.class_id
    JOIN class_enrollments ce ON ce.class_id = c.id
    WHERE cd.id = lessons.class_day_id
      AND ce.user_id = auth.uid()
      AND ce.status = 'ACTIVE'
      AND c.is_private = true
  )
  OR
  -- Public class: need approved payment for that month
  EXISTS (
    SELECT 1
    FROM class_days cd
    JOIN class_months cm ON cm.id = cd.class_month_id
    JOIN classes c ON c.id = cm.class_id
    JOIN payments p ON (
      p.ref_id = (c.id::text || '-' || cm.year_month)
      AND p.payment_type = 'CLASS_MONTH'
      AND p.status = 'APPROVED'
      AND p.user_id = auth.uid()
    )
    WHERE cd.id = lessons.class_day_id
      AND c.is_private = false
  )
);
