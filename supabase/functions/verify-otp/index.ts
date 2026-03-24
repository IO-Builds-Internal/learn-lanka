import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOtpRequest {
  phone: string;
  otp: string;
  // NOTE: backend normalizes RESET_PASSWORD -> RECOVERY to match database constraint
  purpose: 'REGISTER' | 'LOGIN' | 'RECOVERY' | 'RESET_PASSWORD' | 'PRIVATE_ENROLL';
}


// Format phone to international format (94xxxxxxxxx)
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }
  
  return cleaned;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp, purpose }: VerifyOtpRequest = await req.json();
    // Normalize purpose: uppercase all, then map aliases
    const purposeUpper = (purpose || '').toUpperCase();
    const normalizedPurpose = (purposeUpper === 'RESET_PASSWORD' || purposeUpper === 'RECOVERY')
      ? 'RECOVERY'
      : purposeUpper === 'REGISTER'
      ? 'REGISTER'
      : purposeUpper || purpose;


    if (!phone || !otp || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Phone, OTP, and purpose are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhone(phone);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Compute OTP hash for verification
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + phone);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Get OTP request from database
    const { data: otpRequest, error: fetchError } = await supabase
      .from('otp_requests')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('purpose', normalizedPurpose)
      .single();


    if (fetchError || !otpRequest) {
      return new Response(
        JSON.stringify({ error: 'No OTP request found. Please request a new OTP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(otpRequest.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase
        .from('otp_requests')
        .delete()
        .eq('id', otpRequest.id);

      return new Response(
        JSON.stringify({ error: 'OTP has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts (max 3)
    if (otpRequest.attempts >= 3) {
      await supabase
        .from('otp_requests')
        .delete()
        .eq('id', otpRequest.id);

      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP hash
    if (otpRequest.otp_hash !== otpHash) {
      // Increment attempts
      await supabase
        .from('otp_requests')
        .update({ attempts: otpRequest.attempts + 1 })
        .eq('id', otpRequest.id);

      return new Response(
        JSON.stringify({ error: 'Invalid OTP. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP verified - delete the request
    await supabase
      .from('otp_requests')
      .delete()
      .eq('id', otpRequest.id);

    // Check if user exists (for login flow)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('phone', formattedPhone)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified: true,
        userExists: !!existingProfile,
        profile: existingProfile || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
