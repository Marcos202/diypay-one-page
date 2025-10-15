-- Adicionar colunas para Meia Entrada / Ofertas Especiais na tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS special_offer_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS special_offer_title text,
ADD COLUMN IF NOT EXISTS special_offer_discount_percent numeric CHECK (special_offer_discount_percent >= 0 AND special_offer_discount_percent <= 100);

-- Adicionar colunas para rastrear quantidades de ingressos normais e especiais nas vendas
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS normal_tickets_quantity integer,
ADD COLUMN IF NOT EXISTS special_tickets_quantity integer;

-- Comentários para documentação
COMMENT ON COLUMN public.products.special_offer_enabled IS 'Habilita ofertas especiais (meia entrada, estudante, etc)';
COMMENT ON COLUMN public.products.special_offer_title IS 'Título customizável da oferta especial (ex: Meia Entrada, Estudante da UFT)';
COMMENT ON COLUMN public.products.special_offer_discount_percent IS 'Porcentagem de desconto da oferta especial (padrão: 50%)';
COMMENT ON COLUMN public.sales.normal_tickets_quantity IS 'Quantidade de ingressos normais (preço cheio)';
COMMENT ON COLUMN public.sales.special_tickets_quantity IS 'Quantidade de ingressos especiais (com desconto)';