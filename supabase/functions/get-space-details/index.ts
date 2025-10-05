// supabase/functions/get-space-details/index.ts (VERSÃO COM PROGRESSO)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // Tentamos obter o usuário autenticado para incluir progresso, mas não obrigatório
    let currentUser = null;
    try {
      const token = req.headers.get('Authorization')?.replace('Bearer ', '');
      if (token) {
        const { data: { user } } = await serviceClient.auth.getUser(token);
        currentUser = user;
      }
    } catch (e) {
      // Ignoramos erros de autenticação, permitindo acesso público aos dados do curso
    }

    const { spaceId } = await req.json();
    if (!spaceId) throw new Error("ID do espaço é obrigatório.");

    const { data, error } = await serviceClient
      .from('spaces')
      .select(`
        id, name, slug, banner_image_url, background_color,
        space_containers (id, title, display_order, display_format,
          space_products (product_type, display_order,
            product:products (id, name, checkout_image_url)
          )
        ),
        principal_product:space_products!inner(
          product:products!inner (
            id, name,
            modules (id, title, display_order,
              lessons (id, title, display_order, content_type, content_text, content_url,
                lesson_progress (is_completed, completed_at)
              )
            )
          )
        )
      `)
      .eq('id', spaceId)
      .eq('principal_product.product_type', 'principal')
      .eq('principal_product.product.modules.lessons.lesson_progress.user_id', currentUser?.id || 'no-user')
      .order('display_order', { referencedTable: 'space_containers', ascending: true })
      .order('display_order', { referencedTable: 'space_containers.space_products', ascending: true })
      .order('display_order', { referencedTable: 'principal_product.product.modules', ascending: true })
      .order('display_order', { referencedTable: 'principal_product.product.modules.lessons', ascending: true })
      .single();

    if (error) throw error;
    
    // A query aninhada retorna uma estrutura complexa. Vamos simplificá-la.
    const responseData = {
      ...data,
      principal_product: data.principal_product[0]?.product,
      currentUserId: currentUser?.id || null
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})