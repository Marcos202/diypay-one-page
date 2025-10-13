import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { event_id, search } = await req.json();

    // Buscar produtos do produtor
    let productsQuery = supabaseClient
      .from('products')
      .select('id, name')
      .eq('producer_id', user.id)
      .eq('product_type', 'event');

    if (event_id) {
      productsQuery = productsQuery.eq('id', event_id);
    }

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw productsError;

    const productIds = products?.map(p => p.id) || [];
    const productsMap = new Map(products?.map(p => [p.id, p.name]));

    if (productIds.length === 0) {
      return new Response(
        JSON.stringify({ csv: "Nome,Email,CPF,Evento,Lote,Status,Check-in Realizado,Data Check-in,Data da Compra\n" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar vendas
    const { data: sales, error: salesError } = await supabaseClient
      .from('sales')
      .select(`
        id,
        event_attendees,
        batch_id,
        product_id,
        created_at
      `)
      .in('product_id', productIds)
      .eq('status', 'paid')
      .not('event_attendees', 'is', null);

    if (salesError) throw salesError;

    // Buscar lotes
    const batchIds = sales
      ?.filter(s => s.batch_id)
      .map(s => s.batch_id) || [];

    let batchesMap = new Map();
    if (batchIds.length > 0) {
      const { data: batches } = await supabaseClient
        .from('ticket_batches')
        .select('id, name')
        .in('id', batchIds);
      
      batches?.forEach(b => batchesMap.set(b.id, b.name));
    }

    // Gerar CSV
    let csv = "Nome,Email,CPF,Evento,Lote,Status,Check-in Realizado,Data Check-in,Data da Compra\n";

    sales?.forEach(sale => {
      const attendees = sale.event_attendees as any[];
      if (!attendees || !Array.isArray(attendees)) return;

      attendees.forEach(attendee => {
        const matchesSearch = !search || 
          attendee.name?.toLowerCase().includes(search.toLowerCase()) ||
          attendee.email?.toLowerCase().includes(search.toLowerCase()) ||
          attendee.cpf?.includes(search);

        if (matchesSearch) {
          const eventName = productsMap.get(sale.product_id) || 'Evento sem nome';
          const batchName = sale.batch_id ? batchesMap.get(sale.batch_id) : 'Sem lote';
          const checkedIn = attendee.checked_in ? 'Sim' : 'Não';
          const checkedInDate = attendee.checked_in_at || '-';
          const purchaseDate = new Date(sale.created_at).toLocaleString('pt-BR');

          csv += `"${attendee.name}","${attendee.email}","${attendee.cpf || '-'}","${eventName}","${batchName}","Confirmado","${checkedIn}","${checkedInDate}","${purchaseDate}"\n`;
        }
      });
    });

    return new Response(
      JSON.stringify({ csv }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error exporting tickets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
