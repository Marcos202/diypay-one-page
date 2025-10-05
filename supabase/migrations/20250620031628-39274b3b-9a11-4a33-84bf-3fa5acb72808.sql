
-- Add require_email_confirmation column to products table
ALTER TABLE products 
ADD COLUMN require_email_confirmation boolean NOT NULL DEFAULT true;
