-- Create the trigger to ensure webhook jobs are enqueued when transaction events are created
DROP TRIGGER IF EXISTS trigger_enqueue_webhook_deliveries ON public.transaction_events;

CREATE TRIGGER trigger_enqueue_webhook_deliveries
    AFTER INSERT ON public.transaction_events
    FOR EACH ROW
    EXECUTE FUNCTION public.enqueue_webhook_deliveries();

-- Create a backfill function to process missed events
CREATE OR REPLACE FUNCTION public.backfill_webhook_delivery_jobs()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  jobs_created INTEGER := 0;
  event_rec RECORD;
  sale_info RECORD;
  webhook_rec RECORD;
  payload JSONB;
BEGIN
  -- Find transaction events from the last 7 days that don't have corresponding webhook delivery jobs
  FOR event_rec IN
    SELECT te.id, te.sale_id, te.event_type, te.metadata, te.created_at
    FROM public.transaction_events te
    WHERE te.created_at >= (now() - interval '7 days')
      AND NOT EXISTS (
        SELECT 1 FROM public.webhook_delivery_jobs wdj 
        WHERE wdj.transaction_event_id = te.id
      )
  LOOP
    -- Get sale information including producer_id via JOIN with products
    SELECT s.id as sale_id, s.product_id, p.producer_id INTO sale_info
    FROM public.sales s
    JOIN public.products p ON s.product_id = p.id
    WHERE s.id = event_rec.sale_id;

    -- If no sale found, skip this event
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Build the payload for the webhook
    payload := jsonb_build_object(
      'event_id', event_rec.id,
      'event_type', event_rec.event_type,
      'sale_id', event_rec.sale_id,
      'created_at', event_rec.created_at,
      'data', event_rec.metadata
    );

    -- Find matching webhooks and create jobs
    FOR webhook_rec IN
      SELECT we.id, we.name, we.url, we.producer_id, we.product_id, we.event_types
      FROM public.webhook_endpoints we
      WHERE we.is_active = true
        AND we.producer_id = sale_info.producer_id
        AND (
          we.product_id IS NULL
          OR we.product_id = sale_info.product_id
        )
        AND EXISTS (
          SELECT 1 FROM unnest(we.event_types) AS event_type_item
          WHERE trim(lower(event_type_item)) = trim(lower(event_rec.event_type))
        )
    LOOP
      -- Create delivery job for this webhook
      INSERT INTO public.webhook_delivery_jobs (
        webhook_endpoint_id,
        transaction_event_id,
        event_type,
        payload
      ) VALUES (
        webhook_rec.id,
        event_rec.id,
        event_rec.event_type,
        payload
      );
      
      jobs_created := jobs_created + 1;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'jobs_created', jobs_created,
    'message', 'Backfill completed successfully'
  );
END;
$function$;