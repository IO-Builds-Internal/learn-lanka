import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Tables to backup (in order for proper restore with foreign keys)
const BACKUP_TABLES = [
  // Independent tables
  'bank_accounts',
  'sms_templates',
  'coupons',
  'shop_products',
  'papers',
  'notifications',

  // Syllabus & Question Bank
  'syllabus_lessons',
  'question_bank',
  'question_bank_options',

  // Generated Papers
  'generated_papers',

  // User-related
  'profiles',
  'user_roles',

  // Classes hierarchy
  'classes',
  'class_months',
  'class_days',
  'lessons',
  'lesson_attachments',
  'class_papers',

  // Enrollments
  'class_enrollments',
  'enrollment_payments',
  'moderator_class_assignments',

  // Coupons usage
  'coupon_usages',

  // Notifications
  'user_notification_reads',

  // Papers attachments
  'paper_attachments',
  'paper_attachment_user_access',
  'paper_attachment_users',

  // Payments & answer access
  'payments',
  'answer_access_payments',

  // Rank Papers hierarchy
  'rank_papers',
  'rank_paper_attachments',
  'rank_mcq_questions',
  'rank_mcq_options',
  'rank_attempts',
  'rank_answers_mcq',
  'rank_answers_uploads',
  'rank_marks',

  // Shop orders
  'shop_orders',
  'shop_order_items',

  // Contact & SMS
  'contact_messages',
  'contact_replies',
  'sms_logs',
  'otp_requests',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body ONCE (can only be consumed once)
    const body = await req.json();
    const { action, backupData } = body;

    if (action === 'backup') {
      const backup: Record<string, unknown> = {
        _meta: {
          created_at: new Date().toISOString(),
          version: '2.0',
          tables: BACKUP_TABLES,
        }
      };

      // Fetch all data from each table
      for (const table of BACKUP_TABLES) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');

          if (error) {
            console.error(`Error fetching ${table}:`, error);
            backup[table] = [];
          } else {
            backup[table] = data || [];
          }
        } catch (e) {
          console.error(`Exception fetching ${table}:`, e);
          backup[table] = [];
        }
      }

      return new Response(
        JSON.stringify(backup),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'restore') {

      if (!backupData || !backupData._meta) {
        return new Response(
          JSON.stringify({ error: 'Invalid backup file format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: Record<string, { success: boolean; count: number; error?: string }> = {};

      // Restore in order (respecting foreign key dependencies)
      for (const table of BACKUP_TABLES) {
        const tableData = backupData[table];
        
        if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
          results[table] = { success: true, count: 0 };
          continue;
        }

        try {
          // Upsert data - will insert new or update existing based on primary key
          const { error } = await supabase
            .from(table)
            .upsert(tableData, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Error restoring ${table}:`, error);
            results[table] = { success: false, count: 0, error: error.message };
          } else {
            results[table] = { success: true, count: tableData.length };
          }
        } catch (err) {
          console.error(`Exception restoring ${table}:`, err);
          results[table] = { success: false, count: 0, error: String(err) };
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "backup" or "restore"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
