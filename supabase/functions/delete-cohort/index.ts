import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { cohort_id } = await req.json();
    if (!cohort_id) {
      throw new Error('O ID da turma (cohort_id) é obrigatório.');
    }

    const { data: cohort, error: fetchError } = await serviceClient
      .from('cohorts')
      .select('is_active')
      .eq('id', cohort_id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (cohort.is_active) {
      return new Response(JSON.stringify({ 
        error: 'Não é possível excluir uma turma ativa. Defina outra turma como ativa primeiro.' 
      }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: deleteError } = await serviceClient
      .from('cohorts')
      .delete()
      .eq('id', cohort_id);
    
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Turma excluída com sucesso!' }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});