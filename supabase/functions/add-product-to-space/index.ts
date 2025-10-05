import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Autenticar o usuário
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { spaceId, productId, productType, containerId } = await req.json();
    if (!spaceId || !productId || !productType || !containerId) {
      throw new Error("spaceId, productId, productType e containerId são obrigatórios.");
    }

    // 2. Validar se o usuário é o dono do Space
    const { data: spaceOwner, error: ownerError } = await serviceClient
      .from('spaces')
      .select('producer_id')
      .eq('id', spaceId)
      .single();

    if (ownerError || !spaceOwner || spaceOwner.producer_id !== user.id) {
      throw new Error('Você não tem permissão para adicionar produtos a esta Área de Membros.');
    }

    // 3. Lógica de Negócio para o produto "principal"
    if (productType === 'principal') {
      const { data: existingPrincipal, error: principalCheckError } = await serviceClient
        .from('space_products')
        .select('id')
        .eq('space_id', spaceId)
        .eq('product_type', 'principal')
        .maybeSingle();

      if (principalCheckError) throw principalCheckError;
      if (existingPrincipal) {
        throw new Error('Esta Área de Membros já possui um produto principal definido.');
      }
    }

    // 4. Inserir o produto se todas as validações passarem
    const { data, error } = await serviceClient
      .from('space_products')
      .insert({
        space_id: spaceId,
        product_id: productId,
        product_type: productType,
        container_id: containerId,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Usar 400 para erros de validação ou lógica
    });
  }
})