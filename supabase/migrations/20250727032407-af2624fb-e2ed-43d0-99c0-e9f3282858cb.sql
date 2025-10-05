-- Adicionar nova coluna para taxa de juros de parcelamento na plataforma
ALTER TABLE public.platform_settings 
ADD COLUMN card_installment_interest_rate NUMERIC DEFAULT 3.50;

-- Adicionar nova coluna para taxa base do cartão (será igual ao PIX/Boleto)
ALTER TABLE public.platform_settings 
ADD COLUMN default_card_fee_percent NUMERIC DEFAULT 5.00;

-- Remover a coluna antiga de taxas por parcela
ALTER TABLE public.platform_settings 
DROP COLUMN default_card_installments_fees;

-- Adicionar nova coluna na tabela products para o toggle do produtor
ALTER TABLE public.products 
ADD COLUMN producer_assumes_installments BOOLEAN DEFAULT false;