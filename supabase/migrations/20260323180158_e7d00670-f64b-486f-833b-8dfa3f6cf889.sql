-- Allow everyone (including students and anonymous) to read site_settings
CREATE POLICY "Anyone can read site_settings"
  ON public.site_settings
  FOR SELECT
  USING (true);