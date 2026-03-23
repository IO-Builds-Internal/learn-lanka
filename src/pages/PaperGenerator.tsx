import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Wand2, Download, History,
  BookOpen, Loader2, Info, Search, ChevronDown, ChevronUp, Calendar
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
import { downloadGeneratedPaperPdf } from '@/lib/generatePaperPdf';

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

const MEDIUMS = [
  { value: 'English', label: 'English' },
  { value: 'Sinhala', label: 'Sinhala (සිංහල)' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)' },
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
  const [selectedMedium, setSelectedMedium] = useState<string>('English');
  const [paperType, setPaperType] = useState<'DAILY' | 'FULL'>('DAILY');
  const [selectedLessons, setSelectedLessons] = useState<WeightedLesson[]>([]);
  const [pickerLessonId, setPickerLessonId] = useState<string>('');
  const [pickerWeight, setPickerWeight] = useState<number>(3);
  const [lessonSearch, setLessonSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<{ id: string; questions: GeneratedQuestion[] } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Fetch lessons for grade + medium
  const gradeParam = selectedGrade === '12' ? [12, 13] : [parseInt(selectedGrade)];
  const { data: allLessons = [] } = useQuery({
    queryKey: ['syllabus-lessons-for-gen', selectedGrade, selectedMedium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syllabus_lessons')
        .select('id, title, parent_id')
        .in('grade', gradeParam)
        .or(`medium.eq.${selectedMedium},medium.is.null`)
        .order('sort_order');
      if (error) throw error;
      return data as LessonItem[];
    },
  });

  // Available (not yet added) lessons
  const availableLessons = allLessons.filter(
    l => !selectedLessons.find(s => s.lessonId === l.id)
  );

  const filteredAvailable = lessonSearch.trim()
    ? availableLessons.filter(l => l.title.toLowerCase().includes(lessonSearch.toLowerCase()))
    : availableLessons;

  const addLesson = () => {
    const lesson = allLessons.find(l => l.id === pickerLessonId);
    if (!lesson) return;
    setSelectedLessons(prev => [...prev, { lessonId: lesson.id, lessonTitle: lesson.title, weight: pickerWeight }]);
    setPickerLessonId('');
    setPickerWeight(3);
    setLessonSearch('');
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
        .in('lesson_id', lessonIds)
        .or(`medium.eq.${selectedMedium},medium.is.null`);

      if (error) throw error;
      if (!allQs || allQs.length === 0) {
        toast.error('No questions found for selected lessons. Please add questions to the question bank first.');
        return;
      }

      const mcqPool = (allQs as any[]).filter(q => q.question_type === 'MCQ');
      const shortEssayPool = (allQs as any[]).filter(q => q.question_type === 'SHORT_ESSAY');
      const essayPool = (allQs as any[]).filter(q => q.question_type === 'ESSAY');

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

      // Essays: pick from typed pools, fill remainder from any non-MCQ if short
      const shuffledShortEssay = shortEssayPool.sort(() => Math.random() - 0.5);
      const shuffledEssay = essayPool.sort(() => Math.random() - 0.5);

      let shortEssays = shuffledShortEssay.slice(0, config.short_essay);
      // If not enough SHORT_ESSAY, fill from ESSAY pool
      if (shortEssays.length < config.short_essay) {
        const fallback = shuffledEssay.filter(q => !shortEssays.find((s: any) => s.id === q.id));
        shortEssays = [...shortEssays, ...fallback.slice(0, config.short_essay - shortEssays.length)];
      }

      const usedIds = new Set([...pickedMcq.map((q: any) => q.id), ...shortEssays.map((q: any) => q.id)]);
      let essays = shuffledEssay.filter(q => !usedIds.has(q.id)).slice(0, config.essay);
      // If not enough ESSAY, fill from SHORT_ESSAY pool
      if (essays.length < config.essay) {
        const fallback = shuffledShortEssay.filter(q => !usedIds.has(q.id) && !essays.find((e: any) => e.id === q.id));
        essays = [...essays, ...fallback.slice(0, config.essay - essays.length)];
      }

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
      await downloadGeneratedPaperPdf({
        paperId: generatedPaper.id,
        grade: parseInt(selectedGrade),
        paperType,
        questionIds: generatedPaper.questions.map(q => ({ id: q.id, correct_option_no: q.correct_option_no })),
      });
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="generate" className="flex items-center justify-center gap-2">
              <Wand2 className="w-4 h-4" />
              <span>Generate Paper</span>
            </TabsTrigger>
            <TabsTrigger value="answers" className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>Find Answers</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center gap-2">
              <History className="w-4 h-4" />
              <span>Generated Papers</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Generate Tab ── */}
          <TabsContent value="generate" className="space-y-6 pt-4">
            {!generatedPaper ? (
              <>
                {/* Step 1: Grade & Type */}
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Step 1 — Grade, Medium & Paper Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
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
                        <Label>Medium</Label>
                        <Select value={selectedMedium} onValueChange={v => { setSelectedMedium(v); setSelectedLessons([]); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEDIUMS.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                      Pick each lesson from the list, set a weight (higher = more questions from that lesson), then click Add.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lesson picker row */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add a Lesson</p>

                      {/* Search filter */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Filter lessons..."
                          value={lessonSearch}
                          onChange={e => { setLessonSearch(e.target.value); setPickerLessonId(''); }}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Scrollable lesson list */}
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border">
                        {filteredAvailable.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {availableLessons.length === 0 ? 'All lessons added' : 'No lessons match'}
                          </div>
                        ) : (
                          filteredAvailable.map(l => (
                            <button
                              key={l.id}
                              onClick={() => setPickerLessonId(l.id)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                                pickerLessonId === l.id
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'hover:bg-muted text-foreground'
                              )}
                            >
                              <BookOpen className={cn('w-3.5 h-3.5 shrink-0', pickerLessonId === l.id ? 'text-primary' : 'text-muted-foreground')} />
                              <span className="flex-1 truncate">{l.title}</span>
                              {l.parent_id && <span className="text-xs text-muted-foreground shrink-0">sub-topic</span>}
                              {pickerLessonId === l.id && (
                                <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">Selected</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Weight selector + Add button */}
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Weight (1 = Low · 5 = High)</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(w => (
                              <button
                                key={w}
                                onClick={() => setPickerWeight(w)}
                                className={cn(
                                  'flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors border',
                                  pickerWeight === w
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                )}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Button
                          onClick={addLesson}
                          disabled={!pickerLessonId}
                          className="shrink-0"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Lesson
                        </Button>
                      </div>
                    </div>

                    {/* Added lessons */}
                    {selectedLessons.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No lessons added yet — pick one above</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Added Lessons ({selectedLessons.length})</p>
                        {selectedLessons.map(l => {
                          const pct = totalWeight > 0 ? Math.round((l.weight / totalWeight) * 100) : 0;
                          return (
                            <div key={l.lessonId} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                              <BookOpen className="w-4 h-4 text-primary shrink-0" />
                              <span className="flex-1 text-sm font-medium text-foreground truncate">{l.lessonTitle}</span>
                              {/* inline weight chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                {[1, 2, 3, 4, 5].map(w => (
                                  <button
                                    key={w}
                                    onClick={() => updateWeight(l.lessonId, w)}
                                    className={cn(
                                      'w-6 h-6 rounded-md text-xs font-bold transition-colors',
                                      l.weight === w
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-primary/20'
                                    )}
                                  >
                                    {w}
                                  </button>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground w-9 text-right shrink-0">{pct}%</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => removeLesson(l.lessonId)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
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

          {/* ── Generated Papers History Tab ── */}
          <TabsContent value="history" className="pt-4">
            <GeneratedPapersHistory />
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

// ── Generated Papers History Sub-component ───────────────────────────────────
const GeneratedPapersHistory = () => {
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Record<string, any[]>>({});
  const [loadingQuestionsId, setLoadingQuestionsId] = useState<string | null>(null);

  // Check access: enrolled in any active class OR approved lifetime payment
  const { data: hasAccess = false } = useQuery({
    queryKey: ['history-answer-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const [{ data: enrollments }, { data: accessPayment }] = await Promise.all([
        supabase
          .from('class_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .limit(1),
        (supabase as any)
          .from('answer_access_payments')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      return (enrollments && enrollments.length > 0) || accessPayment?.status === 'APPROVED';
    },
    enabled: !!user,
  });

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['generated-papers-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('generated_papers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const handleDownload = async (paper: any) => {
    setDownloadingId(paper.id);
    try {
      await downloadGeneratedPaperPdf({
        paperId: paper.id,
        grade: paper.grade,
        paperType: paper.paper_type,
        questionIds: paper.question_ids,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpand = async (paper: any) => {
    const id = paper.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (questionsMap[id]) return; // already loaded
    setLoadingQuestionsId(id);
    try {
      const qIds = (paper.question_ids as any[]).map((q: any) => q.id || q);
      const { data, error } = await supabase
        .from('question_bank')
        .select('id, question_text, question_type, explain_video_url, question_bank_options(option_no, option_text, is_correct)')
        .in('id', qIds);
      if (!error && data) setQuestionsMap(prev => ({ ...prev, [id]: data }));
    } catch (_) {}
    finally { setLoadingQuestionsId(null); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
        <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No papers generated yet</p>
        <p className="text-sm mt-1">Generate your first paper from the Generate Paper tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{papers.length} paper{papers.length !== 1 ? 's' : ''} generated</p>
      {papers.map((paper: any) => {
        const isExpanded = expandedId === paper.id;
        const qs: any[] = questionsMap[paper.id] || [];
        const videoQuestions = qs.filter(q => q.explain_video_url);
        const mcqs = qs.filter(q => q.question_type === 'MCQ');

        return (
          <Card key={paper.id} className="card-elevated">
            <CardContent className="p-4 space-y-3">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-primary text-sm">{paper.id}</span>
                    <Badge variant={paper.paper_type === 'DAILY' ? 'secondary' : 'default'} className="text-xs">
                      {PAPER_CONFIGS[paper.paper_type as 'DAILY' | 'FULL']?.label || paper.paper_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {GRADES.find(g => g.value === String(paper.grade))?.label || `Grade ${paper.grade}`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(paper.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    &nbsp;·&nbsp;
                    {paper.mcq_count} MCQ
                    {paper.short_essay_count > 0 ? ` · ${paper.short_essay_count} S.Essay` : ''}
                    {paper.essay_count > 0 ? ` · ${paper.essay_count} Essay` : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleExpand(paper)}
                  >
                    {loadingQuestionsId === paper.id
                      ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      : isExpanded ? <ChevronUp className="w-4 h-4 mr-1.5" /> : <ChevronDown className="w-4 h-4 mr-1.5" />}
                    {isExpanded ? 'Hide' : 'View Answers & Reviews'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(paper)}
                    disabled={downloadingId === paper.id}
                  >
                    {downloadingId === paper.id
                      ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      : <Download className="w-4 h-4 mr-1.5" />}
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Expanded: answers + review videos — gated behind access */}
              {isExpanded && (
                <div className="pt-2 border-t space-y-4">
                  {!hasAccess ? (
                    /* ── Access gate ── */
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        🔒 Answers & review videos are only available to enrolled students or users with lifetime access.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => window.location.href = '/classes'}>
                          <BookOpen className="w-4 h-4 mr-1" />
                          Enroll in a Class
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.location.href = '/paper-generator?tab=answers'}>
                          Get Lifetime Access
                        </Button>
                      </div>
                    </div>
                  ) : loadingQuestionsId === paper.id ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : qs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No question data found</p>
                  ) : (
                    <>
                      {/* MCQ answers grid */}
                      {mcqs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">MCQ Answers</p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {mcqs.map((q, idx) => {
                              const correct = (q.question_bank_options || []).find((o: any) => o.is_correct);
                              return (
                                <div key={q.id} className="rounded-md bg-primary/5 border border-primary/20 p-2 text-center">
                                  <p className="text-xs text-muted-foreground">Q{idx + 1}</p>
                                  <p className="font-bold text-primary text-sm">
                                    {correct ? String.fromCharCode(64 + correct.option_no) : '—'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Review / explanation videos */}
                      {videoQuestions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            🎬 Marking Review Videos ({videoQuestions.length})
                          </p>
                          <div className="space-y-2">
                            {videoQuestions.map((q, idx) => (
                              <a
                                key={q.id}
                                href={q.explain_video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 px-3 py-2.5 transition-colors text-sm text-primary font-medium"
                              >
                                <BookOpen className="w-4 h-4 shrink-0" />
                                <span className="flex-1 truncate">
                                  {q.question_text ? `Q: ${q.question_text.slice(0, 60)}${q.question_text.length > 60 ? '…' : ''}` : `Question ${idx + 1} Explanation`}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0">Watch →</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {videoQuestions.length === 0 && mcqs.length > 0 && (
                        <p className="text-xs text-muted-foreground">No explanation videos available for this paper's questions.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
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
        .maybeSingle();

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
      const fileName = `${user.id}/answer-access/${Date.now()}-slip.jpg`;
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
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
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
