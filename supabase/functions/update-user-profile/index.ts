import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileUpdateData {
  full_name?: string;
  cpf_cnpj?: string;
  phone?: string;
  instagram_handle?: string;
  current_password?: string;
  new_password?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting profile update...');
    
    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Updating profile for user: ${user.id}`);

    // Parse the request body
    const requestData: ProfileUpdateData = await req.json();
    console.log('Profile update data:', requestData);

    // Validate required fields
    if (!requestData.full_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Nome completo é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle password change if provided
    if (requestData.current_password && requestData.new_password) {
      console.log('Processing password change...');
      
      // Verify current password by trying to sign in
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password: requestData.current_password
      });

      if (signInError) {
        console.error('Current password verification failed:', signInError);
        return new Response(
          JSON.stringify({ error: 'Senha atual incorreta' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if new password is different from current
      if (requestData.current_password === requestData.new_password) {
        return new Response(
          JSON.stringify({ error: 'A nova senha deve ser diferente da senha atual' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update password
      const { error: passwordError } = await supabaseClient.auth.updateUser({
        password: requestData.new_password
      });

      if (passwordError) {
        console.error('Password update error:', passwordError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar senha' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Password updated successfully');
    }

    // Update the profile in the database
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        full_name: requestData.full_name.trim(),
        cpf_cnpj: requestData.cpf_cnpj?.trim() || null,
        phone: requestData.phone?.trim() || null,
        instagram_handle: requestData.instagram_handle?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Profile updated successfully:', updatedProfile);

    return new Response(
      JSON.stringify({ 
        success: true,
        profile: updatedProfile 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in update-user-profile:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});