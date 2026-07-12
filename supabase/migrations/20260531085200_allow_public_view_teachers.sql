-- Allow anyone to view teacher roles
CREATE POLICY "Anyone can view teacher roles" ON public.user_roles
  FOR SELECT USING (role = 'teacher');

-- Allow anyone to view teacher profiles
CREATE POLICY "Anyone can view teacher profiles" ON public.profiles
  FOR SELECT USING (teacher_image_url IS NOT NULL);
