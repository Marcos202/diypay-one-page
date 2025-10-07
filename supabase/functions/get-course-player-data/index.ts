// supabase/functions/get-course-player-data/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { product_id } = await req.json()
    if (!product_id) throw new Error('product_id é obrigatório.')

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Usuário não autenticado.');

    const { data: courseData, error: courseError } = await serviceClient
      .from('products')
      .select(`
        id,
        name,
        description,
        modules (
          id,
          title,
          display_order,
          lessons (
            id,
            title,
            content_type,
            content_url,
            content_text,
            display_order
          )
        )
      `)
      .eq('id', product_id)
      .order('display_order', { referencedTable: 'modules', ascending: true })
      .order('display_order', { referencedTable: 'modules.lessons', ascending: true })
      .single();

    if (courseError) throw courseError;
    if (!courseData) throw new Error('Curso não encontrado.');

    const { data: progressData, error: progressError } = await serviceClient
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .in('lesson_id', courseData.modules.flatMap(m => m.lessons.map(l => l.id)))
      .eq('user_id', user.id);

    if (progressError) throw progressError;

    const progressMap = new Map(progressData.map(p => [p.lesson_id, p.is_completed]));

    const courseWithProgress = {
      ...courseData,
      modules: courseData.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          is_completed: progressMap.get(lesson.id) || false
        }))
      }))
    };

    return new Response(JSON.stringify(courseWithProgress), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
