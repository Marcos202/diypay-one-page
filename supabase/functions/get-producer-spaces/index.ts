import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const authHeader = req.headers.get('Authorization')!
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.");

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ETAPA 1: Buscar espaços (áreas de membros)
    const { data: spacesData, error: spacesError } = await serviceClient
      .from('spaces')
      .select(`
        id, 
        name, 
        slug, 
        created_at, 
        space_products(
          products(cover_image_url)
        )
      `)
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (spacesError) throw spacesError;

    // ETAPA 2: Buscar produtos com delivery_type = 'external_access'
    const { data: externalProductsData, error: externalProductsError } = await serviceClient
      .from('products')
      .select('id, name, cover_image_url, created_at')
      .eq('producer_id', user.id)
      .eq('delivery_type', 'external_access')
      .order('created_at', { ascending: false });

    if (externalProductsError) throw externalProductsError;

    // ETAPA 3: Formatação dos espaços
    const formattedSpaces = spacesData.map(space => {
      const firstProductWithImage = space.space_products?.find(
        sp => sp.products?.cover_image_url
      );
      
      return {
        id: space.id,
        name: space.name,
        slug: space.slug,
        created_at: space.created_at,
        cover_image_url: firstProductWithImage?.products?.cover_image_url || null,
        type: 'members_area'
      };
    });

    // ETAPA 4: Formatação dos produtos de acesso externo
    const formattedExternalProducts = externalProductsData.map(product => ({
      id: product.id,
      name: product.name,
      slug: null,
      created_at: product.created_at,
      cover_image_url: product.cover_image_url,
      type: 'external_access'
    }));

    // ETAPA 5: Combinar e ordenar por data de criação
    const combinedData = [...formattedSpaces, ...formattedExternalProducts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify(combinedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})