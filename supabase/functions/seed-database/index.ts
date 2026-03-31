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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action } = await req.json();

    // ─────────────────────────────────────────────────────────────────
    // CLEAR
    // ─────────────────────────────────────────────────────────────────
    if (action === 'clear') {
      const tablesToClear = [
        'rank_answers_mcq', 'rank_answers_uploads', 'rank_marks', 'rank_attempts',
        'rank_mcq_options', 'rank_mcq_questions', 'rank_paper_attachments', 'rank_papers',
        'lesson_attachments', 'lessons',
        'class_days', 'class_months', 'class_papers',
        'enrollment_payments', 'class_enrollments', 'moderator_class_assignments',
        'classes',
        'shop_order_items', 'shop_orders', 'shop_products',
        'coupon_usages', 'coupons',
        'payments',
        'answer_access_payments',
        'bank_accounts',
        'user_notification_reads', 'notifications',
        'paper_attachment_user_access', 'paper_attachment_users',
        'paper_attachments', 'papers',
        'generated_papers',
        'question_bank_options', 'question_bank',
        'syllabus_lessons',
        'contact_replies', 'contact_messages',
        'sms_logs', 'otp_requests',
        'subjects',
      ];

      const errors: string[] = [];
      for (const table of tablesToClear) {
        try {
          const { error } = await supabase.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) errors.push(`${table}: ${error.message}`);
        } catch (e) {
          errors.push(`${table}: ${String(e)}`);
        }
      }

      // Also remove teacher roles (keep admin roles)
      await supabase.from('user_roles').delete().eq('role', 'teacher');

      return new Response(
        JSON.stringify({ success: true, message: `Database cleared (${errors.length} warning(s)). Users preserved.`, warnings: errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // SEED
    // ─────────────────────────────────────────────────────────────────
    if (action === 'seed') {
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      const { count: paperCount } = await supabase.from('papers').select('*', { count: 'exact', head: true });
      const { count: qbCount } = await supabase.from('question_bank').select('*', { count: 'exact', head: true });
      if ((classCount ?? 0) > 0 || (paperCount ?? 0) > 0 || (qbCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Data already exists. Clear the database first before seeding.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── 0. SUBJECTS ────────────────────────────────────────────────
      const subjectsData = [
        { name: 'ICT', slug: 'ict', description: 'Information & Communication Technology', icon_name: 'Monitor', color: '#3b82f6', is_active: true, sort_order: 0 },
        { name: 'Combined Maths', slug: 'combined-maths', description: 'Pure & Applied Mathematics', icon_name: 'Calculator', color: '#8b5cf6', is_active: true, sort_order: 1 },
        { name: 'Physics', slug: 'physics', description: 'Advanced Level Physics', icon_name: 'Atom', color: '#06b6d4', is_active: true, sort_order: 2 },
        { name: 'Chemistry', slug: 'chemistry', description: 'Advanced Level Chemistry', icon_name: 'FlaskConical', color: '#10b981', is_active: true, sort_order: 3 },
        { name: 'Biology', slug: 'biology', description: 'Advanced Level Biology', icon_name: 'Leaf', color: '#22c55e', is_active: true, sort_order: 4 },
        { name: 'Accounting', slug: 'accounting', description: 'Financial & Management Accounting', icon_name: 'Receipt', color: '#f59e0b', is_active: false, sort_order: 5 },
        { name: 'Economics', slug: 'economics', description: 'Micro & Macro Economics', icon_name: 'TrendingUp', color: '#ef4444', is_active: false, sort_order: 6 },
        { name: 'Business Studies', slug: 'business-studies', description: 'Business Management & Entrepreneurship', icon_name: 'Briefcase', color: '#6366f1', is_active: false, sort_order: 7 },
        { name: 'Political Science', slug: 'political-science', description: 'Government & Political Systems', icon_name: 'Scale', color: '#475569', is_active: false, sort_order: 8 },
        { name: 'Sinhala', slug: 'sinhala', description: 'Sinhala Language & Literature', icon_name: 'Languages', color: '#ec4899', is_active: false, sort_order: 9 },
        { name: 'Tamil', slug: 'tamil', description: 'Tamil Language & Literature', icon_name: 'Languages', color: '#a855f7', is_active: false, sort_order: 10 },
        { name: 'English', slug: 'english', description: 'English Language & Literature', icon_name: 'BookText', color: '#0ea5e9', is_active: false, sort_order: 11 },
        { name: 'Geography', slug: 'geography', description: 'Physical & Human Geography', icon_name: 'Globe', color: '#14b8a6', is_active: false, sort_order: 12 },
        { name: 'Buddhist Civilization', slug: 'buddhist-civilization', description: 'Buddhist Philosophy & History', icon_name: 'Landmark', color: '#d97706', is_active: false, sort_order: 13 },
        { name: 'Art', slug: 'art', description: 'Visual Arts & Aesthetics', icon_name: 'Palette', color: '#f43f5e', is_active: false, sort_order: 14 },
        { name: 'Music', slug: 'music', description: 'Music Theory & Practice', icon_name: 'Music', color: '#a78bfa', is_active: false, sort_order: 15 },
        { name: 'Logic', slug: 'logic', description: 'Formal Logic & Reasoning', icon_name: 'Brain', color: '#64748b', is_active: false, sort_order: 16 },
        { name: 'Agriculture', slug: 'agriculture', description: 'Agricultural Science', icon_name: 'Sprout', color: '#65a30d', is_active: false, sort_order: 17 },
        { name: 'Home Economics', slug: 'home-economics', description: 'Home Management & Nutrition', icon_name: 'Home', color: '#ea580c', is_active: false, sort_order: 18 },
      ];

      const { data: subjects } = await supabase.from('subjects').insert(subjectsData).select();
      const subjectMap: Record<string, string> = {};
      for (const s of subjects || []) { subjectMap[s.slug] = s.id; }

      // ── 1. TEACHERS (create auth users + profiles + roles) ─────────
      const teacherProfiles = [
        { firstName: 'Kasun', lastName: 'Bandara', phone: '0771001001', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80' },
        { firstName: 'Nimal', lastName: 'Jayawardena', phone: '0771001002', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80' },
        { firstName: 'Sanduni', lastName: 'Perera', phone: '0771001003', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' },
        { firstName: 'Chaminda', lastName: 'Silva', phone: '0771001004', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
      ];

      const teacherIds: string[] = [];
      for (const t of teacherProfiles) {
        const email = `${t.phone}@phone.alstudent.lk`;
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email, password: 'Teacher@123', email_confirm: true,
          user_metadata: { first_name: t.firstName, last_name: t.lastName, phone: t.phone },
        });
        if (authErr) { console.error('Teacher create error:', authErr); continue; }
        const uid = authUser.user.id;
        teacherIds.push(uid);

        await supabase.from('profiles').upsert({
          id: uid, phone: t.phone, first_name: t.firstName, last_name: t.lastName,
          teacher_image_url: t.image, status: 'ACTIVE',
        });
        await supabase.from('user_roles').insert({ user_id: uid, role: 'teacher' });
      }

      // ── 2. BANK ACCOUNTS ──────────────────────────────────────────
      await supabase.from('bank_accounts').insert([
        { bank_name: 'Bank of Ceylon', account_name: 'AL Student Academy', account_number: '1234567890', branch: 'Colombo Main', is_active: true },
        { bank_name: 'Commercial Bank', account_name: 'AL Student LTD', account_number: '9876543210', branch: 'Nugegoda', is_active: true },
      ]);

      // ── 3. COUPONS ────────────────────────────────────────────────
      await supabase.from('coupons').insert([
        { code: 'WELCOME50', discount_type: 'PERCENT', discount_value: 50, is_active: true, max_uses: 100 },
        { code: 'FLAT500', discount_type: 'FIXED', discount_value: 500, is_active: true, max_uses: 50 },
      ]);

      // ── 4. SHOP PRODUCTS ──────────────────────────────────────────
      await supabase.from('shop_products').insert([
        { title: 'A/L ICT Theory Notes 2026', description: 'Complete theory notes covering the full A/L ICT syllabus', type: 'BOTH', price_soft: 500, price_printed: 1500, price_both: 1800, is_active: true },
        { title: 'Past Paper Collection 2019–2024', description: 'All A/L past papers with model answers', type: 'SOFT', price_soft: 350, is_active: true },
        { title: 'Combined Maths Formula Book', description: 'Essential formulas for Pure & Applied maths', type: 'PRINTED', price_printed: 800, is_active: true },
        { title: 'Physics Practical Guide', description: 'Lab experiments guide with diagrams', type: 'BOTH', price_soft: 400, price_printed: 1200, price_both: 1400, is_active: true },
      ]);

      // ── 5. NOTIFICATIONS ──────────────────────────────────────────
      await supabase.from('notifications').insert([
        { title: 'Welcome to AL Student!', message: 'Explore classes, rank papers, and resources for all A/L subjects.', target_type: 'ALL' },
        { title: 'New Rank Paper Available', message: 'A new ranking test has been published. Compete on the leaderboard!', target_type: 'ALL' },
        { title: 'Monthly Fee Reminder', message: 'Please pay your monthly class fee before the 10th.', target_type: 'ALL' },
      ]);

      // ── 6. PAPERS (multi-subject) ─────────────────────────────────
      const papersData = [
        { title: 'A/L ICT 2024 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-ict-2024.pdf', subject_id: subjectMap['ict'] },
        { title: 'A/L ICT 2023 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2023, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-ict-2023.pdf', subject_id: subjectMap['ict'] },
        { title: 'A/L ICT 2022 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2022, term: 1, subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/al-ict-2022.pdf', subject_id: subjectMap['ict'] },
        { title: 'A/L ICT 2021 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2021, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/al-ict-2021.pdf', subject_id: subjectMap['ict'] },
        { title: 'A/L Combined Maths 2024', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'Combined Maths', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-maths-2024.pdf', subject_id: subjectMap['combined-maths'] },
        { title: 'A/L Combined Maths 2023', paper_type: 'PAST_PAPER', grade: 13, year: 2023, term: 1, subject: 'Combined Maths', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/al-maths-2023.pdf', subject_id: subjectMap['combined-maths'] },
        { title: 'A/L Physics 2024 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'Physics', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-physics-2024.pdf', subject_id: subjectMap['physics'] },
        { title: 'A/L Physics 2023 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2023, term: 1, subject: 'Physics', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/al-physics-2023.pdf', subject_id: subjectMap['physics'] },
        { title: 'A/L Chemistry 2024', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'Chemistry', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-chem-2024.pdf', subject_id: subjectMap['chemistry'] },
        { title: 'A/L Biology 2024', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'Biology', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/al-bio-2024.pdf', subject_id: subjectMap['biology'] },
        { title: 'Royal College ICT 1st Term 2024', paper_type: 'SCHOOL_EXAM', grade: 12, year: 2024, term: 1, school_or_zone: 'Royal College', subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/royal-ict-2024.pdf', subject_id: subjectMap['ict'] },
        { title: 'Ananda College Physics 2024', paper_type: 'SCHOOL_EXAM', grade: 12, year: 2024, term: 2, school_or_zone: 'Ananda College', subject: 'Physics', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/ananda-phy-2024.pdf', subject_id: subjectMap['physics'] },
      ];
      await supabase.from('papers').insert(papersData);

      // ── 7. SYLLABUS LESSONS (ICT) ─────────────────────────────────
      const ictSyllabus = [
        { title: 'Information and Communication Technology', grade: 13, subject: 'ICT', sort_order: 1, subject_id: subjectMap['ict'] },
        { title: 'Data and Information', grade: 13, subject: 'ICT', sort_order: 2, subject_id: subjectMap['ict'] },
        { title: 'Hardware and Software', grade: 13, subject: 'ICT', sort_order: 3, subject_id: subjectMap['ict'] },
        { title: 'Networking and Internet', grade: 13, subject: 'ICT', sort_order: 4, subject_id: subjectMap['ict'] },
        { title: 'Programming Concepts', grade: 13, subject: 'ICT', sort_order: 5, subject_id: subjectMap['ict'] },
        { title: 'Database Management', grade: 13, subject: 'ICT', sort_order: 6, subject_id: subjectMap['ict'] },
      ];
      const { data: syllabus } = await supabase.from('syllabus_lessons').insert(ictSyllabus).select();

      if (syllabus && syllabus.length > 0) {
        const subLessons: any[] = [];
        const subMap: Record<string, string[]> = {
          'Information and Communication Technology': ['History of ICT', 'Impact of ICT on Society'],
          'Data and Information': ['Data Types', 'Number Systems', 'Data Encoding'],
          'Hardware and Software': ['Input/Output Devices', 'CPU and Memory', 'Operating Systems'],
          'Networking and Internet': ['Network Topologies', 'OSI Model', 'IP Addressing'],
          'Programming Concepts': ['Algorithms', 'Control Structures', 'OOP'],
          'Database Management': ['ER Diagrams', 'SQL Fundamentals', 'Normalization'],
        };
        for (const parent of syllabus) {
          (subMap[parent.title] || []).forEach((title, i) => {
            subLessons.push({ title, parent_id: parent.id, grade: 13, subject: 'ICT', sort_order: i + 1, subject_id: subjectMap['ict'] });
          });
        }
        await supabase.from('syllabus_lessons').insert(subLessons);
      }

      // ── 8. QUESTION BANK ──────────────────────────────────────────
      const { data: allSyllabus } = await supabase.from('syllabus_lessons').select('id').is('parent_id', null);
      const lessonIds = (allSyllabus || []).map(l => l.id);

      const mcqQuestions = [
        { question_text: 'What does CPU stand for?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE', subject_id: subjectMap['ict'] },
        { question_text: 'Which is a primary memory?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE', subject_id: subjectMap['ict'] },
        { question_text: 'Binary of decimal 10?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATA', subject_id: subjectMap['ict'] },
        { question_text: 'Protocol for sending emails?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING', subject_id: subjectMap['ict'] },
        { question_text: 'What does HTML stand for?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'WEB', subject_id: subjectMap['ict'] },
        { question_text: 'OSI layer for routing?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING', subject_id: subjectMap['ict'] },
        { question_text: 'SQL command to retrieve data?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE', subject_id: subjectMap['ict'] },
        { question_text: 'LIFO data structure?', correct_option_no: 4, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'PROGRAMMING', subject_id: subjectMap['ict'] },
        { question_text: 'Explain RAM vs ROM.', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE', subject_id: subjectMap['ict'] },
        { question_text: 'Describe SDLC phases.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'SYSTEMS', subject_id: subjectMap['ict'] },
      ];

      const questionsToInsert = mcqQuestions.map((q, i) => ({
        ...q, lesson_id: lessonIds.length > 0 ? lessonIds[i % lessonIds.length] : null,
      }));
      const { data: insertedQuestions } = await supabase.from('question_bank').insert(questionsToInsert).select();

      const mcqOptionSets: Record<number, { texts: string[]; correct: number }> = {
        0: { texts: ['Central Processing Unit', 'Computer Processing Unit', 'Central Program Unit', 'Core Processing Unit'], correct: 1 },
        1: { texts: ['Hard Disk', 'RAM', 'CD-ROM', 'Flash Drive'], correct: 2 },
        2: { texts: ['0101', '1001', '1010', '1100'], correct: 3 },
        3: { texts: ['SMTP', 'FTP', 'HTTP', 'POP3'], correct: 1 },
        4: { texts: ['Hyper Terminal Markup Language', 'HyperText Markup Language', 'Hyperlink Text Markup Language', 'High-level Text Markup Language'], correct: 2 },
        5: { texts: ['Physical', 'Data Link', 'Network', 'Transport'], correct: 3 },
        6: { texts: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], correct: 1 },
        7: { texts: ['Queue', 'Array', 'Linked List', 'Stack'], correct: 4 },
      };

      const optionsToInsert: any[] = [];
      for (const q of insertedQuestions || []) {
        const idx = questionsToInsert.findIndex(orig => orig.question_text === q.question_text);
        if (q.question_type === 'MCQ' && mcqOptionSets[idx]) {
          const set = mcqOptionSets[idx];
          for (let o = 0; o < 4; o++) {
            optionsToInsert.push({ question_id: q.id, option_no: o + 1, option_text: set.texts[o], is_correct: (o + 1) === set.correct });
          }
        }
      }
      if (optionsToInsert.length > 0) await supabase.from('question_bank_options').insert(optionsToInsert);

      // ── 9. CLASSES (multi-subject, assigned to teachers) ──────────
      const classesData = [
        { title: 'A/L ICT Theory 2026', description: 'Full theory syllabus for A/L ICT.', grade_min: 12, grade_max: 13, monthly_fee_amount: 2500, is_private: false, subject_id: subjectMap['ict'], teacher_id: teacherIds[0] || null, approval_status: 'APPROVED' },
        { title: 'A/L Combined Maths 2026', description: 'Comprehensive Combined Maths course for A/L.', grade_min: 12, grade_max: 13, monthly_fee_amount: 3000, is_private: false, subject_id: subjectMap['combined-maths'], teacher_id: teacherIds[1] || null, approval_status: 'APPROVED' },
        { title: 'A/L Physics 2026 Batch', description: 'Complete Physics course with practical sessions.', grade_min: 12, grade_max: 13, monthly_fee_amount: 2800, is_private: false, subject_id: subjectMap['physics'], teacher_id: teacherIds[2] || null, approval_status: 'APPROVED' },
        { title: 'A/L Chemistry Revision', description: 'Intensive chemistry revision for 2026 exam.', grade_min: 13, grade_max: 13, monthly_fee_amount: 3500, is_private: true, private_code: 'CHEM2026', subject_id: subjectMap['chemistry'], teacher_id: teacherIds[3] || null, approval_status: 'APPROVED' },
        { title: 'ICT Programming Batch', description: 'Python, Java, and web development.', grade_min: 11, grade_max: 13, monthly_fee_amount: 3500, is_private: true, private_code: 'PROG2026', subject_id: subjectMap['ict'], teacher_id: teacherIds[0] || null, approval_status: 'PENDING' },
      ];
      const { data: classes } = await supabase.from('classes').insert(classesData).select();

      // Class months
      const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
      const classMonthsData: any[] = [];
      for (const cls of classes || []) {
        for (const month of months) {
          classMonthsData.push({ class_id: cls.id, year_month: month });
        }
      }
      const { data: classMonths } = await supabase.from('class_months').insert(classMonthsData).select();

      // Class days
      const classDaysData: any[] = [];
      for (const cm of classMonths || []) {
        const base = new Date(cm.year_month + '-01');
        classDaysData.push(
          { class_month_id: cm.id, date: new Date(base.getTime() + 5 * 86400000).toISOString().split('T')[0], title: 'Session 1', start_time: '09:00', end_time: '11:30', is_extra: false, is_conducted: true },
          { class_month_id: cm.id, date: new Date(base.getTime() + 12 * 86400000).toISOString().split('T')[0], title: 'Session 2', start_time: '09:00', end_time: '11:30', is_extra: false, is_conducted: true },
          { class_month_id: cm.id, date: new Date(base.getTime() + 19 * 86400000).toISOString().split('T')[0], title: 'Session 3', start_time: '14:00', end_time: '16:30', is_extra: false, is_conducted: false },
          { class_month_id: cm.id, date: new Date(base.getTime() + 26 * 86400000).toISOString().split('T')[0], title: 'Revision', start_time: '10:00', end_time: '12:30', is_extra: true, is_conducted: false }
        );
      }
      await supabase.from('class_days').insert(classDaysData);

      // Lessons for conducted days
      const { data: conductedDays } = await supabase.from('class_days').select('id, title').eq('is_conducted', true).limit(20);
      const lessonTopics = [
        { title: 'Introduction & History', description: 'Overview and historical context.', notes_text: 'Key concepts covered in detail.' },
        { title: 'Core Concepts', description: 'Fundamental principles and theories.', notes_text: 'Important formulas and definitions.' },
        { title: 'Problem Solving', description: 'Applied problem-solving techniques.', notes_text: 'Practice problems included.' },
        { title: 'Advanced Topics', description: 'Deep dive into advanced material.', notes_text: 'Extended reading references.' },
      ];
      const lessonsToInsert: any[] = [];
      for (let i = 0; i < (conductedDays || []).length; i++) {
        const topic = lessonTopics[i % lessonTopics.length];
        lessonsToInsert.push({ class_day_id: conductedDays![i].id, ...topic, youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      }
      await supabase.from('lessons').insert(lessonsToInsert);

      // Class papers
      if (classes && classes.length > 0) {
        await supabase.from('class_papers').insert([
          { class_id: classes[0].id, title: 'January Daily Paper 1', paper_type: 'DAILY', pdf_url: 'https://example.com/daily-jan-1.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
          { class_id: classes[0].id, title: 'January Weekly Paper', paper_type: 'WEEKLY', pdf_url: 'https://example.com/weekly-jan.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
          { class_id: classes[1].id, title: 'Maths Monthly Test', paper_type: 'MONTHLY', pdf_url: 'https://example.com/maths-monthly.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
        ]);
      }

      // ── 10. RANK PAPERS (multi-subject) ───────────────────────────
      const rankPapersData = [
        { title: 'ICT Ranking Test — January 2026', grade: 13, time_limit_minutes: 60, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 200, subject_id: subjectMap['ict'] },
        { title: 'Combined Maths Ranking — February 2026', grade: 13, time_limit_minutes: 90, has_mcq: true, has_short_essay: true, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 300, subject_id: subjectMap['combined-maths'] },
        { title: 'Physics Practice Ranking', grade: 13, time_limit_minutes: 45, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'DRAFT', fee_amount: 150, subject_id: subjectMap['physics'] },
      ];
      const { data: rankPapers } = await supabase.from('rank_papers').insert(rankPapersData).select();

      for (const paper of rankPapers || []) {
        if (paper.has_mcq) {
          const count = paper.time_limit_minutes >= 90 ? 8 : 5;
          const mcqTexts = ['Which is correct?', 'What is the answer?', 'Select the right option:', 'Which one applies?', 'Choose the correct answer:', 'Identify the right one:', 'What is the result?', 'Which statement is true?'];
          const optSets = [
            ['Option A', 'Option B', 'Option C', 'Option D'],
            ['First', 'Second', 'Third', 'Fourth'],
          ];
          for (let i = 0; i < count; i++) {
            const { data: q } = await supabase.from('rank_mcq_questions').insert({ rank_paper_id: paper.id, q_no: i + 1, question_text: mcqTexts[i % mcqTexts.length] }).select().single();
            if (q) {
              const opts = optSets[i % optSets.length];
              await supabase.from('rank_mcq_options').insert(opts.map((text, oi) => ({ question_id: q.id, option_no: oi + 1, option_text: text, is_correct: oi === 0 })));
            }
          }
        }
      }

      // ── 11. CONTACT MESSAGES ──────────────────────────────────────
      await supabase.from('contact_messages').insert([
        { name: 'Kamal Perera', phone: '0771234567', message: 'How do I enroll in the ICT class?', status: 'NEW' },
        { name: 'Nimali Silva', email: 'nimali@example.com', message: 'Can I get a refund for last month?', status: 'NEW' },
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Database seeded with multi-subject data, 4 teachers, classes, papers, rank papers, and more!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seed/Clear error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
