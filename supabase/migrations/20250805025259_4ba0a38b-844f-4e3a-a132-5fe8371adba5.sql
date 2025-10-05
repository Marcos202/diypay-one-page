-- Fix search path security issue for get_students_with_progress function
CREATE OR REPLACE FUNCTION public.get_students_with_progress(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;