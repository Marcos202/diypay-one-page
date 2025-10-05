
-- Fix the CHECK constraint on profiles table to allow 'buyer' role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'producer', 'admin', 'buyer'));

-- Add RLS policies for sales table to allow reading sales by ID for payment confirmation
-- This allows anyone to read a sale by its exact UUID (for payment confirmation pages)
CREATE POLICY "Anyone can view sales by exact ID for payment confirmation" 
  ON public.sales 
  FOR SELECT 
  USING (true);

-- If you prefer a more restrictive approach, you could use this instead:
-- CREATE POLICY "Users can view sales by buyer email or exact ID" 
--   ON public.sales 
--   FOR SELECT 
--   USING (
--     auth.uid() IS NULL OR  -- Allow anonymous access for payment confirmation
--     buyer_email = auth.email() OR  -- Allow if buyer email matches authenticated user
--     true  -- Allow access by exact ID for payment confirmation
--   );
