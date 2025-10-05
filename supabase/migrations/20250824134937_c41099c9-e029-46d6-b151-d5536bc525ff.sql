-- Adiciona ON DELETE CASCADE para todas as relações críticas com products
-- Isso garante que ao deletar um produto, todos os dados relacionados sejam deletados automaticamente

-- Relação products -> spaces (área de membros)
ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_product_id_fkey;
ALTER TABLE public.spaces 
ADD CONSTRAINT spaces_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Relação products -> modules
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_product_id_fkey;
ALTER TABLE public.modules 
ADD CONSTRAINT modules_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Relação products -> enrollments (matrículas)
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_product_id_fkey;
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Relação products -> sales (vendas)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_product_id_fkey;
ALTER TABLE public.sales 
ADD CONSTRAINT sales_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;