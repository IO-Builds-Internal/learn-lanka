import { supabase } from '@/integrations/supabase/client';

const GRADES = [
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'G.C.E A/L (Grade 12 & 13)' },
];

const PAPER_CONFIGS: Record<string, { label: string; time: string }> = {
  DAILY: { label: 'Daily Paper', time: '30 min' },
  FULL: { label: 'Full Paper', time: '3 hours' },
};

interface QuestionOption {
  option_no: number;
  option_text: string | null;
  option_image_url: string | null;
  is_correct: boolean;
}

interface PaperQuestion {
  id: string;
  question_text: string | null;
  question_image_url: string | null;
  question_type: string;
  correct_option_no: number | null;
  options_image_url: string | null;
  explain_video_url: string | null;
  options: QuestionOption[];
}

export async function downloadGeneratedPaperPdf(params: {
  paperId: string;
  grade: number;
  paperType: string;
  questionIds: Array<{ id: string; correct_option_no: number | null }>;
}) {
  const { paperId, grade, paperType, questionIds } = params;

  // Fetch template settings
  const { data: settingsData } = await (supabase as any)
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'paper_template_school_name',
      `paper_template_instructions_${paperType.toLowerCase()}`,
      'paper_template_footer',
      'site_name',
    ]);

  const settings: Record<string, string> = {};
  settingsData?.forEach((s: any) => { settings[s.key] = s.value; });

  const schoolName = settings['paper_template_school_name'] || settings['site_name'] || 'ICT Academy';
  const instructions = settings[`paper_template_instructions_${paperType.toLowerCase()}`] || '';
  const footer = settings['paper_template_footer'] || '';

  // Fetch full question data
  const ids = questionIds.map(q => q.id);
  const { data: questionsRaw, error } = await supabase
    .from('question_bank')
    .select(`
      id, question_text, question_image_url, question_type,
      correct_option_no, options_image_url, explain_video_url,
      question_bank_options(option_no, option_text, option_image_url, is_correct)
    `)
    .in('id', ids);

  if (error) throw error;

  // Preserve original question order
  const questionsMap: Record<string, any> = {};
  (questionsRaw || []).forEach(q => { questionsMap[q.id] = q; });
  const questions: PaperQuestion[] = questionIds
    .map(qi => {
      const q = questionsMap[qi.id];
      if (!q) return null;
      return {
        ...q,
        options: ((q as any).question_bank_options || []).sort((a: any, b: any) => a.option_no - b.option_no),
      };
    })
    .filter(Boolean) as PaperQuestion[];

  const gradeLabel = GRADES.find(g => g.value === String(grade))?.label || `Grade ${grade}`;
  const paperLabel = PAPER_CONFIGS[paperType]?.label || paperType;
  const timeLabel = PAPER_CONFIGS[paperType]?.time || '';
  const now = new Date().toLocaleDateString('en-LK');

  const mcqs = questions.filter(q => q.question_type === 'MCQ');
  const shortEssays = questions.filter(q => q.question_type === 'SHORT_ESSAY');
  const essays = questions.filter(q => q.question_type !== 'MCQ' && q.question_type !== 'SHORT_ESSAY');

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; color: #000; font-size: 12pt; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
    .header h1 { font-size: 18pt; margin: 0 0 4px; }
    .header h2 { font-size: 13pt; margin: 0 0 4px; font-weight: normal; }
    .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #444; margin-top: 6px; }
    .instructions { background: #f5f5f5; border: 1px solid #ccc; padding: 8px 12px; margin: 12px 0; font-size: 10pt; }
    .section-title { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #000; margin: 20px 0 12px; padding-bottom: 4px; }
    .question { margin-bottom: 14px; page-break-inside: avoid; }
    .question-no { font-weight: bold; }
    .options { margin: 6px 0 6px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .option { display: flex; gap: 8px; }
    .q-img { max-width: 100%; max-height: 120px; margin: 6px 0; }
    .essay-lines { margin-top: 8px; }
    .essay-line { border-bottom: 1px solid #ccc; height: 22px; margin-bottom: 2px; }
    .footer { position: fixed; bottom: 10mm; left: 20mm; right: 20mm; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <div class="page">
  <div class="header">
    <h1>${schoolName}</h1>
    <h2>${gradeLabel} — ${paperLabel}</h2>
    <div class="meta">
      <span>Date: ${now}</span>
      <span>Time: ${timeLabel}</span>
      <span>Paper ID: ${paperId}</span>
    </div>
  </div>`;

  if (instructions) {
    html += `<div class="instructions"><strong>Instructions:</strong> ${instructions}</div>`;
  }

  let qNo = 1;

  if (mcqs.length > 0) {
    html += `<div class="section-title">Section A — Multiple Choice Questions (${mcqs.length} marks)</div>`;
    mcqs.forEach(q => {
      html += `<div class="question">
        <span class="question-no">${qNo++}.</span> ${q.question_text || ''}
        ${q.question_image_url ? `<br><img class="q-img" src="${q.question_image_url}" />` : ''}
        <div class="options">
          ${(q.options || []).map((o, i) => `
            <div class="option">
              <span>${String.fromCharCode(65 + i)}.</span>
              <span>${o.option_text || ''}</span>
            </div>`).join('')}
        </div>
      </div>`;
    });
  }

  if (shortEssays.length > 0) {
    html += `<div class="section-title">Section B — Structured Essay Questions</div>`;
    shortEssays.forEach(q => {
      html += `<div class="question">
        <span class="question-no">${qNo++}.</span> ${q.question_text || ''}
        ${q.question_image_url ? `<br><img class="q-img" src="${q.question_image_url}" />` : ''}
        <div class="essay-lines">${Array(8).fill('<div class="essay-line"></div>').join('')}</div>
      </div>`;
    });
  }

  if (essays.length > 0) {
    html += `<div class="section-title">Section C — Essay Questions</div>`;
    essays.forEach(q => {
      html += `<div class="question">
        <span class="question-no">${qNo++}.</span> ${q.question_text || ''}
        ${q.question_image_url ? `<br><img class="q-img" src="${q.question_image_url}" />` : ''}
        <div class="essay-lines">${Array(15).fill('<div class="essay-line"></div>').join('')}</div>
      </div>`;
    });
  }

  if (footer) {
    html += `<div class="footer">${footer} &nbsp;|&nbsp; Paper ID: ${paperId}</div>`;
  }

  html += `</div></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }
}
