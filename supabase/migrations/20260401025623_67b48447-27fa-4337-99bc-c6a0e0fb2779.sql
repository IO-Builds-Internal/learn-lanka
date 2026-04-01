
-- Add subject_id to shop_products so teachers can add products for their subject
ALTER TABLE public.shop_products ADD COLUMN subject_id uuid REFERENCES public.subjects(id);

-- Add subject_id to shop_orders so we can filter orders by subject
ALTER TABLE public.shop_orders ADD COLUMN subject_id uuid REFERENCES public.subjects(id);

-- Allow teachers to manage their own subject's products
CREATE POLICY "Teachers can manage own subject products"
ON public.shop_products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.subject_id = shop_products.subject_id
    AND is_teacher(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.subject_id = shop_products.subject_id
    AND is_teacher(auth.uid())
  )
);

-- Allow teachers to view orders that contain their subject's products
CREATE POLICY "Teachers can view own subject orders"
ON public.shop_orders
FOR SELECT
TO authenticated
USING (
  is_teacher(auth.uid()) AND 
  subject_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.subject_id = shop_orders.subject_id
  )
);

-- Allow teachers to update orders for their subject
CREATE POLICY "Teachers can update own subject orders"
ON public.shop_orders
FOR UPDATE
TO authenticated
USING (
  is_teacher(auth.uid()) AND 
  subject_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.subject_id = shop_orders.subject_id
  )
);
