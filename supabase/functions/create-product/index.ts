// Conteúdo completo e corrigido para supabase/functions/create-product/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Token de autorização não fornecido');

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autorizado');

    const requestBody = await req.json();
    const { delivery_type, checkout_link_slug, ...productData } = requestBody;

    // Validações básicas
    if (!productData.name || typeof productData.name !== 'string') {
      throw new Error('Nome do produto é obrigatório');
    }
    if (typeof productData.price_cents !== 'number' || productData.price_cents < 0) {
      throw new Error('Preço deve ser um número válido e não negativo');
    }

    const insertData = {
      name: productData.name.trim(),
      description: productData.description || null,
      cover_image_url: productData.cover_image_url || null,
      price_cents: productData.price_cents,
      file_url_or_access_info: productData.file_url_or_access_info || null,
      max_installments_allowed: productData.max_installments_allowed || 1,
      is_active: productData.is_active ?? true,
      product_type: productData.product_type || 'single_payment',
      subscription_frequency: productData.subscription_frequency || null,
      allowed_payment_methods: productData.allowed_payment_methods || ['credit_card', 'pix', 'bank_slip'],
      show_order_summary: productData.show_order_summary ?? true,
      donation_title: productData.donation_title || null,
      donation_description: productData.donation_description || null,
      checkout_image_url: productData.checkout_image_url || null,
      checkout_background_color: productData.checkout_background_color || '#F3F4F6',
      is_email_optional: productData.is_email_optional ?? false,
      require_email_confirmation: productData.require_email_confirmation ?? true,
      producer_assumes_installments: productData.producer_assumes_installments ?? false,
      producer_id: user.id,
      checkout_link_slug: checkout_link_slug || `product-${Date.now()}`,
      delivery_type: delivery_type || 'external_access'
    };

    // 1. Criar o Produto
    const { data: newProduct, error: productError } = await serviceClient
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (productError) {
      console.error('Erro ao criar produto:', productError);
      throw new Error(`Erro ao criar produto: ${productError.message}`);
    }

    // Se o delivery_type for 'members_area', criar a estrutura do espaço
    if (delivery_type === 'members_area') {
      try {
        // ### CORREÇÃO APLICADA AQUI ###
        // Adicionamos 'product_id: newProduct.id' para ligar o space ao produto.
        const { data: newSpace, error: spaceError } = await serviceClient
          .from('spaces')
          .insert({ 
            producer_id: user.id, 
            name: newProduct.name, 
            slug: newProduct.checkout_link_slug,
            product_id: newProduct.id // A LIGAÇÃO QUE FALTAVA
          })
          .select('id')
          .single();

        if (spaceError) throw spaceError;

        // O resto da criação da estrutura...
        const { data: newContainer, error: containerError } = await serviceClient.from('space_containers').insert({ space_id: newSpace.id, title: 'Sejam bem-vindos', display_order: 0 }).select('id').single();
        if (containerError) throw containerError;
        const { error: spError } = await serviceClient.from('space_products').insert({ space_id: newSpace.id, product_id: newProduct.id, product_type: 'principal', container_id: newContainer.id });
        if (spError) throw spError;
        const { data: newCohort, error: cohortError } = await serviceClient.from('cohorts').insert({ space_id: newSpace.id, name: 'Turma 01', is_active: true }).select('id').single();
        if (cohortError) throw cohortError;
        const { data: newModule, error: moduleError } = await serviceClient.from('modules').insert({ product_id: newProduct.id, title: 'Bem-vindo', display_order: 0 }).select('id').single();
        if (moduleError) throw moduleError;
        const { error: lessonError } = await serviceClient.from('lessons').insert({ module_id: newModule.id, title: 'Aula demonstração', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5mGuCdlCcNM', display_order: 0 });
        if (lessonError) throw lessonError;
        const { error: enrollmentError } = await serviceClient.from('enrollments').insert({ user_id: user.id, product_id: newProduct.id, cohort_id: newCohort.id });
        if (enrollmentError) console.error(`Falha ao auto-matricular produtor: ${enrollmentError.message}`);

      } catch (membersAreaError) {
        // Se a criação da área de membros falhar, desfaz a criação do produto para não deixar lixo.
        console.error('Erro ao criar estrutura de members_area. Revertendo criação do produto...', membersAreaError);
        await serviceClient.from('products').delete().eq('id', newProduct.id);
        // Lança o erro original para o frontend saber o que aconteceu.
        throw membersAreaError;
      }
    }
    
    return new Response(JSON.stringify(newProduct), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
