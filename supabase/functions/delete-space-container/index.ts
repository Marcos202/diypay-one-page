// supabase/functions/delete-space-container/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { containerId } = await req.json();
    if (!containerId) throw new Error("containerId é obrigatório.");

    // Validação de propriedade
    const { data: ownerCheck } = await serviceClient
      .from('space_containers')
      .select('spaces!inner(producer_id)')
      .eq('id', containerId)
      .single();
    if (!ownerCheck || ownerCheck.spaces.producer_id !== user.id) throw new Error('Permissão negada.');
    
    // Deleta o container. A constraint ON DELETE CASCADE cuidará dos produtos dentro dele.
    const { error } = await serviceClient
      .from('space_containers')
      .delete()
      .eq('id', containerId);
    if (error) throw error;

    return new Response(JSON.stringify({ message: "Container excluído." }), {
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