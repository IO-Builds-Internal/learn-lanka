import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { action } = await req.json();

    if (action === 'seed') {
      // Check if data already exists
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      
      if (classCount && classCount > 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Data already exists. Clear the database first before seeding.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Seed Classes
      const classesData = [
        { title: 'A/L ICT Theory 2026', description: 'Complete theory syllabus for A/L ICT', grade_min: 12, grade_max: 13, monthly_fee_amount: 2500, is_private: false },
        { title: 'O/L ICT Revision 2026', description: 'Intensive revision for O/L ICT exam', grade_min: 10, grade_max: 11, monthly_fee_amount: 2000, is_private: false },
        { title: 'Grade 10 ICT Foundation', description: 'Foundation course for Grade 10 students', grade_min: 10, grade_max: 10, monthly_fee_amount: 1500, is_private: false },
        { title: 'Programming Basics', description: 'Introduction to programming concepts', grade_min: 9, grade_max: 13, monthly_fee_amount: 3000, is_private: true, private_code: 'PROG2026' },
      ];

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .insert(classesData)
        .select();
      
      if (classError) throw classError;

      // Seed Class Months for each class
      const months = ['2026-01', '2026-02', '2026-03'];
      const classMonthsData = [];
      for (const cls of classes || []) {
        for (const month of months) {
          classMonthsData.push({ class_id: cls.id, year_month: month });
        }
      }
      await supabase.from('class_months').insert(classMonthsData);

      // Seed Class Days with times
      const { data: classMonths } = await supabase.from('class_months').select('id, class_id, year_month');
      const classDaysData = [];
      for (const cm of classMonths || []) {
        const baseDate = new Date(cm.year_month + '-01');
        classDaysData.push(
          { class_month_id: cm.id, date: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], title: 'Lesson 1', start_time: '09:00', end_time: '11:00', is_extra: false },
          { class_month_id: cm.id, date: new Date(baseDate.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], title: 'Lesson 2', start_time: '14:00', end_time: '16:00', is_extra: false },
          { class_month_id: cm.id, date: new Date(baseDate.getTime() + 19 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], title: 'Lesson 3', start_time: '09:00', end_time: '11:00', is_extra: false },
          { class_month_id: cm.id, date: new Date(baseDate.getTime() + 26 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], title: 'Revision', start_time: '10:00', end_time: '12:00', is_extra: true }
        );
      }
      await supabase.from('class_days').insert(classDaysData);

      // Seed Bank Accounts
      await supabase.from('bank_accounts').insert([
        { bank_name: 'Bank of Ceylon', account_name: 'ICT Academy', account_number: '1234567890', branch: 'Colombo Main', is_active: true },
        { bank_name: 'Commercial Bank', account_name: 'ICT Academy LTD', account_number: '9876543210', branch: 'Nugegoda', is_active: true },
        { bank_name: 'Sampath Bank', account_name: 'ICT Academy', account_number: '5555666677', branch: 'Maharagama', is_active: false },
      ]);

      // Seed Coupons
      await supabase.from('coupons').insert([
        { code: 'WELCOME50', discount_type: 'PERCENT', discount_value: 50, is_active: true, max_uses: 100 },
        { code: 'FLAT500', discount_type: 'FIXED', discount_value: 500, is_active: true, max_uses: 50 },
        { code: 'FREEMONTH', discount_type: 'FULL', discount_value: 100, is_active: true, max_uses: 10 },
        { code: 'EXPIRED2025', discount_type: 'PERCENT', discount_value: 20, is_active: false },
      ]);

      // Seed Shop Products
      await supabase.from('shop_products').insert([
        { title: 'ICT Theory Notes - A/L', description: 'Complete theory notes for A/L ICT', type: 'BOTH', price_soft: 500, price_printed: 1500, price_both: 1800, is_active: true },
        { title: 'Past Paper Collection 2020-2025', description: 'All past papers with answers', type: 'SOFT', price_soft: 300, is_active: true },
        { title: 'Programming Exercises Book', description: 'Hands-on programming exercises', type: 'PRINTED', price_printed: 2000, is_active: true },
        { title: 'Quick Revision Cards', description: 'Flash cards for quick revision', type: 'PRINTED', price_printed: 800, is_active: true },
      ]);

      // Seed Papers
      await supabase.from('papers').insert([
        { title: 'A/L ICT 2024 Paper', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'ICT', medium: 'English', is_free: true, pdf_url: 'https://example.com/paper1.pdf' },
        { title: 'A/L ICT 2023 Paper', paper_type: 'PAST_PAPER', grade: 13, year: 2023, term: 1, subject: 'ICT', medium: 'English', is_free: true, pdf_url: 'https://example.com/paper2.pdf' },
        { title: 'O/L ICT 2024 Model Paper', paper_type: 'MODEL_PAPER', grade: 11, year: 2024, subject: 'ICT', medium: 'Sinhala', is_free: false, pdf_url: 'https://example.com/paper3.pdf' },
        { title: 'Royal College Term Test 2024', paper_type: 'SCHOOL_PAPER', grade: 12, year: 2024, term: 2, school_or_zone: 'Royal College', subject: 'ICT', is_free: false, pdf_url: 'https://example.com/paper4.pdf' },
      ]);

      // Seed Rank Papers
      const rankPapersData = [
        { title: 'ICT Ranking Test - January 2026', grade: 13, time_limit_minutes: 60, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 200 },
        { title: 'Programming Skills Assessment', grade: 12, time_limit_minutes: 90, has_mcq: true, has_short_essay: true, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 300 },
        { title: 'O/L ICT Practice Test', grade: 11, time_limit_minutes: 45, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'DRAFT' },
      ];

      const { data: rankPapers } = await supabase.from('rank_papers').insert(rankPapersData).select();

      // Add MCQ questions to rank papers
      for (const paper of rankPapers || []) {
        if (paper.has_mcq) {
          for (let i = 1; i <= 5; i++) {
            const { data: question } = await supabase.from('rank_mcq_questions').insert({
              rank_paper_id: paper.id,
              q_no: i,
              question_text: `Sample question ${i} for ${paper.title}?`
            }).select().single();

            if (question) {
              await supabase.from('rank_mcq_options').insert([
                { question_id: question.id, option_no: 1, option_text: 'Option A', is_correct: i === 1 },
                { question_id: question.id, option_no: 2, option_text: 'Option B', is_correct: i === 2 },
                { question_id: question.id, option_no: 3, option_text: 'Option C', is_correct: i === 3 },
                { question_id: question.id, option_no: 4, option_text: 'Option D', is_correct: i === 4 },
              ]);
            }
          }
        }
      }

      // Seed Notifications
      await supabase.from('notifications').insert([
        { title: 'Welcome to ICT Academy!', message: 'Thank you for joining. Start exploring our classes and resources.', target_type: 'ALL' },
        { title: 'New Rank Paper Available', message: 'A new ranking test has been published. Test your skills now!', target_type: 'ALL' },
        { title: 'Payment Reminder', message: 'Don\'t forget to pay your monthly fees before the 10th.', target_type: 'ALL' },
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Database seeded with dummy data!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'clear') {
      // Clear all data except auth/users related tables
      // Order matters due to foreign key constraints - delete children first
      const tablesToClear = [
        // Rank paper children (deepest first)
        'rank_answers_mcq',
        'rank_answers_uploads',
        'rank_marks',
        'rank_attempts',
        'rank_mcq_options',
        'rank_mcq_questions',
        'rank_paper_attachments',
        'rank_papers',
        
        // Lesson children
        'lesson_attachments',
        'lessons',
        
        // Class hierarchy (bottom up)
        'class_days',
        'class_months',
        'class_papers',
        
        // Enrollments
        'enrollment_payments',
        'class_enrollments',
        'moderator_class_assignments',
        
        // Now classes can be deleted
        'classes',
        
        // Shop
        'shop_order_items',
        'shop_orders',
        'shop_products',
        
        // Payments
        'payments',
        
        // Coupons
        'coupon_usages',
        'coupons',
        
        // Bank accounts
        'bank_accounts',
        
        // Notifications
        'user_notification_reads',
        'notifications',
        
        // Papers
        'paper_attachment_user_access',
        'paper_attachments',
        'papers',
        
        // Contact & SMS & OTP
        'contact_messages',
        'sms_logs',
        'otp_requests',
        
        // NOT clearing: profiles, user_roles, sms_templates
      ];

      const errors: string[] = [];
      
      for (const table of tablesToClear) {
        try {
          const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) {
            console.error(`Error clearing ${table}:`, error);
            errors.push(`${table}: ${error.message}`);
          }
        } catch (e) {
          console.error(`Exception clearing ${table}:`, e);
          errors.push(`${table}: ${String(e)}`);
        }
      }

      if (errors.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Database cleared with ${errors.length} warning(s). Users preserved.`,
            warnings: errors 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Database cleared (users preserved)!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seed/Clear error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
