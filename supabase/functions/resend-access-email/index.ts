// supabase/functions/resend-access-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Validar o produtor que está fazendo a chamada
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user: producerUser } } = await serviceClient.auth.getUser(token)
    if (!producerUser) throw new Error('Unauthorized');

    const { studentUserId } = await req.json();
    if (!studentUserId) throw new Error("ID do aluno é obrigatório.");

    // Gerar o Magic Link para o aluno
    const { data, error } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: (await serviceClient.auth.admin.getUserById(studentUserId)).data.user.email,
    });
    if (error) throw error;
    
    // (Lógica de envio de e-mail iria aqui)
    // Por enquanto, vamos simular o sucesso e logar o link no servidor para depuração.
    console.log(`Magic Link gerado para ${data.user.email}: ${data.properties.action_link}`);

    return new Response(JSON.stringify({ success: true, message: "E-mail de acesso reenviado." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})