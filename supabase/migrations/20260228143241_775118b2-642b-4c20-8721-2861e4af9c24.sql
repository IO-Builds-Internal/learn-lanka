
-- Add missing columns to class_days
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS is_conducted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE public.class_days ADD COLUMN IF NOT EXISTS meeting_link_notified_at TIMESTAMP WITH TIME ZONE;

-- Add missing column to class_enrollments
ALTER TABLE public.class_enrollments ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE;

-- Create rank_paper_attachments table
CREATE TABLE IF NOT EXISTS public.rank_paper_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_paper_id UUID NOT NULL REFERENCES public.rank_papers(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rank_paper_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rank_paper_attachments"
  ON public.rank_paper_attachments
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Students can view rank_paper_attachments"
  ON public.rank_paper_attachments
  FOR SELECT
  USING (true);

-- Create paper_attachment_user_access table (separate from paper_attachment_users)
CREATE TABLE IF NOT EXISTS public.paper_attachment_user_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attachment_id UUID NOT NULL REFERENCES public.paper_attachments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attachment_id, user_id)
);

ALTER TABLE public.paper_attachment_user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage paper_attachment_user_access"
  ON public.paper_attachment_user_access
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact_messages"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage contact_messages"
  ON public.contact_messages
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Create shop_orders table
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total_amount INTEGER NOT NULL,
  slip_url TEXT,
  address TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.shop_orders
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_mod(auth.uid()));

CREATE POLICY "Users can insert their own orders"
  ON public.shop_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage orders"
  ON public.shop_orders
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Create shop_order_items table
CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id),
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON public.shop_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_orders 
      WHERE id = shop_order_items.order_id 
      AND (user_id = auth.uid() OR public.is_admin_or_mod(auth.uid()))
    )
  );

CREATE POLICY "Users can insert order items"
  ON public.shop_order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_orders 
      WHERE id = shop_order_items.order_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage order items"
  ON public.shop_order_items
  FOR ALL
  USING (public.is_admin_or_mod(auth.uid()));

-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
