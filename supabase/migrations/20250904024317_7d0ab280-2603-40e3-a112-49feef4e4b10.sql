-- Cria a função RPC para buscar todos os dados da área de membros de forma robusta.
-- Esta função substitui a lógica da Edge Function 'get-members-hub-data'.

CREATE OR REPLACE FUNCTION public.get_space_hub_details(
  space_id_input uuid
)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT
    json_build_object(
      'name', s.name,
      'banner_image_url', s.banner_image_url,
      'background_color', s.background_color,
      'space_containers', (
        SELECT
          json_agg(
            json_build_object(
              'id', sc.id,
              'title', sc.title,
              'display_format', sc.display_format,
              'space_products', (
                SELECT
                  json_agg(
                    json_build_object(
                      'product', json_build_object(
                        'id', p.id,
                        'name', p.name,
                        'cover_image_url', p.cover_image_url,
                        'vertical_cover_image_url', p.vertical_cover_image_url
                      )
                    )
                  )
                FROM public.space_products sp
                JOIN public.products p ON sp.product_id = p.id
                WHERE sp.container_id = sc.id
              )
            ) ORDER BY sc.display_order ASC
          )
        FROM public.space_containers sc
        WHERE sc.space_id = s.id
      )
    )
  FROM public.spaces s
  WHERE s.id = space_id_input;
$$;