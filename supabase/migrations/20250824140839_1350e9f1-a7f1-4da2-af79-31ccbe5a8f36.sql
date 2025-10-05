-- Remover a constraint de chave estrangeira atual da tabela 'spaces'
ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_product_id_fkey;

-- Recriar a constraint com a política de exclusão em cascata
ALTER TABLE public.spaces
ADD CONSTRAINT spaces_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;