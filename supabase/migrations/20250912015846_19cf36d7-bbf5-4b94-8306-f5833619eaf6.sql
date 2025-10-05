-- Fix RLS issues for webhook tables
-- These tables should have RLS enabled but only be accessible to service role and producers

-- Enable RLS on webhook_delivery_jobs
ALTER TABLE public.webhook_delivery_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_delivery_jobs
CREATE POLICY "Service role full access to webhook delivery jobs" 
ON public.webhook_delivery_jobs 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Producers can view their own webhook delivery jobs" 
ON public.webhook_delivery_jobs 
FOR SELECT 
USING (webhook_endpoint_id IN (
  SELECT id FROM public.webhook_endpoints 
  WHERE producer_id = auth.uid()
));

-- Enable RLS on webhook_event_logs 
ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_event_logs
CREATE POLICY "Service role full access to webhook event logs" 
ON public.webhook_event_logs 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Producers can view logs for their own endpoints" 
ON public.webhook_event_logs 
FOR SELECT 
USING (endpoint_id IN (
  SELECT id FROM public.webhook_endpoints 
  WHERE producer_id = auth.uid()
));