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

    const { spaceId } = await req.json();
    if (!spaceId) throw new Error("ID do espaço é obrigatório.");

    const { data, error } = await serviceClient
      .from('cohorts')
      .select('id, name, is_active, enrollments(count)')
      .eq('space_id', spaceId)
      .order('created_at');

    if (error) throw error;
    
    const formattedData = data.map(cohort => ({
      id: cohort.id,
      name: cohort.name,
      is_active: cohort.is_active,
      enrollments_count: cohort.enrollments?.count || 0
    }));

    return new Response(JSON.stringify(formattedData), {
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