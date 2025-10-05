import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { lesson_id, product_id, is_completed } = await req.json();
    if (!lesson_id || !product_id || typeof is_completed !== 'boolean') {
      throw new Error('lesson_id, product_id e is_completed são obrigatórios.');
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Usuário não autenticado.');

    // Verifica se o usuário está matriculado no produto
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (enrollmentError || !enrollment) throw new Error('Matrícula não encontrada.');

    // Usa 'upsert' para criar ou atualizar o registro de progresso
    const { error: upsertError } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lesson_id,
        is_completed: is_completed,
        completed_at: is_completed ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id, lesson_id'
      });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true }), {
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