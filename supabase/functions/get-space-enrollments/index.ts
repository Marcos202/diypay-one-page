// supabase/functions/get-space-enrollments/index.ts

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
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await serviceClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');

    const { productId } = await req.json();
    if (!productId) throw new Error("ID do produto é obrigatório.");

    // Chama a nossa nova função especialista (RPC) no banco de dados
    const { data, error } = await serviceClient.rpc('get_students_with_progress', {
      p_product_id: productId
    });

    if (error) throw error;

    return new Response(JSON.stringify(data || []), { // Retorna um array vazio se não houver dados
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
