import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlatformSettings {
  card_installment_interest_rate: number;
  default_card_fee_percent: number;
  default_pix_fee_percent: number;
  default_boleto_fee_percent: number;
  default_fixed_fee_cents: number;
  default_pix_release_days: number;
  default_boleto_release_days: number;
  default_card_release_days: number;
  default_security_reserve_percent: number;
  default_security_reserve_days: number;
  default_withdrawal_fee_cents: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS for platform settings
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching platform fees...');

    // Fetch platform settings - using service role to bypass RLS
    const { data: settings, error } = await supabaseClient
      .from('platform_settings')
      .select(`
        card_installment_interest_rate,
        default_card_fee_percent,
        default_pix_fee_percent,
        default_boleto_fee_percent,
        default_fixed_fee_cents,
        default_pix_release_days,
        default_boleto_release_days,
        default_card_release_days,
        default_security_reserve_percent,
        default_security_reserve_days,
        default_withdrawal_fee_cents
      `)
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching platform settings:', error);
      throw error;
    }

    if (!settings) {
      throw new Error('Platform settings not found');
    }

    console.log('Platform fees fetched successfully:', settings);

    return new Response(
      JSON.stringify(settings),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-platform-fees:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch platform fees'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});