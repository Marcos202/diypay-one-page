
-- Adicionar coluna para armazenar dados dos participantes de eventos
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS event_attendees JSONB;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.sales.event_attendees IS 'Array JSON com dados dos participantes do evento (nome, email, status de check-in, etc.)';
