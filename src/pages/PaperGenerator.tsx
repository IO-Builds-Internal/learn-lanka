import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Wand2, Download,
  BookOpen, Loader2, Info, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import StudentLayout from '@/components/layouts/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ── types ────────────────────────────────────────────────────────────────────
interface LessonItem {
  id: string;
  title: string;
  parent_id: string | null;
}

interface WeightedLesson {
  lessonId: string;
  lessonTitle: string;
  weight: number; // 1-5
}

interface GeneratedQuestion {
  id: string;
  question_text: string | null;
  question_image_url: string | null;
  question_type: string;
  correct_option_no: number | null;
  options_image_url: string | null;
  options: Array<{ option_no: number; option_text: string | null; option_image_url: string | null; is_correct: boolean }>;
  lesson_id: string | null;
  explain_video_url: string | null;
}

const GRADES = [
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'G.C.E A/L (Grade 12 & 13)' },
];

// Daily: 10 MCQ + 1 essay
// Full: 50 MCQ + 4 short essay + 6 essay
const PAPER_CONFIGS = {
  DAILY: { mcq: 10, short_essay: 0, essay: 1, label: 'Daily Paper', time: '30 min' },
  FULL:  { mcq: 50, short_essay: 4, essay: 6, label: 'Full Paper',  time: '3 hours' },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function generatePaperId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'GP-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function weightedSample<T>(pool: T[], weighted: { item: T; weight: number }[], count: number): T[] {
  if (pool.length <= count) return [...pool].sort(() => Math.random() - 0.5);
  const result: T[] = [];
  const available = [...pool];
  while (result.length < count && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    result.push(available.splice(idx, 1)[0]);
  }
  return result;
}

// ── component ────────────────────────────────────────────────────────────────
const PaperGenerator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Config state
  const [selectedGrade, setSelectedGrade] = useState<string>('12');
  const [paperType, setPaperType] = useState<'DAILY' | 'FULL'>('DAILY');
  const [selectedLessons, setSelectedLessons] = useState<WeightedLesson[]>([]);
  const [lessonSearch, setLessonSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<{ id: string; questions: GeneratedQuestion[] } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Fetch lessons for grade
  const gradeParam = selectedGrade === '12' ? [12, 13] : [parseInt(selectedGrade)];
  const { data: allLessons = [] } = useQuery({
    queryKey: ['syllabus-lessons-for-gen', selectedGrade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syllabus_lessons')
        .select('id, title, parent_id')
        .in('grade', gradeParam)
        .order('sort_order');
      if (error) throw error;
      return data as LessonItem[];
    },
  });

  const filteredLessons = allLessons.filter(l =>
    l.title.toLowerCase().includes(lessonSearch.toLowerCase()) &&
    !selectedLessons.find(s => s.lessonId === l.id)
  );

  const addLesson = (lesson: LessonItem) => {
    setSelectedLessons(prev => [...prev, { lessonId: lesson.id, lessonTitle: lesson.title, weight: 3 }]);
  };

  const removeLesson = (lessonId: string) => {
    setSelectedLessons(prev => prev.filter(l => l.lessonId !== lessonId));
  };

  const updateWeight = (lessonId: string, weight: number) => {
    setSelectedLessons(prev => prev.map(l => l.lessonId === lessonId ? { ...l, weight } : l));
  };

  const config = PAPER_CONFIGS[paperType];
  const totalWeight = selectedLessons.reduce((s, l) => s + l.weight, 0);

  const generatePaper = async () => {
    if (!user) { toast.error('Please log in first'); return; }
    if (selectedLessons.length === 0) { toast.error('Please add at least one lesson'); return; }
    setGenerating(true);
    try {
      // Fetch questions from selected lessons
      const lessonIds = selectedLessons.map(l => l.lessonId);
      const { data: allQs, error } = await supabase
        .from('question_bank')
        .select(`
          id, question_text, question_image_url, question_type,
          correct_option_no, options_image_url, lesson_id, explain_video_url,
          question_bank_options(option_no, option_text, option_image_url, is_correct)
        `)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      if (!allQs || allQs.length === 0) {
        toast.error('No questions found for selected lessons. Please add questions to the question bank first.');
        return;
      }

      const mcqPool = (allQs as any[]).filter(q => q.question_type === 'MCQ');
      const essayPool = (allQs as any[]).filter(q => q.question_type !== 'MCQ');

      // Weighted pick of MCQs
      const pickedMcq: typeof mcqPool = [];
      const lessonMcqMap: Record<string, typeof mcqPool> = {};
      selectedLessons.forEach(l => {
        lessonMcqMap[l.lessonId] = mcqPool.filter(q => q.lesson_id === l.lessonId);
      });

      if (totalWeight > 0 && config.mcq > 0) {
        selectedLessons.forEach(l => {
          const share = Math.round((l.weight / totalWeight) * config.mcq);
          const pool = lessonMcqMap[l.lessonId];
          const picked = pool.sort(() => Math.random() - 0.5).slice(0, share);
          pickedMcq.push(...picked);
        });
        // fill up to config.mcq if rounding left us short
        const remaining = mcqPool.filter(q => !pickedMcq.find(p => p.id === q.id));
        while (pickedMcq.length < config.mcq && remaining.length > 0) {
          const idx = Math.floor(Math.random() * remaining.length);
          pickedMcq.push(remaining.splice(idx, 1)[0]);
        }
      }
      const finalMcq = pickedMcq.slice(0, config.mcq).sort(() => Math.random() - 0.5);

      // Essays (random)
      const shuffledEssay = essayPool.sort(() => Math.random() - 0.5);
      const shortEssays = shuffledEssay.slice(0, config.short_essay);
      const essays = shuffledEssay.slice(config.short_essay, config.short_essay + config.essay);

      const questions: GeneratedQuestion[] = [
        ...finalMcq,
        ...shortEssays,
        ...essays,
      ].map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_image_url: q.question_image_url,
        question_type: q.question_type,
        correct_option_no: q.correct_option_no,
        options_image_url: q.options_image_url,
        lesson_id: q.lesson_id,
        explain_video_url: q.explain_video_url,
        options: (q.question_bank_options || []).sort((a: any, b: any) => a.option_no - b.option_no),
      }));

      const paperId = generatePaperId();

      // Save to DB
      const { error: saveErr } = await supabase
        .from('generated_papers' as any)
        .insert({
          id: paperId,
          user_id: user.id,
          grade: parseInt(selectedGrade),
          paper_type: paperType,
          lesson_weights: selectedLessons,
          question_ids: questions.map(q => ({ id: q.id, correct_option_no: q.correct_option_no })),
          mcq_count: finalMcq.length,
          short_essay_count: shortEssays.length,
          essay_count: essays.length,
        });

      if (saveErr) throw saveErr;

      setGeneratedPaper({ id: paperId, questions });
      toast.success(`Paper generated! ID: ${paperId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate paper');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    if (!generatedPaper) return;
    setDownloadingPdf(true);
    try {
      // Fetch template settings
      const { data: settingsData } = await (supabase as any)
        .from('site_settings')
        .select('key, value')
        .in('key', ['paper_template_school_name', `paper_template_instructions_${paperType.toLowerCase()}`, 'paper_template_footer', 'site_name']);

      const settings: Record<string, string> = {};
      settingsData?.forEach((s: any) => { settings[s.key] = s.value; });

      const schoolName = settings['paper_template_school_name'] || settings['site_name'] || 'ICT Academy';
      const instructions = settings[`paper_template_instructions_${paperType.toLowerCase()}`] || '';
      const footer = settings['paper_template_footer'] || '';

      const gradeLabel = GRADES.find(g => g.value === selectedGrade)?.label || `Grade ${selectedGrade}`;
      const paperLabel = PAPER_CONFIGS[paperType].label;
      const now = new Date().toLocaleDateString('en-LK');

      // Build HTML for PDF
      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; color: #000; font-size: 12pt; }
        .page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { font-size: 18pt; margin: 0 0 4px; }
        .header h2 { font-size: 13pt; margin: 0 0 4px; font-weight: normal; }
        .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #444; }
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
        .paper-id { font-size: 9pt; color: #888; text-align: right; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="page">
      <div class="header">
        <h1>${schoolName}</h1>
        <h2>${gradeLabel} — ${paperLabel}</h2>
        <div class="meta">
          <span>Date: ${now}</span>
          <span>Time: ${PAPER_CONFIGS[paperType].time}</span>
          <span>Paper ID: ${generatedPaper.id}</span>
        </div>
      </div>`;

      if (instructions) {
        html += `<div class="instructions"><strong>Instructions:</strong> ${instructions}</div>`;
      }

      const mcqs = generatedPaper.questions.filter(q => q.question_type === 'MCQ');
      const shortEssays = generatedPaper.questions.filter(q => q.question_type === 'SHORT_ESSAY');
      const essays = generatedPaper.questions.filter(q => q.question_type === 'ESSAY' || (q.question_type !== 'MCQ' && q.question_type !== 'SHORT_ESSAY'));

      let qNo = 1;

      if (mcqs.length > 0) {
        html += `<div class="section-title">Section A — Multiple Choice Questions (${mcqs.length} marks)</div>`;
        mcqs.forEach((q) => {
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
        shortEssays.forEach((q) => {
          html += `<div class="question">
            <span class="question-no">${qNo++}.</span> ${q.question_text || ''}
            ${q.question_image_url ? `<br><img class="q-img" src="${q.question_image_url}" />` : ''}
            <div class="essay-lines">${Array(8).fill('<div class="essay-line"></div>').join('')}</div>
          </div>`;
        });
      }

      if (essays.length > 0) {
        html += `<div class="section-title">Section C — Essay Questions</div>`;
        essays.forEach((q) => {
          html += `<div class="question">
            <span class="question-no">${qNo++}.</span> ${q.question_text || ''}
            ${q.question_image_url ? `<br><img class="q-img" src="${q.question_image_url}" />` : ''}
            <div class="essay-lines">${Array(15).fill('<div class="essay-line"></div>').join('')}</div>
          </div>`;
        });
      }

      if (footer) {
        html += `<div class="footer">${footer} &nbsp;|&nbsp; Paper ID: ${generatedPaper.id}</div>`;
      }

      html += `</div></body></html>`;

      // Open in new window and print
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 600);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            Paper Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Build a custom practice paper from the question bank and download it as a PDF.
          </p>
        </div>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Paper
            </TabsTrigger>
            <TabsTrigger value="answers">
              <Search className="w-4 h-4 mr-2" />
              Find Answers
            </TabsTrigger>
          </TabsList>

          {/* ── Generate Tab ── */}
          <TabsContent value="generate" className="space-y-6 pt-4">
            {!generatedPaper ? (
              <>
                {/* Step 1: Grade & Type */}
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Step 1 — Grade & Paper Type</CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select value={selectedGrade} onValueChange={v => { setSelectedGrade(v); setSelectedLessons([]); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Paper Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(PAPER_CONFIGS) as [string, typeof PAPER_CONFIGS['DAILY']][]).map(([type, cfg]) => (
                          <button
                            key={type}
                            onClick={() => setPaperType(type as any)}
                            className={cn(
                              'rounded-lg border p-3 text-left transition-colors',
                              paperType === type
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <p className="font-semibold text-sm text-foreground">{cfg.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {cfg.mcq} MCQ{cfg.short_essay > 0 ? ` · ${cfg.short_essay} S.Essay` : ''}{cfg.essay > 0 ? ` · ${cfg.essay} Essay` : ''} · {cfg.time}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Lessons */}
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Step 2 — Select Lessons & Weights</CardTitle>
                    <CardDescription>
                      Higher weight = more questions from that lesson. Questions are picked proportionally.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lesson search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search lessons..."
                        className="pl-9"
                        value={lessonSearch}
                        onChange={e => setLessonSearch(e.target.value)}
                      />
                    </div>

                    {lessonSearch && filteredLessons.length > 0 && (
                      <ScrollArea className="h-40 rounded-lg border bg-muted/30">
                        <div className="p-2 space-y-1">
                          {filteredLessons.map(l => (
                            <button
                              key={l.id}
                              onClick={() => { addLesson(l); setLessonSearch(''); }}
                              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-primary/10 text-left transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                              {l.title}
                              {l.parent_id && <span className="text-xs text-muted-foreground">(sub-topic)</span>}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {lessonSearch && filteredLessons.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No lessons found</p>
                    )}

                    {/* Selected lessons */}
                    {selectedLessons.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Search and add lessons above</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedLessons.map(l => (
                          <div key={l.lessonId} className="rounded-lg border bg-card p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{l.lessonTitle}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Weight {l.weight}
                                  {totalWeight > 0 && (
                                    <span className="ml-1 text-muted-foreground">
                                      ({Math.round((l.weight / totalWeight) * 100)}%)
                                    </span>
                                  )}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeLesson(l.lessonId)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <Slider
                              min={1}
                              max={5}
                              step={1}
                              value={[l.weight]}
                              onValueChange={([v]) => updateWeight(l.lessonId, v)}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Generate button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={generatePaper}
                  disabled={generating || selectedLessons.length === 0}
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-5 h-5 mr-2" />
                  )}
                  {generating ? 'Generating...' : `Generate ${config.label}`}
                </Button>
              </>
            ) : (
              /* ── Paper Preview ── */
              <div className="space-y-4">
                <Card className="card-elevated border-primary/30 bg-primary/5">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg text-foreground">Paper Ready!</p>
                      <p className="text-sm text-muted-foreground">
                        Paper ID: <span className="font-mono font-semibold text-primary">{generatedPaper.id}</span>
                        &nbsp;·&nbsp; {generatedPaper.questions.length} questions
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Save this ID to look up answers later
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={downloadPdf} disabled={downloadingPdf}>
                        {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download PDF
                      </Button>
                      <Button variant="outline" onClick={() => setGeneratedPaper(null)}>
                        Generate New
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Question Preview */}
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Question Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedPaper.questions.map((q, idx) => (
                      <div key={q.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-sm text-primary shrink-0">{idx + 1}.</span>
                          <div className="flex-1">
                            {q.question_text && <p className="text-sm text-foreground">{q.question_text}</p>}
                            {q.question_image_url && (
                              <img src={q.question_image_url} alt="" className="mt-2 max-h-32 rounded" />
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                            </div>
                            {q.question_type === 'MCQ' && q.options.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {q.options.map((o, oi) => (
                                  <div key={oi} className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                                    <span>{o.option_text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Answers Tab ── */}
          <TabsContent value="answers" className="pt-4">
            <AnswerLookup />
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

// ── Answer Lookup Sub-component ───────────────────────────────────────────────
const AnswerLookup = () => {
  const { user } = useAuth();
  const [paperId, setPaperId] = useState('');
  const [searching, setSearching] = useState(false);
  const [paper, setPaper] = useState<any>(null);
  const [accessStatus, setAccessStatus] = useState<'loading' | 'enrolled' | 'paid' | 'none' | null>(null);
  const [paying, setPaying] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['answer-access-fee'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('site_settings')
        .select('key, value')
        .in('key', ['answer_access_fee', 'site_name']);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });
  const fee = parseInt(settings?.['answer_access_fee'] || '2000');

  const searchPaper = async () => {
    if (!paperId.trim()) return;
    setSearching(true);
    setPaper(null);
    setAccessStatus(null);
    try {
      const { data, error } = await (supabase as any)
        .from('generated_papers')
        .select('*')
        .eq('id', paperId.trim().toUpperCase())
        .single();
      if (error || !data) { toast.error('Paper not found. Check the paper ID.'); return; }
      setPaper(data);

      // Check access
      if (!user) { setAccessStatus('none'); return; }
      setAccessStatus('loading');

      // Check class enrollment
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (enrollments && enrollments.length > 0) {
        setAccessStatus('enrolled');
        return;
      }

      // Check one-time payment
      const { data: accessPayment } = await (supabase as any)
        .from('answer_access_payments')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (accessPayment?.status === 'APPROVED') {
        setAccessStatus('paid');
      } else {
        setAccessStatus('none');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const submitPayment = async () => {
    if (!user || !slipFile) return;
    setPaying(true);
    try {
      const fileName = `answer-access/${user.id}/${Date.now()}-slip.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('payment-slips')
        .upload(fileName, slipFile);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(fileName);

      // Create payment record
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: fee,
          payment_type: 'ANSWER_ACCESS',
          ref_id: 'ANSWER_ACCESS',
          slip_url: fileName,
          status: 'PENDING',
        })
        .select('id')
        .single();
      if (payErr) throw payErr;

      // Create answer_access_payments record (upsert)
      await (supabase as any)
        .from('answer_access_payments')
        .upsert({ user_id: user.id, payment_id: payment.id, status: 'PENDING' }, { onConflict: 'user_id' });

      toast.success('Payment submitted! Awaiting admin verification. You\'ll get access once approved.');
      setShowPaymentForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Payment submission failed');
    } finally {
      setPaying(false);
    }
  };

  const canSeeAnswers = accessStatus === 'enrolled' || accessStatus === 'paid';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Search */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find Answers by Paper ID</CardTitle>
          <CardDescription>Enter the Paper ID shown on your generated paper</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. GP-A1B2C3"
              value={paperId}
              onChange={e => setPaperId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && searchPaper()}
              className="font-mono"
            />
            <Button onClick={searchPaper} disabled={searching || !paperId.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {paper && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-mono">{paper.id}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {GRADES.find(g => g.value === String(paper.grade))?.label || `Grade ${paper.grade}`}
                </Badge>
                <Badge variant={paper.paper_type === 'DAILY' ? 'secondary' : 'default'}>
                  {PAPER_CONFIGS[paper.paper_type as 'DAILY' | 'FULL']?.label || paper.paper_type}
                </Badge>
              </div>
            </div>
            <CardDescription>
              {paper.mcq_count} MCQ · {paper.essay_count} Essay · Generated {new Date(paper.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Access gate */}
            {!user && (
              <div className="rounded-lg bg-muted p-4 text-center space-y-2">
                <p className="text-sm font-medium">Login required to view answers</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>Login</Button>
              </div>
            )}

            {accessStatus === 'loading' && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}

            {accessStatus === 'none' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  🔒 Answer access requires an active class enrollment or a one-time payment of{' '}
                  <strong>Rs. {fee.toLocaleString()}</strong>
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => window.location.href = '/classes'}>
                    <BookOpen className="w-4 h-4 mr-1" />
                    Enroll in a Class
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                    Pay Rs. {fee.toLocaleString()} for Lifetime Access
                  </Button>
                </div>

                {showPaymentForm && (
                  <div className="mt-3 space-y-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Upload your bank transfer slip. Access will be granted after admin verification.
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => setSlipFile(e.target.files?.[0] || null)}
                    />
                    <Button size="sm" onClick={submitPayment} disabled={paying || !slipFile}>
                      {paying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      Submit Payment Slip
                    </Button>
                  </div>
                )}
              </div>
            )}

            {canSeeAnswers && (
              <AnswerDisplay questionIds={paper.question_ids} accessStatus={accessStatus!} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ── Answer display ────────────────────────────────────────────────────────────
const AnswerDisplay = ({
  questionIds,
  accessStatus,
}: {
  questionIds: Array<{ id: string; correct_option_no: number | null }>;
  accessStatus: string;
}) => {
  const [showExplains, setShowExplains] = useState(false);

  const ids = questionIds.map(q => q.id);
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['answer-questions', ids.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_bank')
        .select(`
          id, question_text, question_image_url, question_type,
          correct_option_no, explain_video_url,
          question_bank_options(option_no, option_text, is_correct)
        `)
        .in('id', ids);
      if (error) throw error;
      return data as any[];
    },
    enabled: ids.length > 0,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const mcqs = questions.filter(q => q.question_type === 'MCQ');
  const others = questions.filter(q => q.question_type !== 'MCQ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          {accessStatus === 'enrolled' ? '✓ Class Enrolled — Full Access' : '✓ Lifetime Access Unlocked'}
        </Badge>
        {questions.some(q => q.explain_video_url) && (
          <Button variant="ghost" size="sm" onClick={() => setShowExplains(!showExplains)}>
            {showExplains ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showExplains ? 'Hide' : 'Show'} Explanations
          </Button>
        )}
      </div>

      {mcqs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Section A — Answers</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mcqs.map((q, idx) => {
              const correct = (q.question_bank_options || []).find((o: any) => o.is_correct);
              return (
                <div key={q.id} className="rounded-md bg-primary/5 border border-primary/20 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Q{idx + 1}</p>
                  <p className="font-bold text-primary">
                    {correct ? String.fromCharCode(64 + correct.option_no) : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showExplains && questions.filter(q => q.explain_video_url).map((q, idx) => (
        <div key={q.id} className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">{q.question_text}</p>
          <a
            href={q.explain_video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            Watch Explanation Video
          </a>
        </div>
      ))}
    </div>
  );
};

export default PaperGenerator;
