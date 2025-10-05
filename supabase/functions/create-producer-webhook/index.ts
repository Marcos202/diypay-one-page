// supabase/functions/create-producer-webhook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autorizado');

    const { name, url, event_types, product_id } = await req.json();

    if (!name || !url || !event_types || event_types.length === 0) {
      throw new Error('Campos obrigatórios ausentes');
    }

    const { data, error } = await serviceClient
      .from('webhook_endpoints')
      .insert({
        producer_id: user.id,
        name,
        url,
        event_types,
        product_id: product_id || null, // Garante que seja salvo como NULL se não for fornecido
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
      status: 500,
    });
  }
});