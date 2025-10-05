-- Correção completa do sistema de eventos de transação

-- 1. Remover as políticas RLS existentes problemáticas
DROP POLICY IF EXISTS "Producers can view events for their sales" ON public.transaction_events;
DROP POLICY IF EXISTS "Service role can insert events" ON public.transaction_events;

-- 2. Criar políticas RLS mais robustas
CREATE POLICY "service_role_full_access" ON public.transaction_events
FOR ALL USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "producers_can_view_their_events" ON public.transaction_events
FOR SELECT USING (
  sale_id IN (
    SELECT s.id
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE p.producer_id = auth.uid()
  )
);

-- 3. Função para recuperar eventos históricos perdidos
CREATE OR REPLACE FUNCTION public.recover_missing_transaction_events()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  events_created INTEGER := 0;
  pix_count INTEGER := 0;
  boleto_count INTEGER := 0;
  approved_count INTEGER := 0;
BEGIN
  -- Recuperar eventos pix.gerado para PIX pendentes ou pagos
  INSERT INTO public.transaction_events (sale_id, event_type, metadata, created_at)
  SELECT 
    s.id,
    'pix.gerado',
    json_build_object(
      'gateway_name', COALESCE(s.gateway_identifier, 'Unknown'),
      'gateway_transaction_id', s.gateway_transaction_id,
      'payment_method', s.payment_method_used,
      'amount_cents', s.amount_total_cents,
      'recovered_event', true
    ),
    s.created_at
  FROM sales s
  WHERE s.payment_method_used = 'pix'
    AND s.id NOT IN (
      SELECT DISTINCT te.sale_id 
      FROM transaction_events te 
      WHERE te.event_type = 'pix.gerado' 
        AND te.sale_id IS NOT NULL
    );

  GET DIAGNOSTICS pix_count = ROW_COUNT;

  -- Recuperar eventos boleto.gerado para Boletos pendentes ou pagos
  INSERT INTO public.transaction_events (sale_id, event_type, metadata, created_at)
  SELECT 
    s.id,
    'boleto.gerado',
    json_build_object(
      'gateway_name', COALESCE(s.gateway_identifier, 'Unknown'),
      'gateway_transaction_id', s.gateway_transaction_id,
      'payment_method', s.payment_method_used,
      'amount_cents', s.amount_total_cents,
      'recovered_event', true
    ),
    s.created_at
  FROM sales s
  WHERE s.payment_method_used = 'bank_slip'
    AND s.id NOT IN (
      SELECT DISTINCT te.sale_id 
      FROM transaction_events te 
      WHERE te.event_type = 'boleto.gerado' 
        AND te.sale_id IS NOT NULL
    );

  GET DIAGNOSTICS boleto_count = ROW_COUNT;

  -- Recuperar eventos compra.aprovada para vendas pagas
  INSERT INTO public.transaction_events (sale_id, event_type, metadata, created_at)
  SELECT 
    s.id,
    'compra.aprovada',
    json_build_object(
      'gateway_name', COALESCE(s.gateway_identifier, 'Unknown'),
      'gateway_transaction_id', s.gateway_transaction_id,
      'payment_method', s.payment_method_used,
      'amount_cents', s.amount_total_cents,
      'recovered_event', true
    ),
    COALESCE(s.paid_at, s.updated_at)
  FROM sales s
  WHERE s.status = 'paid'
    AND s.id NOT IN (
      SELECT DISTINCT te.sale_id 
      FROM transaction_events te 
      WHERE te.event_type = 'compra.aprovada' 
        AND te.sale_id IS NOT NULL
    );

  GET DIAGNOSTICS approved_count = ROW_COUNT;

  events_created := pix_count + boleto_count + approved_count;

  RETURN json_build_object(
    'success', true,
    'events_created', events_created,
    'breakdown', json_build_object(
      'pix_gerado', pix_count,
      'boleto_gerado', boleto_count,
      'compra_aprovada', approved_count
    )
  );
END;
$function$;