-- Fix the enqueue_webhook_deliveries function with corrected logic
CREATE OR REPLACE FUNCTION public.enqueue_webhook_deliveries()
RETURNS TRIGGER AS $$
DECLARE
  sale_info RECORD;
  webhook_rec RECORD;
  payload JSONB;
  webhook_count INTEGER := 0;
  event_type_item TEXT;
BEGIN
  RAISE NOTICE '[enqueue_webhook_deliveries] Processing event: sale_id=%, event_type=%', NEW.sale_id, NEW.event_type;
  
  -- 1. Get sale information including producer_id via JOIN with products
  SELECT s.id as sale_id, s.product_id, p.producer_id INTO sale_info
  FROM public.sales s
  JOIN public.products p ON s.product_id = p.id
  WHERE s.id = NEW.sale_id;

  -- If no sale found, log warning and continue (don't abort)
  IF NOT FOUND THEN
    RAISE WARNING '[enqueue_webhook_deliveries] Sale not found for sale_id: %', NEW.sale_id;
    RETURN NEW;
  END IF;

  RAISE NOTICE '[enqueue_webhook_deliveries] Sale info: product_id=%, producer_id=%', sale_info.product_id, sale_info.producer_id;

  -- 2. Build the payload for the webhook
  payload := jsonb_build_object(
    'event_id', NEW.id,
    'event_type', NEW.event_type,
    'sale_id', NEW.sale_id,
    'created_at', NEW.created_at,
    'data', NEW.metadata
  );

  -- 3. Find ALL webhooks that match the criteria using proper logic
  FOR webhook_rec IN
    SELECT we.id, we.name, we.url, we.producer_id, we.product_id, we.event_types
    FROM public.webhook_endpoints we
    WHERE we.is_active = true
      AND we.producer_id = sale_info.producer_id  -- Webhook belongs to sale's producer
      AND (
        we.product_id IS NULL                        -- Global webhook (all products)
        OR we.product_id = sale_info.product_id    -- Specific product webhook
      )
      AND EXISTS (
        -- Check if event_type matches any in the array (case-insensitive)
        SELECT 1 FROM unnest(we.event_types) AS event_type_item
        WHERE trim(lower(event_type_item)) = trim(lower(NEW.event_type))
      )
  LOOP
    RAISE NOTICE '[enqueue_webhook_deliveries] Creating job for webhook: id=%, name=%, url=%', webhook_rec.id, webhook_rec.name, webhook_rec.url;
    
    -- 4. Create delivery job for this webhook
    INSERT INTO public.webhook_delivery_jobs (
      webhook_endpoint_id,
      transaction_event_id,
      event_type,
      payload
    ) VALUES (
      webhook_rec.id,
      NEW.id,
      NEW.event_type,
      payload
    );
    
    webhook_count := webhook_count + 1;
  END LOOP;

  RAISE NOTICE '[enqueue_webhook_deliveries] Created % webhook delivery jobs', webhook_count;
  
  -- Log warning if no webhooks found (helps debugging)
  IF webhook_count = 0 THEN
    RAISE WARNING '[enqueue_webhook_deliveries] No active webhooks found for producer_id=%, product_id=%, event_type=%', sale_info.producer_id, sale_info.product_id, NEW.event_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;