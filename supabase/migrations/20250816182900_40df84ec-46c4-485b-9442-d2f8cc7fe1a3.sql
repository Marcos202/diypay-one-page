-- Add cover_image_url column to products table
ALTER TABLE public.products ADD COLUMN cover_image_url TEXT;

-- Create storage bucket for product covers
INSERT INTO storage.buckets (id, name, public) VALUES ('product-covers', 'product-covers', true);

-- Create RLS policies for product covers bucket
CREATE POLICY "Product covers are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'product-covers');

CREATE POLICY "Users can upload product covers" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own product covers" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own product covers" ON storage.objects
FOR DELETE USING (bucket_id = 'product-covers' AND auth.uid()::text = (storage.foldername(name))[1]);