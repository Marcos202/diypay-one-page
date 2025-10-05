-- Adiciona a coluna para vincular um webhook a um produto específico.
ALTER TABLE public.webhook_endpoints
ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.webhook_endpoints.product_id IS 'Vincula o webhook a um produto específico. NULL significa que se aplica a todos os produtos.';