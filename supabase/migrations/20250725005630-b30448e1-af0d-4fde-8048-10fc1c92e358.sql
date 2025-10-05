-- Criar ou substituir a função calculate_producer_balances_simple com lógica correta
CREATE OR REPLACE FUNCTION public.calculate_producer_balances_simple(p_producer_id uuid)
RETURNS json AS $$
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
    FROM platform_settings s
    LEFT JOIN producer_settings ps ON ps.producer_id = p_producer_id
    LIMIT 1;

    -- Calcula o total líquido que já passou do prazo de liberação
    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO total_released_cents
    FROM sales
    WHERE product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
      AND status = 'paid' AND release_date <= CURRENT_DATE;

    -- Calcula o total líquido que ainda está aguardando o prazo
    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO pending_release_cents
    FROM sales
    WHERE product_id IN (SELECT id FROM products WHERE producer_id = p_producer_id)
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
$$ LANGUAGE plpgsql;