-- Corrigir funções com search_path para segurança
CREATE OR REPLACE FUNCTION public.set_active_cohort_for_space(p_space_id UUID, p_cohort_id_to_activate UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;