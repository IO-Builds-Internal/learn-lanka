-- Create traffic_logs table to track admin panel traffic overview activity
CREATE TABLE IF NOT EXISTS public.traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    activity_type TEXT NOT NULL DEFAULT 'PAGE_VIEW',
    geo_country TEXT,
    geo_city TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.traffic_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplicates
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.traffic_logs;
DROP POLICY IF EXISTS "Admins/mods can select traffic_logs" ON public.traffic_logs;

-- Policies
CREATE POLICY "Enable insert for everyone" ON public.traffic_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins/mods can select traffic_logs" ON public.traffic_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'moderator')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_traffic_logs_created_at ON public.traffic_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_logs_activity_type ON public.traffic_logs(activity_type);
