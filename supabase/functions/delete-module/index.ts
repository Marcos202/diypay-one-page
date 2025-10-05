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
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { moduleId } = await req.json();
    if (!moduleId) {
      throw new Error("moduleId é obrigatório.");
    }

    // Primeiro, deletar todas as aulas do módulo
    const { error: lessonsError } = await serviceClient
      .from('lessons')
      .delete()
      .eq('module_id', moduleId);

    if (lessonsError) throw lessonsError;

    // Depois, deletar o módulo
    const { error: moduleError } = await serviceClient
      .from('modules')
      .delete()
      .eq('id', moduleId);

    if (moduleError) throw moduleError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro em delete-module:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})