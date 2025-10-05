-- Fix critical security vulnerability in sales table RLS policies
-- Remove overly permissive policies and implement proper access control

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Allow system to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow system to update sales" ON public.sales;
DROP POLICY IF EXISTS "System can update sales" ON public.sales;

-- Create secure policies for sales table
-- Only service role (edge functions) can insert sales records
CREATE POLICY "Service role can insert sales"
ON public.sales
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role (edge functions) can update sales records  
CREATE POLICY "Service role can update sales"
ON public.sales
FOR UPDATE
TO service_role
USING (true);

-- Producers can only update their own sales for admin purposes (status, notes)
CREATE POLICY "Producers can update own product sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE producer_id = auth.uid()
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products 
    WHERE producer_id = auth.uid()
  )
);

-- Keep the existing secure SELECT policy (it's already correct)
-- "Permitir leitura apenas para produtores e compradores" allows only:
-- 1. Producers who own the product
-- 2. Buyers who made the purchase
-- This policy is already secure and doesn't need changes