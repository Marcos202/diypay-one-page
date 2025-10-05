-- Simply enable RLS on the webhook tables
ALTER TABLE public.webhook_delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;