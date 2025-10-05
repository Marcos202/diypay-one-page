
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do Supabase não encontrada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { product_id } = await req.json();
    
    if (!product_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product ID é obrigatório' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar todas as vendas do produto que tenham participantes
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, event_attendees, created_at, buyer_email, status')
      .eq('product_id', product_id)
      .not('event_attendees', 'is', null);

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar dados das vendas' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extrair todos os participantes de todas as vendas
    const allAttendees: any[] = [];
    let totalTickets = 0;
    let checkedInCount = 0;

    sales?.forEach((sale) => {
      if (sale.event_attendees && Array.isArray(sale.event_attendees)) {
        sale.event_attendees.forEach((attendee: any) => {
          allAttendees.push({
            ...attendee,
            sale_id: sale.id,
            sale_date: sale.created_at,
            buyer_email: sale.buyer_email,
            sale_status: sale.status
          });
          totalTickets++;
          if (attendee.checked_in) {
            checkedInCount++;
          }
        });
      }
    });

    // Ordenar por data de criação da venda (mais recentes primeiro)
    allAttendees.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

    return new Response(
      JSON.stringify({
        success: true,
        attendees: allAttendees,
        stats: {
          total_tickets: totalTickets,
          checked_in: checkedInCount,
          pending_checkin: totalTickets - checkedInCount
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
