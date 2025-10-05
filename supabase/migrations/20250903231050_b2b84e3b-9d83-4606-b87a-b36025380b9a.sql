-- Adiciona a coluna para a URL da imagem de capa vertical na tabela de produtos.

ALTER TABLE public.products
ADD COLUMN vertical_cover_url TEXT;

COMMENT ON COLUMN public.products.vertical_cover_url IS 'URL da imagem de capa do produto no formato vertical (ex: 3:4).';