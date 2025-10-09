-- Adicionar coluna para lock de processamento atômico
ALTER TABLE webhook_delivery_jobs 
ADD COLUMN IF NOT EXISTS processing_lock_id UUID;

-- Recriar função com lock UUID único e atômico
CREATE OR REPLACE FUNCTION public.get_and_lock_pending_webhook_jobs(p_limit integer)
RETURNS TABLE(
  id uuid,
  webhook_endpoint_id uuid,
  transaction_event_id uuid,
  event_type text,
  payload jsonb,
  attempts integer,
  max_attempts integer
) 
LANGUAGE plpgsql
AS $function$
DECLARE
  v_lock_id UUID := gen_random_uuid();
BEGIN
  -- Atualizar jobs com lock único (previne race conditions)
  UPDATE public.webhook_delivery_jobs wdj
  SET 
    processing_started_at = now(),
    processing_lock_id = v_lock_id
  WHERE wdj.id IN (
    SELECT j.id
    FROM public.webhook_delivery_jobs j
    WHERE j.status = 'pending'
      AND j.next_attempt_at <= now()
      AND j.attempts < j.max_attempts
      AND j.processing_lock_id IS NULL  -- Apenas jobs não travados
      AND (j.processing_started_at IS NULL OR j.processing_started_at < now() - interval '5 minutes')
    ORDER BY j.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  );

  -- Retornar APENAS jobs travados por ESTE lock_id único
  RETURN QUERY
  SELECT
    wdj.id,
    wdj.webhook_endpoint_id,
    wdj.transaction_event_id,
    wdj.event_type,
    wdj.payload,
    wdj.attempts,
    wdj.max_attempts
  FROM webhook_delivery_jobs wdj
  WHERE wdj.processing_lock_id = v_lock_id;
END;
$function$;