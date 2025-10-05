
-- Adicionar novas colunas à tabela products para suportar múltiplos tipos de produto
ALTER TABLE public.products 
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'single_payment',
ADD COLUMN subscription_frequency TEXT,
ADD COLUMN allowed_payment_methods JSONB NOT NULL DEFAULT '["credit_card", "pix", "bank_slip"]';

-- Adicionar constraints para garantir valores válidos
ALTER TABLE public.products 
ADD CONSTRAINT check_product_type 
CHECK (product_type IN ('single_payment', 'subscription', 'event', 'donation'));

ALTER TABLE public.products 
ADD CONSTRAINT check_subscription_frequency 
CHECK (subscription_frequency IS NULL OR subscription_frequency IN ('weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually'));

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.products.product_type IS 'Tipo do produto: single_payment, subscription, event, donation';
COMMENT ON COLUMN public.products.subscription_frequency IS 'Frequência de cobrança para assinaturas';
COMMENT ON COLUMN public.products.allowed_payment_methods IS 'Array JSON com métodos de pagamento permitidos';
