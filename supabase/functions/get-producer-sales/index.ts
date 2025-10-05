
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] *** INÍCIO DA FUNÇÃO get-producer-sales ***');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[ERRO] Token de autorização não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autorização requerido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar o usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[ERRO] Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Usuário autenticado:', user.id);

    // Verificar se o usuário é um produtor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'producer') {
      console.error('[ERRO] Usuário não é um produtor:', profileError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas produtores podem acessar.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Buscando vendas para o produtor:', user.id);

    // CORREÇÃO CRÍTICA: Buscar vendas APENAS do produtor logado
    // Query corrigida com JOIN e filtro por producer_id
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        buyer_email,
        amount_total_cents,
        platform_fee_cents,
        producer_share_cents,
        payment_method_used,
        installments_chosen,
        status,
        created_at,
        paid_at,
        updated_at,
        products!inner (
          name,
          price_cents,
          type,
          producer_id
        )
      `)
      .eq('products.producer_id', user.id)
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('[ERRO] Erro ao buscar vendas:', salesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar vendas' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[DEBUG] Vendas encontradas:', sales?.length || 0);
    console.log('[DEBUG] Dados das vendas:', JSON.stringify(sales, null, 2));

    // Retornar as vendas
    return new Response(
      JSON.stringify({
        success: true,
        sales: sales || [],
        total_count: sales?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERRO] Erro interno na função:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
