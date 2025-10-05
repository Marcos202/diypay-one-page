-- Fix database function security by adding proper search_path configuration

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'producer');
  RETURN new;
END;
$function$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Fix create_financial_transactions_for_sale function
CREATE OR REPLACE FUNCTION public.create_financial_transactions_for_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  producer_uuid UUID;
BEGIN
  -- Buscar o producer_id da venda
  SELECT p.producer_id INTO producer_uuid
  FROM public.products p
  WHERE p.id = NEW.product_id;

  -- Se a venda mudou para 'paid' e ainda não foi processada
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Inserir transação de crédito
    INSERT INTO public.financial_transactions (
      producer_id,
      sale_id,
      transaction_type,
      amount_cents,
      description
    ) VALUES (
      producer_uuid,
      NEW.id,
      'credit',
      NEW.producer_share_cents,
      'Venda: ' || (SELECT name FROM public.products WHERE id = NEW.product_id)
    );

    -- Inserir transação de taxa
    INSERT INTO public.financial_transactions (
      producer_id,
      sale_id,
      transaction_type,
      amount_cents,
      description
    ) VALUES (
      producer_uuid,
      NEW.id,
      'fee',
      -NEW.platform_fee_cents,
      'Taxa da plataforma: ' || (SELECT name FROM public.products WHERE id = NEW.product_id)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix upsert_producer_balance function
CREATE OR REPLACE FUNCTION public.upsert_producer_balance(p_producer_id uuid, amount_to_add bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

-- Fix update_withdrawal_requests_updated_at function
CREATE OR REPLACE FUNCTION public.update_withdrawal_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    NEW.processed_at = CASE WHEN NEW.status != OLD.status THEN NOW() ELSE OLD.processed_at END;
    RETURN NEW;
END;
$function$;

-- Fix calculate_producer_balances_simple function (already created but ensuring security)
CREATE OR REPLACE FUNCTION public.calculate_producer_balances_simple(p_producer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    total_released_cents integer;
    pending_release_cents integer;
    security_reserve_config_percent numeric;
    security_reserve_cents integer;
    available_balance_cents integer;
    pending_balance_cents integer;
BEGIN
    -- Busca a configuração da reserva de segurança
    SELECT COALESCE(ps.custom_security_reserve_percent, s.default_security_reserve_percent, 0)
    INTO security_reserve_config_percent
    FROM public.platform_settings s
    LEFT JOIN public.producer_settings ps ON ps.producer_id = p_producer_id
    LIMIT 1;

    -- Calcula o total líquido que já passou do prazo de liberação
    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO total_released_cents
    FROM public.sales
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND status = 'paid' AND release_date <= CURRENT_DATE;

    -- Calcula o total líquido que ainda está aguardando o prazo
    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO pending_release_cents
    FROM public.sales
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND status = 'paid' AND release_date > CURRENT_DATE;

    -- Calcula o valor da reserva de segurança sobre o total já liberado
    security_reserve_cents := FLOOR(total_released_cents * (security_reserve_config_percent / 100.0));

    -- Saldo Disponível = Total Liberado - Reserva de Segurança
    available_balance_cents := total_released_cents - security_reserve_cents;

    -- Saldo Pendente = O que ainda não foi liberado + A reserva que está retida
    pending_balance_cents := pending_release_cents + security_reserve_cents;

    RETURN json_build_object(
        'available_balance', available_balance_cents,
        'pending_balance', pending_balance_cents
    );
END;
$function$;