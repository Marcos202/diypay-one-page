-- FASE 1 (continuação): Criar função para buscar jobs com lock

CREATE OR REPLACE FUNCTION public.get_pending_webhook_jobs_locked(max_jobs INTEGER DEFAULT 50)
RETURNS SETOF webhook_delivery_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM webhook_delivery_jobs
  WHERE status = 'pending'
    AND next_attempt_at <= NOW()
    AND attempts < max_attempts
  ORDER BY created_at ASC
  LIMIT max_jobs
  FOR UPDATE SKIP LOCKED;
END;
$$;