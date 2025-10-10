-- Criar bucket para imagens do Order Bump
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-bump-images', 'order-bump-images', true)
ON CONFLICT (id) DO NOTHING;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Producers can upload order bump images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view order bump images" ON storage.objects;
DROP POLICY IF EXISTS "Producers can delete their order bump images" ON storage.objects;

-- RLS Policy: Produtores autenticados podem fazer upload
CREATE POLICY "Producers can upload order bump images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-bump-images'
  );

-- RLS Policy: Todos podem visualizar
CREATE POLICY "Public can view order bump images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'order-bump-images');

-- RLS Policy: Produtores podem deletar suas imagens
CREATE POLICY "Producers can delete their order bump images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'order-bump-images' 
    AND auth.uid() = owner
  );