
-- Allow admins/mods to view OTP request logs (read-only)
CREATE POLICY "Admins can view otp_requests"
ON public.otp_requests
FOR SELECT
USING (is_admin_or_mod(auth.uid()));
