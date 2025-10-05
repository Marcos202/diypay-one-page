-- Fix remaining function search path security warnings
-- Update all remaining functions to have proper search_path settings

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  ) = 'admin';
END;
$function$;

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Fix upsert_producer_balance function
CREATE OR REPLACE FUNCTION public.upsert_producer_balance(p_producer_id uuid, amount_to_add bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.producer_financials (producer_id, available_balance_cents, updated_at)
  VALUES (p_producer_id, amount_to_add, NOW())
  ON CONFLICT (producer_id) DO UPDATE
  SET
    available_balance_cents = producer_financials.available_balance_cents + amount_to_add,
    updated_at = NOW();
END;
$function$;

-- Fix set_active_cohort_for_space function
CREATE OR REPLACE FUNCTION public.set_active_cohort_for_space(p_space_id uuid, p_cohort_id_to_activate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Primeiro, desativa TODAS as turmas para este space_id
  UPDATE public.cohorts
  SET is_active = false
  WHERE space_id = p_space_id;

  -- Segundo, ativa APENAS a turma alvo
  UPDATE public.cohorts
  SET is_active = true
  WHERE id = p_cohort_id_to_activate;
END;
$function$;

-- Fix update_withdrawal_requests_updated_at function
CREATE OR REPLACE FUNCTION public.update_withdrawal_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.processed_at = CASE WHEN NEW.status != OLD.status THEN NOW() ELSE OLD.processed_at END;
    RETURN NEW;
END;
$function$;