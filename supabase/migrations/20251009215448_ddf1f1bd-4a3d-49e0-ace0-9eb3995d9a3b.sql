-- Remove o cron job antigo (se existir)
SELECT cron.unschedule('process-webhook-deliveries-every-minute');

-- Cria novo cron job para executar a cada 10 segundos
SELECT cron.schedule(
  'process-webhook-deliveries-every-10-seconds',
  '*/10 * * * * *', -- A cada 10 segundos
  $$
  SELECT
    net.http_post(
        url:='https://huakzwguwjulxhvcztuh.supabase.co/functions/v1/process-webhook-deliveries',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWt6d2d1d2p1bHhodmN6dHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDQzNTQsImV4cCI6MjA2NDQ4MDM1NH0.mTlrd3bYmkBDPjrkLs-3B8eAfdTjjOn7ILj52XS5TpU"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);