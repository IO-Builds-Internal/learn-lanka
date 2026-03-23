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
      if (classCount && classCount > 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Data already exists. Clear the database first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── 1. BANK ACCOUNTS ──────────────────────────────────────────
      await supabase.from('bank_accounts').insert([
        { bank_name: 'Bank of Ceylon', account_name: 'ICT Academy', account_number: '1234567890', branch: 'Colombo Main', is_active: true },
        { bank_name: 'Commercial Bank', account_name: 'ICT Academy LTD', account_number: '9876543210', branch: 'Nugegoda', is_active: true },
        { bank_name: 'Sampath Bank', account_name: 'ICT Academy', account_number: '5555666677', branch: 'Maharagama', is_active: false },
      ]);

      // ── 2. COUPONS ────────────────────────────────────────────────
      await supabase.from('coupons').insert([
        { code: 'WELCOME50', discount_type: 'PERCENT', discount_value: 50, is_active: true, max_uses: 100 },
        { code: 'FLAT500', discount_type: 'FIXED', discount_value: 500, is_active: true, max_uses: 50 },
        { code: 'EXPIRED25', discount_type: 'PERCENT', discount_value: 25, is_active: false },
        { code: 'NEWSTUDENT', discount_type: 'FIXED', discount_value: 1000, is_active: true, max_uses: 20 },
      ]);

      // ── 3. SHOP PRODUCTS ──────────────────────────────────────────
      await supabase.from('shop_products').insert([
        { title: 'A/L ICT Theory Notes 2026', description: 'Complete theory notes covering the full A/L ICT syllabus', type: 'BOTH', price_soft: 500, price_printed: 1500, price_both: 1800, is_active: true },
        { title: 'Past Paper Collection 2019–2024', description: 'All A/L ICT past papers with model answers', type: 'SOFT', price_soft: 350, is_active: true },
        { title: 'Programming Exercises Workbook', description: 'Hands-on exercises for Python, Java, and web development', type: 'PRINTED', price_printed: 2000, is_active: true },
        { title: 'Quick Revision Flash Cards', description: 'Key definitions and diagrams for last-minute revision', type: 'PRINTED', price_printed: 800, is_active: true },
        { title: 'Structured Essay Answer Guide', description: 'Model structured essay answers for A/L ICT', type: 'BOTH', price_soft: 400, price_printed: 1200, price_both: 1400, is_active: true },
      ]);

      // ── 4. NOTIFICATIONS ──────────────────────────────────────────
      await supabase.from('notifications').insert([
        { title: 'Welcome to ICT Academy!', message: 'Thank you for joining. Explore classes, rank papers, and resources to kickstart your learning journey.', target_type: 'ALL' },
        { title: 'New Rank Paper Available', message: 'A new January 2026 ranking test has been published. Test your skills and compete on the leaderboard!', target_type: 'ALL' },
        { title: 'Monthly Fee Reminder', message: 'Please pay your monthly class fee before the 10th to retain access to lessons and papers.', target_type: 'ALL' },
        { title: 'Schedule Published — January 2026', message: 'The class schedule for January 2026 has been published. Check your class page for dates and times.', target_type: 'ALL' },
      ]);

      // ── 5. PAPERS ─────────────────────────────────────────────────
      await supabase.from('papers').insert([
        { title: 'A/L ICT 2024 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2024, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-ict-2024.pdf' },
        { title: 'A/L ICT 2023 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2023, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: true, pdf_url: 'https://example.com/al-ict-2023.pdf' },
        { title: 'A/L ICT 2022 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2022, term: 1, subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/al-ict-2022.pdf' },
        { title: 'A/L ICT 2021 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2021, term: 1, subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/al-ict-2021.pdf' },
        { title: 'A/L ICT 2020 Paper I', paper_type: 'PAST_PAPER', grade: 13, year: 2020, term: 1, subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/al-ict-2020.pdf' },
        { title: 'O/L ICT 2024 Model Paper', paper_type: 'MODEL_PAPER', grade: 11, year: 2024, subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/ol-model-2024.pdf' },
        { title: 'A/L ICT Model Paper 2026', paper_type: 'MODEL_PAPER', grade: 13, year: 2026, subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/al-model-2026.pdf' },
        { title: 'Royal College 1st Term 2024', paper_type: 'SCHOOL_EXAM', grade: 12, year: 2024, term: 1, school_or_zone: 'Royal College', subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/royal-2024-t1.pdf' },
        { title: 'Ananda College 2nd Term 2024', paper_type: 'SCHOOL_EXAM', grade: 12, year: 2024, term: 2, school_or_zone: 'Ananda College', subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/ananda-2024-t2.pdf' },
        { title: 'Visakha Vidyalaya 1st Term 2023', paper_type: 'SCHOOL_EXAM', grade: 12, year: 2023, term: 1, school_or_zone: 'Visakha Vidyalaya', subject: 'ICT', medium: 'SINHALA', is_free: false, pdf_url: 'https://example.com/visakha-2023.pdf' },
        { title: 'Colombo Zone 2023 Combined Exam', paper_type: 'SCHOOL_EXAM', grade: 13, year: 2023, term: 2, school_or_zone: 'Colombo Zone', subject: 'ICT', medium: 'ENGLISH', is_free: false, pdf_url: 'https://example.com/colombo-zone-2023.pdf' },
      ]);

      // ── 6. SYLLABUS LESSONS ──────────────────────────────────────
      const syllabusSections = [
        { title: 'Information and Communication Technology', grade: 13, subject: 'ICT', sort_order: 1 },
        { title: 'Data and Information', grade: 13, subject: 'ICT', sort_order: 2 },
        { title: 'Hardware and Software', grade: 13, subject: 'ICT', sort_order: 3 },
        { title: 'Networking and Internet', grade: 13, subject: 'ICT', sort_order: 4 },
        { title: 'Programming Concepts', grade: 13, subject: 'ICT', sort_order: 5 },
        { title: 'Database Management', grade: 13, subject: 'ICT', sort_order: 6 },
        { title: 'System Analysis and Design', grade: 13, subject: 'ICT', sort_order: 7 },
        { title: 'Web Technologies', grade: 13, subject: 'ICT', sort_order: 8 },
      ];

      const { data: syllabus } = await supabase.from('syllabus_lessons').insert(syllabusSections).select();

      // Sub-lessons
      if (syllabus && syllabus.length > 0) {
        const subLessons = [];
        const subMap: Record<string, string[]> = {
          'Information and Communication Technology': ['History of ICT', 'Impact of ICT on Society', 'E-Commerce and E-Business'],
          'Data and Information': ['Data Types and Representations', 'Number Systems', 'Data Encoding (ASCII, Unicode)', 'Data Compression'],
          'Hardware and Software': ['Input/Output Devices', 'Storage Devices', 'CPU and Memory', 'Operating Systems', 'Application Software'],
          'Networking and Internet': ['Network Topologies', 'OSI Model and TCP/IP', 'IP Addressing', 'Internet Services', 'Network Security'],
          'Programming Concepts': ['Algorithms and Flowcharts', 'Variables and Data Types', 'Control Structures', 'Functions and Procedures', 'Object-Oriented Programming', 'Python Basics'],
          'Database Management': ['Database Concepts', 'ER Diagrams', 'SQL Fundamentals', 'Normalization', 'Transactions and Concurrency'],
          'System Analysis and Design': ['SDLC Phases', 'Requirements Analysis', 'UML Diagrams', 'Testing Strategies'],
          'Web Technologies': ['HTML and CSS', 'JavaScript Basics', 'Client-Server Architecture', 'Web Security'],
        };
        for (const parent of syllabus) {
          const subs = subMap[parent.title] || [];
          subs.forEach((title, i) => {
            subLessons.push({ title, parent_id: parent.id, grade: 13, subject: 'ICT', sort_order: i + 1 });
          });
        }
        await supabase.from('syllabus_lessons').insert(subLessons);
      }

      // ── 7. QUESTION BANK ──────────────────────────────────────────
      const { data: allSyllabus } = await supabase.from('syllabus_lessons').select('id, title').is('parent_id', null);
      const lessonIds = (allSyllabus || []).map(l => l.id);

      const mcqQuestions = [
        { question_text: 'What does CPU stand for?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE' },
        { question_text: 'Which of the following is a primary memory?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE' },
        { question_text: 'What is the binary representation of decimal 10?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATA' },
        { question_text: 'Which protocol is used for sending emails?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'What does HTML stand for?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'WEB' },
        { question_text: 'Which layer of the OSI model handles routing?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'What is the time complexity of binary search?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'PROGRAMMING' },
        { question_text: 'Which SQL command is used to retrieve data?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        { question_text: 'What is a foreign key in a relational database?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        { question_text: 'Which data structure uses LIFO principle?', correct_option_no: 4, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'PROGRAMMING' },
        { question_text: 'What does DNS stand for?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'Which generation of computers used vacuum tubes?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HISTORY' },
        { question_text: 'What is the hexadecimal value of decimal 255?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATA' },
        { question_text: 'Which of the following is NOT an input device?', correct_option_no: 4, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE' },
        { question_text: 'In OOP, what is encapsulation?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'PROGRAMMING' },
        { question_text: 'Which topology connects all devices to a central hub?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'What does DBMS stand for?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        { question_text: 'Which phase of SDLC involves creating DFDs?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'SYSTEMS' },
        { question_text: 'What is the purpose of a cache memory?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE' },
        { question_text: 'Which normal form eliminates transitive dependencies?', correct_option_no: 4, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        // Sinhala medium
        { question_text: 'CPU යන්නෙහි සම්පූර්ණ නාමය කුමක්ද?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'HARDWARE' },
        { question_text: 'ද්වීමය ක්‍රමයේ 1010 දශමය අගය කොපමණද?', correct_option_no: 2, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'DATA' },
        { question_text: 'IP ලිපිනය සඳහා කොතෙකුත් bits ගනනාවක් ද?', correct_option_no: 3, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'NETWORKING' },
        { question_text: 'HTML හි < table > හි tbody නොමැති විට HTML Valid ද?', correct_option_no: 1, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'WEB' },
        { question_text: 'Database Normalization හි 1NF නිර්ණය කිරීමේ නිර්ණය කුමක්ද?', correct_option_no: 4, question_type: 'MCQ', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'DATABASE' },
        // Short essay
        { question_text: 'Explain the difference between RAM and ROM with examples.', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HARDWARE' },
        { question_text: 'Describe the OSI model and the function of each layer.', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'Explain the concept of normalization in database design.', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        { question_text: 'Describe the phases of the Software Development Life Cycle (SDLC).', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'SYSTEMS' },
        { question_text: 'What is object-oriented programming? Explain with an example.', correct_option_no: null, question_type: 'SHORT_ESSAY', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'PROGRAMMING' },
        // Essays
        { question_text: 'Discuss the impact of ICT on education, healthcare, and banking in Sri Lanka.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'SOCIAL' },
        { question_text: 'Explain the concept of cloud computing and its advantages and disadvantages.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'NETWORKING' },
        { question_text: 'Describe database management systems and how they are used in modern applications.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'DATABASE' },
        { question_text: 'Explain network security threats and the measures used to protect against them.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'SINHALA', category: 'NETWORKING' },
        { question_text: 'Describe the history of computers and the evolution of computing technology.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'HISTORY' },
        { question_text: 'Discuss algorithms, flowcharts, and pseudocode with practical examples.', correct_option_no: null, question_type: 'ESSAY', grade: 13, subject: 'ICT', medium: 'ENGLISH', category: 'PROGRAMMING' },
      ];

      // Attach lesson_ids to questions
      const questionsToInsert = mcqQuestions.map((q, i) => ({
        ...q,
        lesson_id: lessonIds.length > 0 ? lessonIds[i % lessonIds.length] : null,
      }));

      const { data: insertedQuestions } = await supabase.from('question_bank').insert(questionsToInsert).select();

      // Add options to MCQ questions
      const mcqOptionSets: Record<number, { texts: string[]; correct: number }> = {
        0: { texts: ['Central Processing Unit', 'Computer Processing Unit', 'Central Program Unit', 'Core Processing Unit'], correct: 1 },
        1: { texts: ['Hard Disk', 'RAM', 'CD-ROM', 'Flash Drive'], correct: 2 },
        2: { texts: ['0101', '1001', '1010', '1100'], correct: 3 },
        3: { texts: ['SMTP', 'FTP', 'HTTP', 'POP3'], correct: 1 },
        4: { texts: ['Hyper Terminal Markup Language', 'HyperText Markup Language', 'Hyperlink Text Markup Language', 'High-level Text Markup Language'], correct: 2 },
        5: { texts: ['Physical', 'Data Link', 'Network', 'Transport'], correct: 3 },
        6: { texts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correct: 2 },
        7: { texts: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], correct: 1 },
        8: { texts: ['A key that uniquely identifies each row', 'A key linking two tables', 'A key that references a primary key in another table', 'A composite key'], correct: 3 },
        9: { texts: ['Queue', 'Array', 'Linked List', 'Stack'], correct: 4 },
        10: { texts: ['Data Network System', 'Domain Name System', 'Dynamic Network Service', 'Default Name Server'], correct: 2 },
        11: { texts: ['First', 'Second', 'Third', 'Fourth'], correct: 1 },
        12: { texts: ['FA', 'FE', 'FF', '100'], correct: 3 },
        13: { texts: ['Keyboard', 'Mouse', 'Scanner', 'Monitor'], correct: 4 },
        14: { texts: ['Hiding complex implementation', 'Bundling data and methods together', 'Inheriting from a parent class', 'Supporting multiple forms'], correct: 2 },
        15: { texts: ['Star', 'Bus', 'Ring', 'Mesh'], correct: 1 },
        16: { texts: ['Data Building Management System', 'Database Backup Management System', 'Database Management System', 'Digital Binary Management System'], correct: 3 },
        17: { texts: ['Planning', 'Analysis', 'Design', 'Implementation'], correct: 2 },
        18: { texts: ['To provide fast temporary storage between CPU and RAM', 'To store permanent data', 'To run the operating system', 'To connect to the internet'], correct: 1 },
        19: { texts: ['1NF', '2NF', 'BCNF', '3NF'], correct: 4 },
        20: { texts: ['Central Processing Unit', 'Computer Processing Unit', 'Core Program Unit', 'Control Processing Unit'], correct: 1 },
        21: { texts: ['8', '10', '12', '16'], correct: 2 },
        22: { texts: ['16 bits', '32 bits', '64 bits', '128 bits'], correct: 3 },
        23: { texts: ['ඔව්', 'නැත', 'සමහර විට', 'HTML5 පමණි'], correct: 1 },
        24: { texts: ['Repeating groups නොතිබීම', 'Atomic values', 'Primary key ඇතිවීම', 'සියල්ල'], correct: 4 },
      };

      const optionsToInsert = [];
      for (const q of insertedQuestions || []) {
        const idx = questionsToInsert.findIndex(orig => orig.question_text === q.question_text);
        if (q.question_type === 'MCQ' && mcqOptionSets[idx]) {
          const set = mcqOptionSets[idx];
          for (let o = 0; o < 4; o++) {
            optionsToInsert.push({
              question_id: q.id,
              option_no: o + 1,
              option_text: set.texts[o],
              is_correct: (o + 1) === set.correct,
            });
          }
        }
      }
      if (optionsToInsert.length > 0) {
        await supabase.from('question_bank_options').insert(optionsToInsert);
      }

      // ── 8. CLASSES ────────────────────────────────────────────────
      const classesData = [
        { title: 'A/L ICT Theory 2026', description: 'Full theory syllabus for A/L ICT. Covers all 8 units with structured notes, past papers, and weekly practice tests.', grade_min: 12, grade_max: 13, monthly_fee_amount: 2500, is_private: false },
        { title: 'O/L ICT Revision 2025', description: 'Intensive revision course covering all G.C.E O/L ICT topics with exam technique and model papers.', grade_min: 10, grade_max: 11, monthly_fee_amount: 2000, is_private: false },
        { title: 'Grade 10 ICT Foundation', description: 'Foundation course for Grade 10 students preparing for O/L. Builds strong conceptual understanding.', grade_min: 10, grade_max: 10, monthly_fee_amount: 1500, is_private: false },
        { title: 'Advanced Programming Batch', description: 'Python, Java, and web development for advanced students. Project-based learning with code reviews.', grade_min: 11, grade_max: 13, monthly_fee_amount: 3500, is_private: true, private_code: 'PROG2026' },
      ];

      const { data: classes } = await supabase.from('classes').insert(classesData).select();

      // Class months (last 2 + current)
      const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
      const classMonthsData: any[] = [];
      for (const cls of classes || []) {
        for (const month of months) {
          classMonthsData.push({ class_id: cls.id, year_month: month });
        }
      }
      const { data: classMonths } = await supabase.from('class_months').insert(classMonthsData).select();

      // Class days with realistic schedules
      const classDaysData: any[] = [];
      for (const cm of classMonths || []) {
        const base = new Date(cm.year_month + '-01');
        classDaysData.push(
          { class_month_id: cm.id, date: new Date(base.getTime() + 5 * 86400000).toISOString().split('T')[0], title: 'Theory Session 1', start_time: '09:00', end_time: '11:30', is_extra: false, is_conducted: true },
          { class_month_id: cm.id, date: new Date(base.getTime() + 12 * 86400000).toISOString().split('T')[0], title: 'Theory Session 2', start_time: '09:00', end_time: '11:30', is_extra: false, is_conducted: true },
          { class_month_id: cm.id, date: new Date(base.getTime() + 19 * 86400000).toISOString().split('T')[0], title: 'Theory Session 3', start_time: '14:00', end_time: '16:30', is_extra: false, is_conducted: false },
          { class_month_id: cm.id, date: new Date(base.getTime() + 26 * 86400000).toISOString().split('T')[0], title: 'Monthly Revision', start_time: '10:00', end_time: '12:30', is_extra: true, is_conducted: false }
        );
      }
      await supabase.from('class_days').insert(classDaysData);

      // Seed lessons for conducted days
      const { data: conductedDays } = await supabase.from('class_days').select('id, title').eq('is_conducted', true).limit(20);
      const lessonTopics = [
        { title: 'Introduction to ICT & History of Computers', description: 'Covers the evolution of computing from 1st to 5th generation, ICT applications, and societal impact.', notes_text: 'Key points: Generations of computers, Input/Output devices, memory hierarchy.' },
        { title: 'Number Systems & Data Representation', description: 'Binary, Octal, Hexadecimal conversions and BCD, ASCII, Unicode encoding.', notes_text: 'Practice conversions: Binary↔Decimal, Hex↔Decimal, 2\'s complement.' },
        { title: 'Hardware Components Deep Dive', description: 'CPU architecture, memory types (RAM, ROM, Cache), storage devices and their characteristics.', notes_text: 'Focus on clock speed, bus width, and cache hierarchy.' },
        { title: 'Networking Fundamentals', description: 'Network types (LAN, WAN, MAN), topologies, OSI model, TCP/IP protocol suite.', notes_text: 'OSI 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.' },
        { title: 'Programming with Python', description: 'Variables, data types, control structures, functions, and file I/O in Python.', notes_text: 'Code examples: loops, list comprehensions, exception handling.' },
        { title: 'Database Design & SQL', description: 'ER diagrams, relational model, SQL DDL & DML commands, normalization (1NF–3NF).', notes_text: 'SQL: SELECT, INSERT, UPDATE, DELETE, JOIN operations.' },
        { title: 'System Analysis & UML', description: 'SDLC phases, requirements gathering, use case diagrams, DFDs, class diagrams.', notes_text: 'SDLC: Planning→Analysis→Design→Implementation→Testing→Maintenance.' },
        { title: 'Web Technologies & Security', description: 'HTML5, CSS3, JavaScript basics, HTTP/HTTPS, cybersecurity threats and countermeasures.', notes_text: 'Security: Encryption, firewalls, VPN, authentication methods.' },
      ];

      const lessonsToInsert: any[] = [];
      for (let i = 0; i < (conductedDays || []).length; i++) {
        const day = conductedDays![i];
        const topic = lessonTopics[i % lessonTopics.length];
        lessonsToInsert.push({ class_day_id: day.id, ...topic, youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      }
      await supabase.from('lessons').insert(lessonsToInsert);

      // Class papers for first class
      if (classes && classes.length > 0) {
        await supabase.from('class_papers').insert([
          { class_id: classes[0].id, title: 'January Daily Paper 1', paper_type: 'DAILY', description: 'First daily paper covering Unit 1 and Unit 2', pdf_url: 'https://example.com/daily-jan-1.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
          { class_id: classes[0].id, title: 'January Daily Paper 2', paper_type: 'DAILY', description: 'Second daily paper covering networking basics', pdf_url: 'https://example.com/daily-jan-2.pdf', answer_pdf_url: 'https://example.com/daily-jan-2-ans.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
          { class_id: classes[0].id, title: 'January Weekly Paper', paper_type: 'WEEKLY', description: 'Weekly comprehensive test on all topics covered in January', pdf_url: 'https://example.com/weekly-jan.pdf', review_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', answer_pdf_url: 'https://example.com/weekly-jan-ans.pdf', publish_status: 'PUBLISHED', published_at: new Date().toISOString() },
          { class_id: classes[0].id, title: 'February Daily Paper 1', paper_type: 'DAILY', pdf_url: 'https://example.com/daily-feb-1.pdf', publish_status: 'DRAFT' },
        ]);
      }

      // ── 9. RANK PAPERS ────────────────────────────────────────────
      const rankPapersData = [
        { title: 'ICT Ranking Test — January 2026', grade: 13, time_limit_minutes: 60, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 200, unlock_at: '2026-01-15T08:00:00Z', lock_at: '2026-01-31T23:59:00Z' },
        { title: 'Comprehensive ICT Assessment — February 2026', grade: 13, time_limit_minutes: 90, has_mcq: true, has_short_essay: true, has_essay: false, publish_status: 'PUBLISHED', fee_amount: 300 },
        { title: 'O/L ICT Practice Ranking', grade: 11, time_limit_minutes: 45, has_mcq: true, has_short_essay: false, has_essay: false, publish_status: 'DRAFT', fee_amount: 150 },
        { title: 'Full ICT Paper Simulation — March 2026', grade: 13, time_limit_minutes: 180, has_mcq: true, has_short_essay: true, has_essay: true, publish_status: 'DRAFT', fee_amount: 500 },
      ];

      const { data: rankPapers } = await supabase.from('rank_papers').insert(rankPapersData).select();

      for (const paper of rankPapers || []) {
        if (paper.has_mcq) {
          const questionCount = paper.time_limit_minutes >= 90 ? 10 : 5;
          const mcqQs = [
            'Which of the following best describes RAM?',
            'What is the primary function of an operating system?',
            'In binary, what is 1111 in decimal?',
            'Which protocol operates at the Application layer of the OSI model?',
            'What does SQL stand for?',
            'Which data structure is best for implementing undo operations?',
            'What is the purpose of a subnet mask?',
            'Which of these is NOT a feature of Object-Oriented Programming?',
            'What does HTTP status code 404 mean?',
            'Which sorting algorithm has the best average-case complexity?',
          ];
          const mcqAnswers = [2, 3, 4, 1, 2, 4, 1, 3, 2, 1];
          const optionSets = [
            ['Permanent storage', 'Temporary volatile storage', 'Permanent non-volatile storage', 'Secondary storage'],
            ['Manage files', 'Execute user programs', 'Manage hardware resources and provide services', 'Connect to internet'],
            ['13', '14', '15', '16'],
            ['TCP', 'HTTP', 'IP', 'Ethernet'],
            ['Standard Query Language', 'Structured Query Language', 'Simple Query Language', 'Sequential Query Language'],
            ['Array', 'Queue', 'Tree', 'Stack'],
            ['To encrypt data', 'To identify the network portion of an IP address', 'To assign IP addresses', 'To route packets'],
            ['Encapsulation', 'Inheritance', 'Polymorphism', 'Compilation'],
            ['Server Error', 'Redirect', 'Not Found', 'Unauthorized'],
            ['Merge Sort', 'Bubble Sort', 'Selection Sort', 'Insertion Sort'],
          ];

          for (let i = 0; i < questionCount; i++) {
            const { data: q } = await supabase.from('rank_mcq_questions').insert({
              rank_paper_id: paper.id,
              q_no: i + 1,
              question_text: mcqQs[i % mcqQs.length],
            }).select().single();

            if (q) {
              const opts = optionSets[i % optionSets.length];
              const correctNo = mcqAnswers[i % mcqAnswers.length];
              await supabase.from('rank_mcq_options').insert(
                opts.map((text, oi) => ({ question_id: q.id, option_no: oi + 1, option_text: text, is_correct: (oi + 1) === correctNo }))
              );
            }
          }
        }
      }

      // ── 10. GENERATED PAPERS ──────────────────────────────────────
      const mcqQIds = (insertedQuestions || []).filter(q => q.question_type === 'MCQ').slice(0, 10).map(q => ({ id: q.id, correct_option_no: q.correct_option_no }));
      const essayQIds = (insertedQuestions || []).filter(q => q.question_type !== 'MCQ').slice(0, 7).map(q => ({ id: q.id, correct_option_no: null }));
      const allQIds = [...mcqQIds, ...essayQIds];

      const paperIds = ['DAILY-' + Date.now(), 'FULL-' + (Date.now() + 1)];
      await supabase.from('generated_papers').insert([
        {
          id: paperIds[0],
          user_id: user.id,
          grade: 13,
          paper_type: 'DAILY',
          mcq_count: 10,
          short_essay_count: 0,
          essay_count: 1,
          lesson_weights: [],
          question_ids: allQIds.slice(0, 11),
        },
        {
          id: paperIds[1],
          user_id: user.id,
          grade: 13,
          paper_type: 'FULL',
          mcq_count: Math.min(20, mcqQIds.length),
          short_essay_count: Math.min(2, essayQIds.filter((_,i) => i < 2).length),
          essay_count: Math.min(5, essayQIds.length),
          lesson_weights: [],
          question_ids: allQIds,
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Database seeded with comprehensive dummy data! Classes, lessons, question bank, papers, rank papers and generated papers are ready.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seed/Clear error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
