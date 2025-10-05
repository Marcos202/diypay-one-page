-- Adicionar coluna para imagem vertical (9:16) na tabela products
ALTER TABLE public.products 
ADD COLUMN vertical_cover_image_url TEXT;