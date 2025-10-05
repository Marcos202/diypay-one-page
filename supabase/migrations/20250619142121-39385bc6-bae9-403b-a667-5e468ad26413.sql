
-- Adicionar nova coluna para armazenar dados dos participantes de eventos
ALTER TABLE public.sales 
ADD COLUMN event_attendees JSONB NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.sales.event_attendees IS 'Array JSON com dados dos participantes do evento (nome, email, etc.)';
