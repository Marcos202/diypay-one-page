import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use o Anon Key para acesso público e seguro
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { slug } = await req.json();
    if (!slug) throw new Error('Slug is required');

    const { data, error } = await supabaseClient
      .from('pages')
      .select('title, content, featured_image_url')
      .eq('slug', slug)
      .eq('status', 'published') // A regra de segurança crucial
      .single();

    if (error) {
      // Se não encontrar a página, retorna um erro 404
      throw new Error('Page not found');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const status = error.message === 'Page not found' ? 404 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});