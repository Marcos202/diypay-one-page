
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar o gateway ativo
    const { data: activeGateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('gateway_identifier, gateway_name')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (gatewayError || !activeGateway) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum gateway de pagamento ativo encontrado.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        gateway: activeGateway 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GET_ACTIVE_GATEWAY_ERROR]', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
