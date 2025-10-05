-- Fix function search path security warnings
-- Update all functions to have proper search_path settings

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email), 
    'producer'
  );
  RETURN new;
END;
$function$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix create_financial_transactions_for_sale function  
CREATE OR REPLACE FUNCTION public.create_financial_transactions_for_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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