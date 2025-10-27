-- FASE 1: Adicionar campos de configuração de evento à tabela products

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_address TEXT,
ADD COLUMN IF NOT EXISTS event_description TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.products.event_date IS 'Data e hora do evento presencial';
COMMENT ON COLUMN public.products.event_address IS 'Endereço completo do evento';
COMMENT ON COLUMN public.products.event_description IS 'Descrição detalhada do evento exibida nos ingressos';