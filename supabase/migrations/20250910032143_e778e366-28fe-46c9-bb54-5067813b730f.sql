-- Create transaction_events table for immutable audit logging of all transaction lifecycle events
CREATE TABLE public.transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transaction_events IS 'Immutable audit log for all significant events in the transaction lifecycle';
COMMENT ON COLUMN public.transaction_events.event_type IS 'Event types: pix.gerado, boleto.gerado, compra.aprovada, compra.recusada, reembolso, chargeback, assinatura.cancelada, assinatura.atrasada, assinatura.renovada, carrinho.abandonado';
COMMENT ON COLUMN public.transaction_events.metadata IS 'Additional event-specific data like gateway status, rejection reasons, etc.';

-- Enable RLS
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Producers can view events for their sales" ON public.transaction_events
    FOR SELECT USING (
        sale_id IN (
            SELECT s.id FROM public.sales s
            JOIN public.products p ON s.product_id = p.id
            WHERE p.producer_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert events" ON public.transaction_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create index for performance
CREATE INDEX idx_transaction_events_sale_id ON public.transaction_events(sale_id);
CREATE INDEX idx_transaction_events_type ON public.transaction_events(event_type);
CREATE INDEX idx_transaction_events_created_at ON public.transaction_events(created_at DESC);