// supabase/functions/get-members-hub-data/index.ts
// Esta é a versão completa e final do arquivo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Trata a requisição preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { space_id } = await req.json();
    if (!space_id) {
      throw new Error('O ID da área de membros (space_id) é obrigatório.');
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Esta query única e aninhada segue o padrão de sucesso da função `get-producer-spaces`.
    // Ela busca todos os dados necessários de uma só vez, de forma eficiente.
    const { data: spaceData, error } = await serviceClient
      .from('spaces')
      .select(`
        name,
        banner_image_url,
        background_color,
        space_containers (
          id,
          title,
          display_order,
          display_format,
          space_products (
            display_order,
            product:products (
              id,
              name,
              cover_image_url,
              vertical_cover_image_url 
            )
          )
        )
      `)
      .eq('id', space_id)
      .order('display_order', { referencedTable: 'space_containers', ascending: true })
      .order('display_order', { referencedTable: 'space_containers.space_products', ascending: true })
      .single();

    if (error) {
      console.error('Erro na query do Supabase:', error);
      throw error;
    }
    if (!spaceData) {
      throw new Error('Área de membros não encontrada.');
    }
    
    // A estrutura da resposta já vem corretamente aninhada do Supabase.
    const responseData = {
      name: spaceData.name,
      banner_image_url: spaceData.banner_image_url,
      background_color: spaceData.background_color,
      space_containers: spaceData.space_containers || [], // Garante que seja sempre um array
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
