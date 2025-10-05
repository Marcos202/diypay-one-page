-- Add delivery_type column to products table
ALTER TABLE public.products 
ADD COLUMN delivery_type text NOT NULL DEFAULT 'external_access';

-- Add a check constraint to ensure valid delivery types
ALTER TABLE public.products 
ADD CONSTRAINT products_delivery_type_check 
CHECK (delivery_type IN ('members_area', 'external_access', 'in_person_event', 'payment_only'));