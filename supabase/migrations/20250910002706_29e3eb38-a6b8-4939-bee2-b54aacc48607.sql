-- Cria a tabela para registrar cada tentativa de envio de webhook.
CREATE TABLE public.webhook_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL, -- ex: 'success', 'failed'
    response_code INT,
    response_body TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS e cria políticas
ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtores podem ver os logs de seus próprios endpoints" ON public.webhook_event_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.webhook_endpoints we
            WHERE we.id = endpoint_id AND we.producer_id = auth.uid()
        )
    );