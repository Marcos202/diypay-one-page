-- Ação 1: Adiciona a coluna-ponte 'product_id' se ela ainda não existir
ALTER TABLE public.spaces
ADD COLUMN IF NOT EXISTS product_id UUID;

-- Garante que a chave estrangeira de referência esteja corretamente configurada
ALTER TABLE public.spaces
DROP CONSTRAINT IF EXISTS spaces_product_id_fkey,
ADD CONSTRAINT spaces_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Ação 2: Preenche a coluna product_id para os spaces existentes que não a têm
UPDATE public.spaces s
SET product_id = sp.product_id
FROM public.space_products sp
WHERE s.id = sp.space_id 
  AND sp.product_type = 'principal' 
  AND s.product_id IS NULL;