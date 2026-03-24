-- Drop the broken "Service role only" ALL policy that blocks everything including inserts from edge functions
DROP POLICY IF EXISTS "Service role only" ON public.otp_requests;

-- Re-create clean admin SELECT policy
DROP POLICY IF EXISTS "Admins can view otp_requests" ON public.otp_requests;

CREATE POLICY "Admins can view otp_requests"
ON public.otp_requests
FOR SELECT
USING (is_admin_or_mod(auth.uid()));
