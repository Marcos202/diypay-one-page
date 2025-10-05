// supabase/functions/create-space-container/index.ts
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

    const { spaceId, title } = await req.json();
    if (!spaceId || !title) {
      throw new Error("spaceId e title são obrigatórios.");
    }

    // Valida se o usuário é o dono do Space
    const { data: spaceOwner } = await serviceClient.from('spaces').select('producer_id').eq('id', spaceId).single();
    if (!spaceOwner || spaceOwner.producer_id !== user.id) {
      throw new Error('Permissão negada.');
    }

    // Calcula a ordem do novo container
    const { count, error: countError } = await serviceClient.from('space_containers').select('*', { count: 'exact', head: true }).eq('space_id', spaceId);
    if (countError) throw countError;
    
    const displayOrder = count || 0;

    const { data, error } = await serviceClient
      .from('space_containers')
      .insert({ space_id: spaceId, title: title, display_order: displayOrder })
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
      status: 400,
    });
  }
})