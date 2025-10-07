-- FASE 1: Adicionar constraint UNIQUE para prevenir webhooks duplicados
-- e adicionar lógica de locking para prevenir processamento duplicado

-- 1. Remover duplicatas existentes (usar created_at para manter o mais antigo)
DELETE FROM webhook_delivery_jobs
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM webhook_delivery_jobs
  GROUP BY transaction_event_id, webhook_endpoint_id
);

-- 2. Adicionar constraint UNIQUE
ALTER TABLE webhook_delivery_jobs
DROP CONSTRAINT IF EXISTS webhook_delivery_jobs_unique_event_endpoint;

ALTER TABLE webhook_delivery_jobs
ADD CONSTRAINT webhook_delivery_jobs_unique_event_endpoint 
UNIQUE (transaction_event_id, webhook_endpoint_id);

-- 3. Adicionar coluna para tracking de processamento (evitar race conditions)
ALTER TABLE webhook_delivery_jobs
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

-- 4. Criar índice para melhorar performance das queries
DROP INDEX IF EXISTS idx_webhook_jobs_processing;

CREATE INDEX idx_webhook_jobs_processing 
ON webhook_delivery_jobs (status, next_attempt_at, processing_started_at)
WHERE status = 'pending' AND attempts < max_attempts;

-- 5. Adicionar logging na trigger para debug
CREATE OR REPLACE FUNCTION public.enqueue_webhook_deliveries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_info RECORD;
  selected_webhook RECORD;
  rich_payload JSONB;
BEGIN
  RAISE NOTICE '[enqueue_webhook_deliveries] Processing event: sale_id=%, event_type=%', NEW.sale_id, NEW.event_type;
  
  SELECT 
    s.id as sale_id,
    s.product_id,
    s.status as order_status,
    s.payment_method_used as payment_method,
    s.installments_chosen as installments,
    s.amount_total_cents as charge_amount,
    s.platform_fee_cents as diypay_fee,
    s.producer_share_cents as settlement_amount,
    s.buyer_email,
    s.created_at as sale_created_at,
    s.paid_at as approved_date,
    p.producer_id,
    p.name as product_name,
    p.price_cents as product_base_price,
    prof.full_name as customer_full_name,
    prof.phone as customer_mobile
  INTO sale_info
  FROM public.sales s
  JOIN public.products p ON s.product_id = p.id
  LEFT JOIN public.profiles prof ON s.buyer_profile_id = prof.id
  WHERE s.id = NEW.sale_id;

  IF NOT FOUND THEN
    RAISE WARNING '[enqueue_webhook_deliveries] Sale not found for sale_id: %', NEW.sale_id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[enqueue_webhook_deliveries] Sale info: product_id=%, producer_id=%', sale_info.product_id, sale_info.producer_id;

  SELECT we.id, we.name, we.url, we.producer_id, we.product_id, we.event_types
  INTO selected_webhook
  FROM public.webhook_endpoints we
  WHERE we.is_active = true
    AND we.producer_id = sale_info.producer_id
    AND (we.product_id = sale_info.product_id OR we.product_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM unnest(we.event_types) AS webhook_event_type
      WHERE trim(lower(webhook_event_type)) = trim(lower(NEW.event_type))
    )
  ORDER BY CASE WHEN we.product_id IS NOT NULL THEN 1 ELSE 2 END, we.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE WARNING '[enqueue_webhook_deliveries] No webhook found for producer_id=%, event_type=%', sale_info.producer_id, NEW.event_type;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[enqueue_webhook_deliveries] Selected webhook: id=%, name=%', selected_webhook.id, selected_webhook.name;

  rich_payload := jsonb_build_object(
    'event_id', NEW.id,
    'event_type', NEW.event_type,
    'created_at', NEW.created_at,
    'data', jsonb_build_object(
      'order_id', sale_info.sale_id,
      'order_status', sale_info.order_status,
      'payment_method', sale_info.payment_method,
      'installments', COALESCE(sale_info.installments, 1),
      'created_at', sale_info.sale_created_at,
      'approved_date', sale_info.approved_date,
      'webhook_event_type', NEW.event_type,
      'Product', jsonb_build_object(
        'product_id', sale_info.product_id,
        'product_name', sale_info.product_name
      ),
      'Customer', jsonb_build_object(
        'full_name', sale_info.customer_full_name,
        'email', sale_info.buyer_email,
        'mobile', sale_info.customer_mobile
      ),
      'Commissions', jsonb_build_object(
        'charge_amount', sale_info.charge_amount,
        'product_base_price', sale_info.product_base_price,
        'diypay_fee', sale_info.diypay_fee,
        'settlement_amount', sale_info.settlement_amount,
        'currency', 'BRL',
        'my_commission', sale_info.settlement_amount
      ),
      'Subscription', NULL
    )
  );

  BEGIN
    INSERT INTO public.webhook_delivery_jobs (
      webhook_endpoint_id,
      transaction_event_id,
      event_type,
      payload
    ) VALUES (
      selected_webhook.id,
      NEW.id,
      NEW.event_type,
      rich_payload
    )
    ON CONFLICT (transaction_event_id, webhook_endpoint_id) DO NOTHING;
    
    RAISE NOTICE '[enqueue_webhook_deliveries] Webhook job enqueued for webhook_id=%', selected_webhook.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[enqueue_webhook_deliveries] Error inserting webhook job: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;