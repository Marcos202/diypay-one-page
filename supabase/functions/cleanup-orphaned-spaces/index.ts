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
    if (!token) {
      throw new Error('Token de autorização não fornecido');
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Usuário não autorizado');
    }

    console.log('🧹 Iniciando limpeza de spaces órfãos...');

    // Buscar spaces que referenciam produtos inexistentes
    const { data: orphanedSpaces, error: spacesError } = await serviceClient
      .from('spaces')
      .select('id, name, product_id, banner_image_url')
      .not('product_id', 'is', null);

    if (spacesError) {
      console.error('Erro ao buscar spaces:', spacesError);
      throw new Error('Erro ao buscar spaces');
    }

    let orphanedCount = 0;
    let cleanedSpaces = [];

    if (orphanedSpaces && orphanedSpaces.length > 0) {
      for (const space of orphanedSpaces) {
        // Verificar se o produto ainda existe
        const { data: product, error: productError } = await serviceClient
          .from('products')
          .select('id')
          .eq('id', space.product_id)
          .single();

        if (productError || !product) {
          console.log(`📁 Space órfão encontrado: ${space.name} (produto ${space.product_id} não existe)`);
          
          // Deletar lesson_progress das aulas dos modules deste space
          const { error: progressError } = await serviceClient
            .from('lesson_progress')
            .delete()
            .in('lesson_id', 
              serviceClient
                .from('lessons')
                .select('id')
                .in('module_id',
                  serviceClient
                    .from('modules')
                    .select('id')
                    .eq('product_id', space.product_id)
                )
            );

          if (progressError) {
            console.error('Erro ao deletar lesson_progress:', progressError);
          }

          // Deletar lessons
          const { error: lessonsError } = await serviceClient
            .from('lessons')
            .delete()
            .in('module_id',
              serviceClient
                .from('modules')
                .select('id')
                .eq('product_id', space.product_id)
            );

          if (lessonsError) {
            console.error('Erro ao deletar lessons:', lessonsError);
          }

          // Deletar modules
          const { error: modulesError } = await serviceClient
            .from('modules')
            .delete()
            .eq('product_id', space.product_id);

          if (modulesError) {
            console.error('Erro ao deletar modules:', modulesError);
          }

          // Deletar space_products
          const { error: spaceProductsError } = await serviceClient
            .from('space_products')
            .delete()
            .eq('space_id', space.id);

          if (spaceProductsError) {
            console.error('Erro ao deletar space_products:', spaceProductsError);
          }

          // Deletar space_containers
          const { error: containersError } = await serviceClient
            .from('space_containers')
            .delete()
            .eq('space_id', space.id);

          if (containersError) {
            console.error('Erro ao deletar space_containers:', containersError);
          }

          // Deletar cohorts
          const { error: cohortsError } = await serviceClient
            .from('cohorts')
            .delete()
            .eq('space_id', space.id);

          if (cohortsError) {
            console.error('Erro ao deletar cohorts:', cohortsError);
          }

          // Deletar enrollments do produto órfão
          const { error: enrollmentsError } = await serviceClient
            .from('enrollments')
            .delete()
            .eq('product_id', space.product_id);

          if (enrollmentsError) {
            console.error('Erro ao deletar enrollments:', enrollmentsError);
          }

          // Remover imagem do banner se existir
          if (space.banner_image_url) {
            try {
              const bannerFileName = space.banner_image_url.split('/').pop();
              if (bannerFileName) {
                await serviceClient.storage
                  .from('uploads')
                  .remove([bannerFileName]);
                console.log(`🖼️ Banner removido: ${bannerFileName}`);
              }
            } catch (storageError) {
              console.error('Erro ao remover banner:', storageError);
            }
          }

          // Deletar o space
          const { error: spaceError } = await serviceClient
            .from('spaces')
            .delete()
            .eq('id', space.id);

          if (spaceError) {
            console.error('Erro ao deletar space:', spaceError);
          } else {
            console.log(`✅ Space órfão removido: ${space.name}`);
            orphanedCount++;
            cleanedSpaces.push({
              id: space.id,
              name: space.name,
              product_id: space.product_id
            });
          }
        }
      }
    }

    console.log(`🎯 Limpeza concluída! ${orphanedCount} spaces órfãos removidos.`);

    return new Response(JSON.stringify({ 
      message: `Limpeza concluída com sucesso! ${orphanedCount} spaces órfãos removidos.`,
      cleaned_count: orphanedCount,
      cleaned_spaces: cleanedSpaces
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});