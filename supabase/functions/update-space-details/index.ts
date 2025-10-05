import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { spaceId, name, slug, banner_image_url, background_color } = await req.json();
    if (!spaceId) {
      throw new Error("O ID do Space é obrigatório.");
    }

    // Constrói o objeto de atualização apenas com os campos fornecidos
    const updateData: { [key: string]: any } = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (typeof banner_image_url !== 'undefined') updateData.banner_image_url = banner_image_url;
    if (typeof background_color !== 'undefined') updateData.background_color = background_color;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error("Nenhum dado para atualizar foi fornecido.");
    }

    const { data, error } = await serviceClient
      .from('spaces')
      .update(updateData)
      .eq('id', spaceId)
      .eq('producer_id', user.id) // Garante que o usuário só pode editar seus próprios spaces
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error("Área de Membros não encontrada ou você não tem permissão para editá-la.");
      }
      throw error;
    }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})