// supabase/functions/create-lesson/index.ts

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

    // --- CORREÇÃO AQUI: Lendo apenas os dados que o frontend realmente envia ---
    const lessonData = await req.json();
    const { 
      moduleId, 
      title, 
      content_type, 
      content_url, 
      content_text, 
      release_type, 
      release_days, 
      release_date
      // O campo "is_free_sample" foi removido daqui
    } = lessonData;

    if (!moduleId || !title || !content_type) {
      throw new Error("moduleId, title, e content_type são obrigatórios.");
    }

    const { data, error } = await serviceClient
      .from('lessons')
      .insert({ 
        module_id: moduleId, 
        title: title,
        content_type: content_type,
        content_url: content_url || null,
        content_text: content_text || null,
        release_type: release_type || 'immediate',
        release_days: release_days || null,
        release_date: release_date || null,
        // O campo "is_free_sample" foi removido daqui também.
        // O banco de dados usará o valor padrão (false).
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    console.error('ERRO DETALHADO EM CREATE-LESSON:', error) // Log para depuração
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
