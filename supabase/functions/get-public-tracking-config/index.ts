import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Tracking Debug] 🌐 Edge Function get-public-tracking-config ACIONADA');
    
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    
    console.log('[Tracking Debug] Product ID recebido:', productId);

    if (!productId) {
      console.log('[Tracking Debug] ❌ productId ausente na requisição');
      return new Response(
        JSON.stringify({ error: 'productId é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Usar Anon Key para acesso público
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('[Tracking Debug] 🔍 Buscando no DB para product_id:', productId);
    
    // Buscar configuração de tracking do produto
    const { data: trackingConfig, error } = await supabaseClient
      .from('producer_tracking')
      .select('meta_pixel_id, tiktok_pixel_id, google_ads_conversion_id, google_ads_conversion_label, is_active, tracking_enabled_pages')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    console.log('[Tracking Debug] 📊 Resultado da query:', { 
      found: !!trackingConfig, 
      error: error?.message,
      data: trackingConfig 
    });

    if (error) {
      console.log(`[Tracking Debug] ⚠️ Nenhuma config encontrada (${error.code}). Retornando objeto vazio estruturado.`);
      // Retornar estrutura consistente mesmo quando não há configuração
      return new Response(
        JSON.stringify({ 
          is_active: false, 
          tracking_enabled_pages: [],
          meta_pixel_id: null,
          tiktok_pixel_id: null,
          google_ads_conversion_id: null,
          google_ads_conversion_label: null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Retornar apenas campos públicos (NUNCA os tokens de API)
    const response = {
      meta_pixel_id: trackingConfig.meta_pixel_id,
      tiktok_pixel_id: trackingConfig.tiktok_pixel_id,
      google_ads_conversion_id: trackingConfig.google_ads_conversion_id,
      google_ads_conversion_label: trackingConfig.google_ads_conversion_label,
      is_active: trackingConfig.is_active,
      tracking_enabled_pages: trackingConfig.tracking_enabled_pages || []
    };
    
    console.log('[Tracking Debug] ✅ Retornando config PÚBLICA:', response);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Tracking Debug] ❌ ERRO FATAL na Edge Function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
