-- Create the product-checkout-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-checkout-images', 'product-checkout-images', true);

-- Create RLS policies for the product-checkout-images bucket
CREATE POLICY "Users can upload their own checkout images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-checkout-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own checkout images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-checkout-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own checkout images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-checkout-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own checkout images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-checkout-images' AND auth.uid()::text = (storage.foldername(name))[1]);