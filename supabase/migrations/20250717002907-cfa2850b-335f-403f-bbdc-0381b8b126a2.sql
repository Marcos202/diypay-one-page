-- ETAPA 1: Adicionar colunas para Reserva de Segurança e Taxa de Saque

-- Adicionar as colunas para a RESERVA DE SEGURANÇA padrão da plataforma
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS default_security_reserve_percent NUMERIC(5, 2) NOT NULL DEFAULT 4.00,
ADD COLUMN IF NOT EXISTS default_security_reserve_days INTEGER NOT NULL DEFAULT 30;

-- Adicionar a coluna para a TAXA DE SAQUE padrão da plataforma
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS default_withdrawal_fee_cents INTEGER NOT NULL DEFAULT 367;

-- Adicionar as colunas para a RESERVA DE SEGURANÇA personalizada por produtor
ALTER TABLE public.producer_settings
ADD COLUMN IF NOT EXISTS custom_security_reserve_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS custom_security_reserve_days INTEGER;

-- Adicionar a coluna para a TAXA DE SAQUE personalizada por produtor
ALTER TABLE public.producer_settings
ADD COLUMN IF NOT EXISTS custom_withdrawal_fee_cents INTEGER;

-- Adicionar coluna para armazenar a taxa cobrada em cada solicitação de saque
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS fee_cents INTEGER NOT NULL DEFAULT 0;