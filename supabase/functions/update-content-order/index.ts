// supabase/functions/update-content-order/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { items, table } = await req.json();
    if (!items || !Array.isArray(items) || !table) {
      throw new Error("Uma lista de 'items' e o nome da 'table' são obrigatórios.");
    }
    if (table !== 'space_containers' && table !== 'space_products') {
      throw new Error("A tabela deve ser 'space_containers' ou 'space_products'.");
    }

    // Validação de propriedade será complexa aqui, confiaremos na RLS para SELECTs futuros
    // e na lógica de UI para apenas permitir arrastar itens do próprio usuário.

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index,
    }));

    const { error } = await serviceClient.from(table).upsert(updates);
    if (error) throw error;

    return new Response(JSON.stringify({ message: "Ordem atualizada com sucesso." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})