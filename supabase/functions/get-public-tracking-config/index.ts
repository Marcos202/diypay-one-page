import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
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

    // Buscar configuração de tracking do produto
    const { data: trackingConfig, error } = await supabaseClient
      .from('producer_tracking')
      .select('meta_pixel_id, tiktok_pixel_id, google_ads_conversion_id, google_ads_conversion_label, is_active, tracking_enabled_pages')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.log(`[get-public-tracking-config] Nenhuma configuração encontrada para produto ${productId}`);
      // Retornar objeto vazio se não houver configuração
      return new Response(
        JSON.stringify({}),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Retornar apenas campos públicos (NUNCA os tokens de API)
    return new Response(
      JSON.stringify({
        meta_pixel_id: trackingConfig.meta_pixel_id,
        tiktok_pixel_id: trackingConfig.tiktok_pixel_id,
        google_ads_conversion_id: trackingConfig.google_ads_conversion_id,
        google_ads_conversion_label: trackingConfig.google_ads_conversion_label,
        is_active: trackingConfig.is_active,
        tracking_enabled_pages: trackingConfig.tracking_enabled_pages || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[get-public-tracking-config] Erro:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
