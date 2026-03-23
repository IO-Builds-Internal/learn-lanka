import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendOtpRequest {
  phone: string;
  // NOTE: backend normalizes RESET_PASSWORD -> RECOVERY to match database constraint
  purpose: 'REGISTER' | 'LOGIN' | 'RECOVERY' | 'RESET_PASSWORD' | 'PRIVATE_ENROLL';
}


// Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format phone to international format (94xxxxxxxxx)
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 94
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }
  
  // If doesn't start with 94, add it
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
    const { phone, purpose }: SendOtpRequest = await req.json();
    const normalizedPurpose = purpose === 'RESET_PASSWORD' ? 'RECOVERY' : purpose;


    if (!phone || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Phone and purpose are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    const formattedPhone = formatPhone(phone);
    
    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Get Text.lk credentials
    const apiToken = Deno.env.get('TEXTLK_API_TOKEN');
    const senderId = Deno.env.get('TEXTLK_SENDER_ID');

    if (!apiToken || !senderId) {
      console.error('Missing Text.lk credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For REGISTER purpose, check if user already exists in auth
    if (purpose === 'REGISTER') {
      const localPhone = formattedPhone.replace(/^94/, '0');
      const phoneEmail = `${localPhone}@phone.alict.lk`;
      
      // Check auth.users via admin API to see if user actually exists and can sign in
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(phoneEmail);

      if (authUser?.user) {
        // User exists in auth - they should sign in instead
        return new Response(
          JSON.stringify({ 
            error: 'Phone number already registered',
            alreadyRegistered: true,
            message: 'This phone number is already registered. Please sign in instead.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If no auth user found, clean up any orphaned profile so registration can proceed
      const { data: orphanedProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${formattedPhone},phone.eq.${localPhone}`)
        .maybeSingle();
      
      if (orphanedProfile) {
        // Delete orphaned profile and role entries so trigger can recreate them
        await supabase.from('user_roles').delete().eq('user_id', orphanedProfile.id);
        await supabase.from('profiles').delete().eq('id', orphanedProfile.id);
      }
    }
    
    // Send SMS via Text.lk API
    const smsMessage = `Your ICT Academy verification code is: ${otp}. Valid for 5 minutes.`;
    
    const smsResponse = await fetch('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        recipient: formattedPhone,
        sender_id: senderId,
        type: 'plain',
        message: smsMessage,
      }),
    });

    const smsResult = await smsResponse.json();

    if (smsResult.status === 'error') {
      console.error('SMS API error:', smsResult.message);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: smsResult.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store OTP hash in database for verification
    // Using SHA-256 hash for security
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + phone);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in otp_requests table
    const { error: dbError } = await supabase
      .from('otp_requests')
      .upsert({
        phone: formattedPhone,
        otp_hash: otpHash,
        purpose: normalizedPurpose,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      }, {
        onConflict: 'phone,purpose'
      });


    if (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB fails - OTP was already sent
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        phone: formattedPhone.slice(-4), // Return last 4 digits for display
        expiresIn: 300 // 5 minutes in seconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-otp:', error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
