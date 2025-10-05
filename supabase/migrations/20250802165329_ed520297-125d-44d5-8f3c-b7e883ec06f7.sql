-- Cria a função para reordenar Módulos ou Aulas
CREATE OR REPLACE FUNCTION public.update_display_order(
  table_name TEXT,
  items JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;