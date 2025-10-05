// Conteúdo completo para supabase/functions/delete-product/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Helper robusto para extrair o caminho do arquivo a partir de uma URL pública do Supabase Storage
const getPathFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    // A URL pública tem o formato: .../storage/v1/object/public/bucket-name/file-path.ext
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/public/');
    if (pathParts.length > 1) {
      // Retorna "bucket-name/file-path.ext"
      return pathParts[1];
    }
    return null;
  } catch (error) {
    console.error('URL inválida para extração de caminho:', url, error);
    return null;
  }
};

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

    const { productId } = await req.json();
    if (!productId) throw new Error('productId é obrigatório');

    // 1. Verificar permissão e buscar as URLs das imagens
    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('producer_id, cover_image_url, checkout_image_url')
      .eq('id', productId)
      .eq('producer_id', user.id)
      .single();

    if (productError || !product) {
      throw new Error('Produto não encontrado ou você não tem permissão para excluí-lo');
    }

    console.log(`🗑️ Iniciando exclusão do produto: ${productId}`);

    // 2. Coletar e remover TODOS os arquivos do Storage
    const fullPaths = [
      getPathFromUrl(product.cover_image_url),
      getPathFromUrl(product.checkout_image_url),
    ].filter(Boolean) as string[]; // Filtra nulos e garante que é uma string[]

    let imagesDeletedCount = 0;
    if (fullPaths.length > 0) {
        // O path extraído já contém o nome do bucket
        // Ex: "product-covers/f84a7ec1-0ff4.../1755646466482.jpg"
        const filesByBucket: { [key: string]: string[] } = {};

        fullPaths.forEach(fullPath => {
            const [bucket, ...filePathParts] = fullPath.split('/');
            const path = filePathParts.join('/');
            if (!filesByBucket[bucket]) {
                filesByBucket[bucket] = [];
            }
            filesByBucket[bucket].push(path);
        });

        for (const bucket in filesByBucket) {
            const { error: storageError } = await serviceClient.storage
                .from(bucket)
                .remove(filesByBucket[bucket]);

            if (storageError) {
                console.warn(`⚠️ Erro ao remover arquivos do bucket '${bucket}':`, storageError.message);
            } else {
                console.log(`🖼️ Arquivos removidos do bucket '${bucket}':`, filesByBucket[bucket]);
                imagesDeletedCount += filesByBucket[bucket].length;
            }
        }
    }

    // 3. Deletar o registro do produto no banco. A CASCATA cuidará de TUDO (incluindo o 'space').
    const { error: deleteError } = await serviceClient
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      throw new Error(`Falha ao deletar o produto no banco: ${deleteError.message}`);
    }

    console.log('✅ Produto e dados associados (incluindo space) excluídos com sucesso via cascata.');

    return new Response(JSON.stringify({
      message: 'Produto excluído completamente com sucesso',
      deleted_images: imagesDeletedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erro na exclusão do produto:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});