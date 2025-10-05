-- Fase 1: Adicionar capacidade de configurar taxa fixa por transação

-- ETAPA 1: Modificar a tabela platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS default_fixed_fee_cents INTEGER NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.platform_settings.default_fixed_fee_cents IS 'Taxa fixa padrão por transação, em centavos.';

-- ETAPA 2: Modificar a tabela producer_settings  
ALTER TABLE public.producer_settings
ADD COLUMN IF NOT EXISTS custom_fixed_fee_cents INTEGER;

COMMENT ON COLUMN public.producer_settings.custom_fixed_fee_cents IS 'Taxa fixa personalizada por transação, em centavos. Sobrescreve a padrão.';