// Conteúdo completo e corrigido para supabase/functions/get-my-courses/index.ts

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
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Busca enrollments com produtos e seus respectivos spaces, ordenados por data de inscrição mais recente
    const { data, error } = await serviceClient
      .from('enrollments')
      .select(`
        product:products (
          id,
          name,
          cover_image_url,
          producer:profiles (full_name)
        )
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    
    // Para cada curso, busca o space_id correspondente
    const coursesWithSpaces = await Promise.all(
      data.map(async (enrollment) => {
        if (!enrollment.product) {
          return null;
        }

        // Busca o space_id para este produto
        const { data: spaceProduct } = await serviceClient
          .from('space_products')
          .select('space_id')
          .eq('product_id', enrollment.product.id)
          .single();

        const producerName = enrollment.product.producer 
          ? (enrollment.product.producer as { full_name: string }).full_name 
          : 'Produtor não encontrado';

        return {
          ...enrollment.product,
          producer_name: producerName,
          space_id: spaceProduct?.space_id || null,
        };
      })
    );

    const courses = coursesWithSpaces.filter(course => course !== null);

    return new Response(JSON.stringify(courses), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Retornar 500 para erros internos do servidor
    });
  }
})
