-- Add column to track original product price for correct fee calculation
ALTER TABLE public.sales 
ADD COLUMN original_product_price_cents INTEGER;