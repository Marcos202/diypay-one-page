-- Fix final remaining function search path security warnings

-- Fix set_new_default_cohort function
CREATE OR REPLACE FUNCTION public.set_new_default_cohort(p_space_id uuid, p_new_default_cohort_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Primeiro, remove o status 'padrão' da turma antiga dentro do mesmo espaço.
  UPDATE cohorts
  SET is_default = false
  WHERE space_id = p_space_id AND is_default = true;

  -- Então, define a nova turma como 'padrão'.
  UPDATE cohorts
  SET is_default = true
  WHERE id = p_new_default_cohort_id;
END;
$function$;

-- Fix update_display_order function
CREATE OR REPLACE FUNCTION public.update_display_order(table_name text, items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET display_order = (%L::jsonb->>''display_order'')::int WHERE id = (%L::jsonb->>''id'')::uuid',
      table_name,
      item,
      item
    );
  END LOOP;
END;
$function$;

-- Fix get_producer_financial_report function
CREATE OR REPLACE FUNCTION public.get_producer_financial_report(p_producer_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    -- Variáveis de saída
    v_kpi_valor_liquido bigint;
    v_kpi_vendas_count int;
    v_kpi_reembolso bigint;
    v_available_balance bigint;
    v_pending_balance bigint;
    v_chart_data json;
    v_recent_transactions json;
    v_sales_history json;
    v_effective_settings json;

    -- Variáveis para configurações
    v_platform_settings record;
    v_producer_settings record;
BEGIN

    -- 1. Buscar configurações da plataforma (sempre existe)
    SELECT * INTO v_platform_settings FROM public.platform_settings WHERE id = 1;

    -- 2. Buscar configurações do produtor (pode não existir)
    SELECT * INTO v_producer_settings FROM public.producer_settings WHERE producer_id = p_producer_id;

    -- 3. Construir o objeto de configurações efetivas que será enviado ao frontend
    v_effective_settings := json_build_object(
        'pix_fee_percent', COALESCE(v_producer_settings.custom_pix_fee_percent, v_platform_settings.default_pix_fee_percent),
        'boleto_fee_percent', COALESCE(v_producer_settings.custom_boleto_fee_percent, v_platform_settings.default_boleto_fee_percent),
        'card_fee_percent', COALESCE(v_producer_settings.custom_card_fee_percent, v_platform_settings.default_card_fee_percent),
        'card_installment_interest_rate', COALESCE(v_producer_settings.custom_card_installment_interest_rate, v_platform_settings.card_installment_interest_rate),
        'fixed_fee_cents', COALESCE(v_producer_settings.custom_fixed_fee_cents, v_platform_settings.default_fixed_fee_cents),
        'pix_release_days', COALESCE(v_producer_settings.custom_pix_release_days, v_platform_settings.default_pix_release_days),
        'boleto_release_days', COALESCE(v_producer_settings.custom_boleto_release_days, v_platform_settings.default_boleto_release_days),
        'card_release_days', COALESCE(v_producer_settings.custom_card_release_days, v_platform_settings.default_card_release_days),
        'security_reserve_percent', COALESCE(v_producer_settings.custom_security_reserve_percent, v_platform_settings.default_security_reserve_percent),
        'security_reserve_days', COALESCE(v_producer_settings.custom_security_reserve_days, v_platform_settings.default_security_reserve_days),
        'withdrawal_fee_cents', COALESCE(v_producer_settings.custom_withdrawal_fee_cents, v_platform_settings.default_withdrawal_fee_cents),
        'is_custom', (v_producer_settings IS NOT NULL)
    );

    -- O resto da lógica de cálculo (KPIs, Saldos, etc.) permanece o mesmo que já validamos.
    -- (O código abaixo é a versão que já funcionava e está estável)
    SELECT COALESCE(SUM(s.producer_share_cents), 0), COALESCE(COUNT(s.id), 0) INTO v_kpi_valor_liquido, v_kpi_vendas_count FROM public.sales s WHERE s.product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) AND s.status = 'paid' AND s.paid_at BETWEEN p_start_date AND p_end_date;
    SELECT COALESCE(SUM(s.amount_total_cents), 0) INTO v_kpi_reembolso FROM public.sales s WHERE s.product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) AND s.status = 'refunded' AND s.created_at BETWEEN p_start_date AND p_end_date;
    
    -- Cálculos de saldo usando a função auxiliar (assumindo que ela está correta)
    SELECT * INTO v_available_balance, v_pending_balance FROM public.calculate_producer_balances_simple(p_producer_id);

    SELECT COALESCE(json_agg(chart_row ORDER BY chart_date), '[]'::json) INTO v_chart_data FROM (SELECT date_trunc('day', s.paid_at) as chart_date, to_char(date_trunc('day', paid_at), 'DD/MM') as name, SUM(producer_share_cents / 100.0) as total FROM public.sales s WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id) AND status = 'paid' AND paid_at BETWEEN p_start_date AND p_end_date GROUP BY date_trunc('day', paid_at)) chart_row;
    SELECT COALESCE(json_agg(sales_row ORDER BY sales_row.created_at DESC), '[]'::json) INTO v_sales_history FROM (SELECT s.id, s.created_at, s.status, s.payment_method_used, s.amount_total_cents, s.producer_share_cents, COALESCE(p.name, 'Produto Removido') as product_name, s.buyer_email FROM public.sales s LEFT JOIN public.products p ON s.product_id = p.id WHERE p.producer_id = p_producer_id) sales_row;
    v_recent_transactions := (SELECT COALESCE(json_agg(slice), '[]'::json) FROM (SELECT * FROM json_array_elements(v_sales_history) LIMIT 3) slice);

    -- Monta a resposta final, agora incluindo o objeto `effectiveSettings`
    RETURN json_build_object(
        'kpis', json_build_object('valorLiquido', v_kpi_valor_liquido, 'vendasCount', v_kpi_vendas_count, 'reembolso', v_kpi_reembolso),
        'balances', json_build_object('disponivel', v_available_balance, 'pendente', v_pending_balance),
        'chartData', v_chart_data,
        'recentTransactions', v_recent_transactions,
        'salesHistory', v_sales_history,
        'effectiveSettings', v_effective_settings
    );
END;
$function$;