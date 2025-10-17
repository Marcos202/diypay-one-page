-- Adicionar coluna use_batches à tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS use_batches BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN public.products.use_batches IS 'Indica se o produto usa sistema de lotes para precificação (aplicável para eventos)';