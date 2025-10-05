-- Cria a tabela para armazenar as configurações dos webhooks dos produtores.
CREATE TABLE public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL DEFAULT 'whsec_' || replace(gen_random_uuid()::text, '-', ''),
    event_types TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS e cria políticas
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtores podem ver seus próprios endpoints" ON public.webhook_endpoints
    FOR SELECT USING (auth.uid() = producer_id);

CREATE POLICY "Produtores podem criar endpoints" ON public.webhook_endpoints
    FOR INSERT WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Produtores podem atualizar seus próprios endpoints" ON public.webhook_endpoints
    FOR UPDATE USING (auth.uid() = producer_id);

CREATE POLICY "Produtores podem deletar seus próprios endpoints" ON public.webhook_endpoints
    FOR DELETE USING (auth.uid() = producer_id);