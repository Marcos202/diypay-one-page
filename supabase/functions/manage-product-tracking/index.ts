import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface TrackingConfig {
  meta_pixel_id?: string;
  meta_test_event_code?: string;
  tiktok_pixel_id?: string;
  tiktok_test_event_code?: string;
  google_ads_conversion_id?: string;
  google_ads_conversion_label?: string;
  is_active?: boolean;
  tracking_enabled_pages?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Inicializar Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[manage-product-tracking] Missing authorization header');
      throw new Error('Missing authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[manage-product-tracking] Unauthorized:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`[manage-product-tracking] User authenticated: ${user.id}`);

    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    
    if (!productId) {
      console.error('[manage-product-tracking] Missing productId parameter');
      throw new Error('productId é obrigatório');
    }

    console.log(`[manage-product-tracking] Processing ${req.method} for product: ${productId}`);

    // 3. Verificar se o usuário é dono do produto
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('producer_id')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.error('[manage-product-tracking] Error fetching product:', productError);
      throw new Error('Erro ao buscar produto');
    }

    if (!product) {
      console.error('[manage-product-tracking] Product not found:', productId);
      throw new Error('Produto não encontrado');
    }

    if (product.producer_id !== user.id) {
      console.error('[manage-product-tracking] User does not own product');
      throw new Error('Você não tem permissão para gerenciar este produto');
    }

    console.log('[manage-product-tracking] Product ownership verified');

    // 4. Processar requisição baseado no método
    switch (req.method) {
      case 'GET': {
        console.log('[manage-product-tracking] Fetching tracking config');
        
        const { data, error } = await supabaseClient
          .from('producer_tracking')
          .select('*')
          .eq('product_id', productId)
          .maybeSingle();

        if (error) {
          console.error('[manage-product-tracking] Error fetching config:', error);
          throw error;
        }

        console.log('[manage-product-tracking] Config fetched successfully:', data ? 'exists' : 'empty');

        return new Response(JSON.stringify(data || {}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST':
      case 'PUT': {
        const payload: TrackingConfig = await req.json();
        console.log('[manage-product-tracking] Saving config:', JSON.stringify(payload, null, 2));

        // Sanitizar e validar inputs
        const sanitizedData = {
          producer_id: user.id,
          product_id: productId,
          meta_pixel_id: payload.meta_pixel_id?.trim() || null,
          meta_test_event_code: payload.meta_test_event_code?.trim() || null,
          tiktok_pixel_id: payload.tiktok_pixel_id?.trim() || null,
          tiktok_test_event_code: payload.tiktok_test_event_code?.trim() || null,
          google_ads_conversion_id: payload.google_ads_conversion_id?.trim() || null,
          google_ads_conversion_label: payload.google_ads_conversion_label?.trim() || null,
          is_active: payload.is_active ?? true,
          tracking_enabled_pages: payload.tracking_enabled_pages || ['product_page', 'checkout', 'thank_you'],
        };

        // Validar formato Meta Pixel (15-16 dígitos)
        if (sanitizedData.meta_pixel_id && !/^\d{15,16}$/.test(sanitizedData.meta_pixel_id)) {
          console.error('[manage-product-tracking] Invalid Meta Pixel ID format');
          throw new Error('Meta Pixel ID inválido. Deve conter 15-16 dígitos numéricos.');
        }

        // Validar formato TikTok Pixel (alfanumérico)
        if (sanitizedData.tiktok_pixel_id && !/^[A-Z0-9]{10,20}$/.test(sanitizedData.tiktok_pixel_id)) {
          console.error('[manage-product-tracking] Invalid TikTok Pixel ID format');
          throw new Error('TikTok Pixel ID inválido. Deve ser alfanumérico (ex: C12345ABCDEFG).');
        }

        // Validar formato Google Ads (AW-XXXXXXXXXX)
        if (sanitizedData.google_ads_conversion_id && !/^AW-\d{9,11}$/.test(sanitizedData.google_ads_conversion_id)) {
          console.error('[manage-product-tracking] Invalid Google Ads Conversion ID format');
          throw new Error('Google Ads Conversion ID inválido. Formato esperado: AW-XXXXXXXXXX');
        }

        console.log('[manage-product-tracking] Validation passed, performing upsert');

        // Upsert (insert ou update)
        const { data, error } = await supabaseClient
          .from('producer_tracking')
          .upsert(sanitizedData, { onConflict: 'product_id' })
          .select()
          .single();

        if (error) {
          console.error('[manage-product-tracking] Error upserting config:', error);
          throw error;
        }

        console.log('[manage-product-tracking] Config saved successfully');

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'DELETE': {
        console.log('[manage-product-tracking] Deleting tracking config');
        
        const { error } = await supabaseClient
          .from('producer_tracking')
          .delete()
          .eq('product_id', productId)
          .eq('producer_id', user.id);

        if (error) {
          console.error('[manage-product-tracking] Error deleting config:', error);
          throw error;
        }

        console.log('[manage-product-tracking] Config deleted successfully');

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        console.error('[manage-product-tracking] Unsupported method:', req.method);
        throw new Error('Método não suportado');
    }
  } catch (error: any) {
    console.error('[manage-product-tracking] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
