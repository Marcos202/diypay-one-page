
-- Primeiro, vamos verificar e ajustar a estrutura da tabela platform_settings existente
DO $$
BEGIN
    -- Adicionar colunas que podem estar faltando na tabela platform_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_pix_fee_percent') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_pix_fee_percent NUMERIC(5, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_boleto_fee_percent') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_boleto_fee_percent NUMERIC(5, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_card_installments_fees') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_card_installments_fees JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_pix_release_days') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_pix_release_days INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_boleto_release_days') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_boleto_release_days INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_card_release_days') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_card_release_days INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_security_reserve_percent') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_security_reserve_percent NUMERIC(5, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'default_anticipation_fee_percent') THEN
        ALTER TABLE public.platform_settings ADD COLUMN default_anticipation_fee_percent NUMERIC(5, 2);
    END IF;
END
$$;

-- Atualizar os valores das novas colunas para todos os registros existentes
UPDATE public.platform_settings 
SET 
    default_pix_fee_percent = COALESCE(default_pix_fee_percent, 5.00),
    default_boleto_fee_percent = COALESCE(default_boleto_fee_percent, 5.00),
    default_card_installments_fees = COALESCE(default_card_installments_fees, '{"1": 5.00, "2": 6.85, "3": 6.85, "4": 6.85, "5": 6.85, "6": 6.85, "7": 6.99, "8": 6.99, "9": 6.99, "10": 6.99, "11": 6.99, "12": 6.99}'::jsonb),
    default_pix_release_days = COALESCE(default_pix_release_days, 2),
    default_boleto_release_days = COALESCE(default_boleto_release_days, 2),
    default_card_release_days = COALESCE(default_card_release_days, 15),
    default_security_reserve_percent = COALESCE(default_security_reserve_percent, 10.00),
    default_anticipation_fee_percent = COALESCE(default_anticipation_fee_percent, 5.00);

-- Se não existem registros na tabela, inserir um registro padrão
INSERT INTO public.platform_settings (default_pix_fee_percent, default_boleto_fee_percent, default_card_installments_fees, default_pix_release_days, default_boleto_release_days, default_card_release_days, default_security_reserve_percent, default_anticipation_fee_percent)
SELECT 5.00, 5.00, '{"1": 5.00, "2": 6.85, "3": 6.85, "4": 6.85, "5": 6.85, "6": 6.85, "7": 6.99, "8": 6.99, "9": 6.99, "10": 6.99, "11": 6.99, "12": 6.99}'::jsonb, 2, 2, 15, 10.00, 5.00
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Criar a tabela producer_settings se não existir
CREATE TABLE IF NOT EXISTS public.producer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    custom_pix_fee_percent NUMERIC(5, 2),
    custom_boleto_fee_percent NUMERIC(5, 2),
    custom_card_installments_fees JSONB,
    custom_pix_release_days INTEGER,
    custom_boleto_release_days INTEGER,
    custom_card_release_days INTEGER,
    custom_security_reserve_percent NUMERIC(5, 2),
    custom_anticipation_fee_percent NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar novas colunas à tabela sales se não existirem
ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS release_date DATE,
    ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS producer_share_cents INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS security_reserve_cents INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';
