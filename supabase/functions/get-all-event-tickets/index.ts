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

    const { producer_id, event_id, search } = await req.json();

    if (!producer_id) {
      throw new Error('producer_id é obrigatório');
    }

    // Buscar produtos do produtor
    let productsQuery = supabaseClient
      .from('products')
      .select('id, name')
      .eq('producer_id', producer_id)
      .eq('product_type', 'event');

    if (event_id) {
      productsQuery = productsQuery.eq('id', event_id);
    }

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw productsError;

    const productIds = products?.map(p => p.id) || [];

    if (productIds.length === 0) {
      return new Response(
        JSON.stringify({ tickets: [], stats: { total: 0, checkedIn: 0 } }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar vendas dos eventos
    const { data: sales, error: salesError } = await supabaseClient
      .from('sales')
      .select(`
        id,
        event_attendees,
        batch_id,
        product_id
      `)
      .in('product_id', productIds)
      .eq('status', 'paid')
      .not('event_attendees', 'is', null);

    if (salesError) throw salesError;

    // Criar mapa de produtos
    const productsMap = new Map(products?.map(p => [p.id, p.name]));

    // Buscar informações dos lotes
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

    // Processar participantes
    const tickets: any[] = [];
    let totalCheckedIn = 0;

    sales?.forEach(sale => {
      const attendees = sale.event_attendees as any[];
      if (!attendees || !Array.isArray(attendees)) return;

      attendees.forEach(attendee => {
        const matchesSearch = !search || 
          attendee.name?.toLowerCase().includes(search.toLowerCase()) ||
          attendee.email?.toLowerCase().includes(search.toLowerCase()) ||
          attendee.cpf?.includes(search);

        if (matchesSearch) {
          tickets.push({
            sale_id: sale.id,
            attendee_id: attendee.id || attendee.email,
            name: attendee.name,
            email: attendee.email,
            cpf: attendee.cpf,
            event_name: productsMap.get(sale.product_id) || 'Evento sem nome',
            batch_name: sale.batch_id ? batchesMap.get(sale.batch_id) : null,
            checked_in: attendee.checked_in || false,
            checked_in_at: attendee.checked_in_at,
          });

          if (attendee.checked_in) {
            totalCheckedIn++;
          }
        }
      });
    });

    return new Response(
      JSON.stringify({
        tickets,
        stats: {
          total: tickets.length,
          checkedIn: totalCheckedIn,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
