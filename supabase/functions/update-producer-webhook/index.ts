// supabase/functions/update-producer-webhook/index.ts

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

    const { id, name, url, event_types, product_id } = await req.json();

    if (!id || !name || !url || !event_types || event_types.length === 0) {
      throw new Error('Campos obrigatórios ausentes');
    }

    const { data, error } = await serviceClient
      .from('webhook_endpoints')
      .update({
        name,
        url,
        event_types,
        product_id: product_id || null, // Garante que seja salvo como NULL se não for fornecido
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('producer_id', user.id) // Garante que o produtor só possa atualizar seus próprios webhooks
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Webhook não encontrado ou não autorizado');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});