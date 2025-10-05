import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autenticar o produtor para obter seu ID
    const authHeader = req.headers.get('Authorization')!
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.");

    // 2. Extrair dados do corpo da requisição
    const { name, slug } = await req.json();
    if (!name || !slug) throw new Error("Nome e slug são obrigatórios.");

    // 3. Usar o cliente de serviço para criar o space
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newSpace, error } = await serviceClient
      .from('spaces')
      .insert({
        producer_id: user.id,
        name: name,
        slug: slug,
      })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(newSpace), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})