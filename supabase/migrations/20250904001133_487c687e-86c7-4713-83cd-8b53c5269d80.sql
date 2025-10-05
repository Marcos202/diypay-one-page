-- Fix security warning: Set search_path for the function to prevent search path hijacking

CREATE OR REPLACE FUNCTION public.update_container_format(
  container_id_input uuid,
  new_format TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_owner_id uuid;
BEGIN
  -- 1. Encontra o ID do dono da Área de Membros (space) à qual o container pertence.
  SELECT s.user_id INTO space_owner_id
  FROM public.space_containers sc
  JOIN public.spaces s ON sc.space_id = s.id
  WHERE sc.id = container_id_input;

  -- 2. Verifica se o usuário autenticado (auth.uid()) é o dono.
  IF space_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso não autorizado: O usuário não é o proprietário desta área de membros.';
  END IF;

  -- 3. Se a verificação passar, atualiza a tabela.
  UPDATE public.space_containers
  SET display_format = new_format
  WHERE id = container_id_input;
END;
$$;