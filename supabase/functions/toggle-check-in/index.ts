
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
    
    const { sale_id, attendee_id } = await req.json();
    
    if (!sale_id || !attendee_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sale ID e Attendee ID são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar a venda
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('event_attendees')
      .eq('id', sale_id)
      .single();

    if (fetchError || !sale) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Venda não encontrada' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Atualizar o status do participante
    const attendees = sale.event_attendees as any[];
    const attendeeIndex = attendees.findIndex(a => a.id === attendee_id);
    
    if (attendeeIndex === -1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Participante não encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Toggle check-in status
    const currentStatus = attendees[attendeeIndex].checked_in;
    attendees[attendeeIndex].checked_in = !currentStatus;
    attendees[attendeeIndex].checked_in_at = !currentStatus ? new Date().toISOString() : null;

    // Salvar as alterações
    const { error: updateError } = await supabase
      .from('sales')
      .update({ event_attendees: attendees })
      .eq('id', sale_id);

    if (updateError) {
      console.error('Erro ao atualizar check-in:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar check-in' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_in: attendees[attendeeIndex].checked_in,
        checked_in_at: attendees[attendeeIndex].checked_in_at
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
