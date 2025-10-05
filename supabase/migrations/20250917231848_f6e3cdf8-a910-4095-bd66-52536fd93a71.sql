-- CORREÇÃO CIRÚRGICA: Fix webhook duplicity and enrich payload in enqueue_webhook_deliveries function
CREATE OR REPLACE FUNCTION public.enqueue_webhook_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_info RECORD;
  product_info RECORD;
  customer_info RECORD;
  selected_webhook RECORD;
  rich_payload JSONB;
BEGIN
  RAISE NOTICE '[enqueue_webhook_deliveries] Processing event: sale_id=%, event_type=%', NEW.sale_id, NEW.event_type;
  
  -- 1. Get complete sale information with product and customer details
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

  -- If no sale found, log warning and continue
  IF NOT FOUND THEN
    RAISE WARNING '[enqueue_webhook_deliveries] Sale not found for sale_id: %', NEW.sale_id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[enqueue_webhook_deliveries] Sale info: product_id=%, producer_id=%', sale_info.product_id, sale_info.producer_id;

  -- 2. PRIORITY SELECTION: Find the most specific webhook (product-specific first, then global)
  SELECT we.id, we.name, we.url, we.producer_id, we.product_id, we.event_types
  INTO selected_webhook
  FROM public.webhook_endpoints we
  WHERE we.is_active = true
    AND we.producer_id = sale_info.producer_id
    AND (
      we.product_id = sale_info.product_id  -- Specific product webhook
      OR we.product_id IS NULL              -- Global webhook (all products)
    )
    AND EXISTS (
      -- Check if event_type matches any in the array (case-insensitive)
      SELECT 1 FROM unnest(we.event_types) AS webhook_event_type
      WHERE trim(lower(webhook_event_type)) = trim(lower(NEW.event_type))
    )
  ORDER BY 
    CASE WHEN we.product_id IS NOT NULL THEN 1 ELSE 2 END,  -- Product-specific first
    we.created_at DESC  -- Most recent if multiple exist
  LIMIT 1;

  -- If no webhook found, log and return
  IF NOT FOUND THEN
    RAISE WARNING '[enqueue_webhook_deliveries] No active webhooks found for producer_id=%, product_id=%, event_type=%', sale_info.producer_id, sale_info.product_id, NEW.event_type;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[enqueue_webhook_deliveries] Selected webhook: id=%, name=%, url=%, is_product_specific=%', 
    selected_webhook.id, selected_webhook.name, selected_webhook.url, 
    (selected_webhook.product_id IS NOT NULL);

  -- 3. BUILD RICH PAYLOAD following the expected robust structure
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
        'full_name', COALESCE(sale_info.customer_full_name, 'Cliente'),
        'email', sale_info.buyer_email,
        'mobile', COALESCE(sale_info.customer_mobile, '+5511999999999')
      ),
      'Commissions', jsonb_build_object(
        'charge_amount', sale_info.charge_amount,
        'product_base_price', sale_info.product_base_price,
        'diypay_fee', sale_info.diypay_fee,  -- Generic name, no gateway exposure
        'settlement_amount', sale_info.settlement_amount,
        'currency', 'BRL',
        'my_commission', sale_info.settlement_amount
      ),
      'Subscription', NULL
    )
  );

  -- 4. Create ONLY ONE delivery job for the selected webhook
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
  );

  RAISE NOTICE '[enqueue_webhook_deliveries] Created 1 webhook delivery job for webhook_id=%', selected_webhook.id;

  RETURN NEW;
END;
$function$;