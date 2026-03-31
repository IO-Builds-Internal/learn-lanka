
-- Create is_teacher function
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'teacher'
  )
$$;

-- Update can_manage_class to include teachers
CREATE OR REPLACE FUNCTION public.can_manage_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'admin')
    OR
    (public.has_role(_user_id, 'moderator') AND EXISTS (
      SELECT 1 FROM public.moderator_class_assignments
      WHERE moderator_id = _user_id AND class_id = _class_id
    ))
    OR
    (public.has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = _class_id AND teacher_id = _user_id
    ))
$$;
