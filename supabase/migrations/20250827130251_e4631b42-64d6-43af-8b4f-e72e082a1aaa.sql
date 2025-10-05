-- Fix the last remaining function search path security warning
-- Update calculate_producer_balances_simple and get_students_with_progress functions

CREATE OR REPLACE FUNCTION public.calculate_producer_balances_simple(p_producer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_total_released_cents bigint;
    v_pending_release_cents bigint;
    v_security_reserve_config_percent numeric;
    v_security_reserve_cents bigint;
    v_available_balance bigint;
    v_pending_balance bigint;
BEGIN
    SELECT COALESCE(ps.custom_security_reserve_percent, s.default_security_reserve_percent, 0)
    INTO v_security_reserve_config_percent
    FROM public.platform_settings s
    LEFT JOIN public.producer_settings ps ON ps.producer_id = p_producer_id
    LIMIT 1;

    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO v_total_released_cents
    FROM public.sales
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND status = 'paid' AND release_date <= CURRENT_DATE;

    SELECT COALESCE(SUM(producer_share_cents), 0)
    INTO v_pending_release_cents
    FROM public.sales
    WHERE product_id IN (SELECT id FROM public.products WHERE producer_id = p_producer_id)
      AND status = 'paid' AND release_date > CURRENT_DATE;

    v_security_reserve_cents := FLOOR(v_total_released_cents * (v_security_reserve_config_percent / 100.0));
    v_available_balance := v_total_released_cents - v_security_reserve_cents;
    v_pending_balance := v_pending_release_cents + v_security_reserve_cents;

    RETURN json_build_object(
        'available_balance', v_available_balance,
        'pending_balance', v_pending_balance
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_students_with_progress(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_lessons_count INT;
BEGIN
  -- 1. Contar o total de aulas do produto
  SELECT COUNT(*)
  INTO total_lessons_count
  FROM public.lessons l
  JOIN public.modules m ON l.module_id = m.id
  WHERE m.product_id = p_product_id;

  -- 2. Buscar alunos, suas matrículas e progresso em uma única query
  RETURN (
    SELECT jsonb_agg(student_data)
    FROM (
      SELECT
        p.id,
        p.full_name AS name,
        p.email,
        e.enrolled_at,
        (
          SELECT COUNT(*)
          FROM public.lesson_progress lp
          WHERE lp.user_id = e.user_id
            AND lp.is_completed = true
            AND lp.lesson_id IN (
              SELECT l.id
              FROM public.lessons l
              JOIN public.modules m ON l.module_id = m.id
              WHERE m.product_id = p_product_id
            )
        ) AS completed_lessons,
        total_lessons_count AS total_lessons,
        CASE
          WHEN total_lessons_count > 0 THEN
            ROUND(
              (
                (
                  SELECT COUNT(*)
                  FROM public.lesson_progress lp
                  WHERE lp.user_id = e.user_id
                    AND lp.is_completed = true
                    AND lp.lesson_id IN (
                      SELECT l.id
                      FROM public.lessons l
                      JOIN public.modules m ON l.module_id = m.id
                      WHERE m.product_id = p_product_id
                    )
                )::DECIMAL / total_lessons_count
              ) * 100
            )
          ELSE 0
        END AS progress
      FROM public.enrollments e
      JOIN public.profiles p ON e.user_id = p.id
      WHERE e.product_id = p_product_id
    ) AS student_data
  );
END;
$function$;