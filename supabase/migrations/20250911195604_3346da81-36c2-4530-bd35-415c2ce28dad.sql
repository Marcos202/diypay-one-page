-- ETAPA 3: Implementar Scheduler com pg_cron
-- Habilitar extensão pg_cron e criar job para processar webhooks a cada minuto

-- 1. Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar job cron para executar process-webhook-deliveries a cada minuto
SELECT cron.schedule(
  'process-webhook-deliveries-every-minute',
  '* * * * *', -- A cada minuto
  $$
  SELECT
    net.http_post(
        url:='https://huakzwguwjulxhvcztuh.supabase.co/functions/v1/process-webhook-deliveries',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWt6d2d1d2p1bHhodmN6dHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDQzNTQsImV4cCI6MjA2NDQ4MDM1NH0.mTlrd3bYmkBDPjrkLs-3B8eAfdTjjOn7ILj52XS5TpU"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- 3. Verificar se o job foi criado corretamente
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'process-webhook-deliveries-every-minute';