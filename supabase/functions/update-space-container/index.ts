// supabase/functions/update-space-container/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { containerId, title } = await req.json();
    if (!containerId || !title) throw new Error("containerId e title são obrigatórios.");

    // Validação de propriedade (complexa, mas segura)
    const { data: ownerCheck } = await serviceClient
      .from('space_containers')
      .select('spaces!inner(producer_id)')
      .eq('id', containerId)
      .single();
    if (!ownerCheck || ownerCheck.spaces.producer_id !== user.id) throw new Error('Permissão negada.');

    const { data, error } = await serviceClient
      .from('space_containers')
      .update({ title })
      .eq('id', containerId)
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})