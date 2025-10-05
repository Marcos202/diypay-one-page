-- Create webhook delivery jobs table
CREATE TABLE public.webhook_delivery_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id UUID NOT NULL,
  transaction_event_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_delivery_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook delivery jobs
CREATE POLICY "Producers can view their own webhook delivery jobs" 
ON public.webhook_delivery_jobs 
FOR SELECT 
USING (
  webhook_endpoint_id IN (
    SELECT id FROM public.webhook_endpoints 
    WHERE producer_id = auth.uid()
  )
);

CREATE POLICY "Service role full access to webhook delivery jobs" 
ON public.webhook_delivery_jobs 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_webhook_delivery_jobs_status_next_attempt 
ON public.webhook_delivery_jobs (status, next_attempt_at);

CREATE INDEX idx_webhook_delivery_jobs_webhook_endpoint_id 
ON public.webhook_delivery_jobs (webhook_endpoint_id);

CREATE INDEX idx_webhook_delivery_jobs_transaction_event_id 
ON public.webhook_delivery_jobs (transaction_event_id);

-- Create function to enqueue webhook delivery jobs
CREATE OR REPLACE FUNCTION public.enqueue_webhook_deliveries()
RETURNS TRIGGER AS $$
DECLARE
  webhook_rec RECORD;
  payload JSONB;
BEGIN
  -- Build the payload for the webhook
  payload := json_build_object(
    'event_id', NEW.id,
    'event_type', NEW.event_type,
    'sale_id', NEW.sale_id,
    'timestamp', NEW.created_at,
    'data', NEW.metadata
  );

  -- Find all matching webhook endpoints for this event
  FOR webhook_rec IN 
    SELECT we.id, we.producer_id, we.product_id, we.event_types
    FROM public.webhook_endpoints we
    JOIN public.sales s ON s.product_id = we.product_id OR we.product_id IS NULL
    WHERE we.is_active = true 
      AND NEW.event_type = ANY(we.event_types)
      AND s.id = NEW.sale_id
      AND s.product_id IN (
        SELECT id FROM public.products 
        WHERE producer_id = we.producer_id
      )
  LOOP
    -- Create a delivery job for each matching webhook
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically enqueue webhook deliveries
CREATE TRIGGER trigger_enqueue_webhook_deliveries
  AFTER INSERT ON public.transaction_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_webhook_deliveries();

-- Create function to update webhook job timestamps
CREATE OR REPLACE FUNCTION public.update_webhook_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating updated_at on webhook jobs
CREATE TRIGGER update_webhook_delivery_jobs_updated_at
  BEFORE UPDATE ON public.webhook_delivery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhook_job_updated_at();