-- Passo 1: Habilitar o Row Level Security na tabela.
-- Isso "tranca a porta" para todo mundo, até que criemos as regras.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Passo 2: Criar a política de permissão de leitura.
-- Esta política define as regras para quem pode LER (SELECT) os dados.
CREATE POLICY "Permitir leitura apenas para produtores e compradores"
ON public.sales
FOR SELECT
USING (
  -- Regra 1: A pessoa é o produtor dono do produto vendido?
  (EXISTS (
    SELECT 1
    FROM products
    WHERE products.id = sales.product_id AND products.producer_id = auth.uid()
  ))
  -- OU
  OR
  -- Regra 2: A pessoa é o comprador da venda?
  (sales.buyer_profile_id = auth.uid())
);