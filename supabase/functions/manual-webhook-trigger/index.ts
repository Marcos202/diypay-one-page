import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MANUAL_TRIGGER] Processamento manual de webhooks solicitado pelo usuário ${user.id}`);

    // Chamar a função de processamento de webhooks
    const { data: webhookResponse, error: webhookError } = await supabase.functions.invoke('process-webhook-deliveries');
    
    if (webhookError) {
      console.error(`[MANUAL_TRIGGER_ERROR] Falha no processamento:`, webhookError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao processar webhooks',
          details: webhookError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MANUAL_TRIGGER_SUCCESS] Webhooks processados:`, webhookResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhooks processados com sucesso',
        result: webhookResponse 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MANUAL_TRIGGER_EXCEPTION] Erro no processamento manual:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno no servidor',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});