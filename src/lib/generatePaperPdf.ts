import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

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

// Wrap text and return lines
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
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

  // ── Build PDF with jsPDF ──────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 20;
  const contentWidth = pageW - marginLeft - marginRight;
  let y = marginTop;

  const addPageIfNeeded = (neededHeight: number) => {
    if (y + neededHeight > pageH - marginBottom - 10) {
      doc.addPage();
      y = marginTop;
      // Draw footer on the new page before continuing
      drawFooter();
    }
  };

  const drawFooter = () => {
    const footerY = pageH - 10;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footerText = footer
      ? `${footer} | Paper ID: ${paperId}`
      : `Paper ID: ${paperId}`;
    doc.text(footerText, pageW / 2, footerY, { align: 'center' });
    doc.setDrawColor(180, 180, 180);
    doc.line(marginLeft, footerY - 3, pageW - marginRight, footerY - 3);
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(schoolName, pageW / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${gradeLabel} — ${paperLabel}`, pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${now}`, marginLeft, y);
  doc.text(`Time: ${timeLabel}`, pageW / 2, y, { align: 'center' });
  doc.text(`Paper ID: ${paperId}`, pageW - marginRight, y, { align: 'right' });
  y += 5;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageW - marginRight, y);
  y += 5;

  // ── Instructions ──────────────────────────────────────────────────────────
  if (instructions) {
    addPageIfNeeded(12);
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    const instrLines = wrapText(doc, `Instructions: ${instructions}`, contentWidth - 8);
    const instrH = instrLines.length * 4.5 + 6;
    doc.roundedRect(marginLeft, y, contentWidth, instrH, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    instrLines.forEach((line, i) => {
      doc.text(line, marginLeft + 4, y + 5 + i * 4.5);
    });
    y += instrH + 5;
  }

  const mcqs = questions.filter(q => q.question_type === 'MCQ');
  const shortEssays = questions.filter(q => q.question_type === 'SHORT_ESSAY');
  const essays = questions.filter(q => q.question_type !== 'MCQ' && q.question_type !== 'SHORT_ESSAY');

  let qNo = 1;

  // ── Section A: MCQ ────────────────────────────────────────────────────────
  if (mcqs.length > 0) {
    addPageIfNeeded(10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Section A — Multiple Choice Questions (${mcqs.length} marks)`, marginLeft, y);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y + 1.5, pageW - marginRight, y + 1.5);
    y += 8;

    for (const q of mcqs) {
      const questionText = q.question_text || '';
      const qLines = wrapText(doc, `${qNo}. ${questionText}`, contentWidth);
      const optionLines = q.options.flatMap((o, i) =>
        wrapText(doc, `   ${String.fromCharCode(65 + i)}. ${o.option_text || ''}`, contentWidth / 2 - 5)
      );
      const blockH = qLines.length * 4.5 + Math.ceil(q.options.length / 2) * 4.5 + 6;

      addPageIfNeeded(blockH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      qLines.forEach((line, i) => {
        doc.text(line, marginLeft, y + i * 4.5);
      });
      y += qLines.length * 4.5 + 2;

      // Options in 2 columns
      const optPairs: QuestionOption[][] = [];
      for (let i = 0; i < q.options.length; i += 2) {
        optPairs.push(q.options.slice(i, i + 2));
      }
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      for (const pair of optPairs) {
        pair.forEach((o, col) => {
          const optText = `${String.fromCharCode(65 + q.options.indexOf(o))}. ${o.option_text || ''}`;
          const colX = marginLeft + 8 + col * (contentWidth / 2);
          const optLines2 = wrapText(doc, optText, contentWidth / 2 - 8);
          optLines2.forEach((line, li) => doc.text(line, colX, y + li * 4.2));
        });
        y += 4.5;
      }
      y += 4;
      qNo++;
    }
  }

  // ── Section B: Short Essay ────────────────────────────────────────────────
  if (shortEssays.length > 0) {
    addPageIfNeeded(10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Section B — Structured Essay Questions', marginLeft, y);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y + 1.5, pageW - marginRight, y + 1.5);
    y += 8;

    for (const q of shortEssays) {
      const questionText = q.question_text || '';
      const qLines = wrapText(doc, `${qNo}. ${questionText}`, contentWidth);
      addPageIfNeeded(qLines.length * 4.5 + 8 * 6 + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      qLines.forEach((line, i) => doc.text(line, marginLeft, y + i * 4.5));
      y += qLines.length * 4.5 + 3;

      // Answer lines
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      for (let i = 0; i < 8; i++) {
        doc.line(marginLeft, y + i * 6, pageW - marginRight, y + i * 6);
      }
      y += 8 * 6 + 5;
      qNo++;
    }
  }

  // ── Section C: Essay ──────────────────────────────────────────────────────
  if (essays.length > 0) {
    addPageIfNeeded(10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Section C — Essay Questions', marginLeft, y);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y + 1.5, pageW - marginRight, y + 1.5);
    y += 8;

    for (const q of essays) {
      const questionText = q.question_text || '';
      const qLines = wrapText(doc, `${qNo}. ${questionText}`, contentWidth);
      addPageIfNeeded(qLines.length * 4.5 + 15 * 6 + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      qLines.forEach((line, i) => doc.text(line, marginLeft, y + i * 4.5));
      y += qLines.length * 4.5 + 3;

      // Answer lines
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      for (let i = 0; i < 15; i++) {
        doc.line(marginLeft, y + i * 6, pageW - marginRight, y + i * 6);
      }
      y += 15 * 6 + 5;
      qNo++;
    }
  }

  // Draw footer on last page
  drawFooter();

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`paper-${paperId}.pdf`);
}
