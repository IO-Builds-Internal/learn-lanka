import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Type,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Youtube,
  Loader2,
  BookOpen,
  FileQuestion,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import YouTubeEmbed from '@/components/YouTubeEmbed';

// ──────────────── Types ────────────────
type SyllabusLesson = { id: string; title: string; grade: number | null; medium: string | null; parent_id: string | null; subject: string };
type QBOption = { id?: string; option_no: number; option_text: string; option_image_url: string | null; is_correct: boolean };
type QuestionBankRow = {
  id: string;
  question_type: string;
  question_text: string | null;
  question_image_url: string | null;
  category: string;
  past_paper_ref: string | null;
  medium: string | null;
  grade: number | null;
  subject: string;
  lesson_id: string | null;
  correct_option_no: number | null;
  explain_video_url: string | null;
  created_at: string;
  question_bank_options: QBOption[];
};

const GRADES: { value: number; label: string }[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ value: i + 6, label: `Grade ${i + 6}` })), // 6–11
  { value: 12, label: 'G.C.E A/L' }, // 12 & 13 combined
];
const MEDIUMS = ['sinhala', 'english', 'tamil', 'both'];
const QUESTION_TYPES = ['MCQ', 'ESSAY', 'SHORT_ESSAY'];
const CATEGORIES = ['OTHER', 'PAST_PAPER'];

const emptyOptions = (): QBOption[] =>
  [1, 2, 3, 4, 5].map(n => ({ option_no: n, option_text: '', option_image_url: null, is_correct: false }));

const defaultForm = () => ({
  question_type: 'MCQ',
  question_text: '',
  question_image_url: null as string | null,
  category: 'OTHER',
  past_paper_ref: '',
  medium: '',
  grade: '',
  lesson_id: '',
  explain_video_url: '',
  options: emptyOptions(),
  correct_option_no: null as number | null,
  questionInputMode: 'text' as 'text' | 'image',
});

// ──────────────── Component ────────────────
const AdminQuestionBank = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankRow | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterMedium, setFilterMedium] = useState('all');
  const [filterLesson, setFilterLesson] = useState('all');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const qImageRef = useRef<HTMLInputElement>(null);

  // Lessons
  const { data: lessons = [] } = useQuery<SyllabusLesson[]>({
    queryKey: ['syllabus_lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('syllabus_lessons').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Questions
  const { data: questions = [], isLoading } = useQuery<QuestionBankRow[]>({
    queryKey: ['question_bank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*, question_bank_options(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(q => ({
        ...q,
        question_bank_options: (q.question_bank_options || []).sort((a: QBOption, b: QBOption) => a.option_no - b.option_no),
      }));
    },
  });

  // Upload image helper
  const uploadImage = async (file: File, field: string): Promise<string> => {
    setUploadingField(field);
    const ext = file.name.split('.').pop();
    const path = `question-bank/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('lesson-materials').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('lesson-materials').getPublicUrl(path);
    setUploadingField(null);
    return data.publicUrl;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        question_type: form.question_type,
        question_text: form.questionInputMode === 'text' ? form.question_text || null : null,
        question_image_url: form.questionInputMode === 'image' ? form.question_image_url : null,
        category: form.category,
        past_paper_ref: form.category === 'PAST_PAPER' ? form.past_paper_ref || null : null,
        medium: form.medium || null,
        grade: form.grade ? Number(form.grade) : null,
        subject: 'ICT',
        lesson_id: form.lesson_id || null,
        correct_option_no: form.question_type === 'MCQ' ? form.correct_option_no : null,
        explain_video_url: form.explain_video_url || null,
      };

      let questionId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('question_bank').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('question_bank').insert(payload).select('id').single();
        if (error) throw error;
        questionId = data.id;
      }

      // Handle options for MCQ
      if (form.question_type === 'MCQ' && questionId) {
        if (editing) {
          await supabase.from('question_bank_options').delete().eq('question_id', questionId);
        }
        const filledOptions = form.options.filter(o => o.option_text.trim() || o.option_image_url);
        if (filledOptions.length > 0) {
          const { error } = await supabase.from('question_bank_options').insert(
            filledOptions.map(o => ({
              question_id: questionId!,
              option_no: o.option_no,
              option_text: o.option_text || null,
              option_image_url: o.option_image_url,
              is_correct: o.option_no === form.correct_option_no,
            }))
          );
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question_bank'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm());
      toast({ title: editing ? 'Question updated' : 'Question added' });
    },
    onError: (e: Error) => {
      setUploadingField(null);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question_bank'] });
      toast({ title: 'Question deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (q: QuestionBankRow) => {
    setEditing(q);
    const opts = emptyOptions();
    (q.question_bank_options || []).forEach(o => {
      const idx = opts.findIndex(x => x.option_no === o.option_no);
      if (idx !== -1) opts[idx] = { ...o, option_text: o.option_text || '' };
    });
    setForm({
      question_type: q.question_type,
      question_text: q.question_text || '',
      question_image_url: q.question_image_url,
      category: q.category,
      past_paper_ref: q.past_paper_ref || '',
      medium: q.medium || '',
      grade: q.grade?.toString() || '',
      lesson_id: q.lesson_id || '',
      explain_video_url: q.explain_video_url || '',
      options: opts,
      correct_option_no: q.correct_option_no,
      questionInputMode: q.question_image_url ? 'image' : 'text',
    });
    setDialogOpen(true);
  };

  const setOptionCorrect = (optionNo: number) => {
    setForm(f => ({
      ...f,
      correct_option_no: optionNo,
      options: f.options.map(o => ({ ...o, is_correct: o.option_no === optionNo })),
    }));
  };

  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'all' && q.question_type !== filterType) return false;
    if (filterGrade !== 'all' && q.grade?.toString() !== filterGrade) return false;
    if (filterMedium !== 'all' && q.medium !== filterMedium) return false;
    if (filterLesson !== 'all' && q.lesson_id !== filterLesson) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !q.question_text?.toLowerCase().includes(s) &&
        !q.past_paper_ref?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const getLessonLabel = (id: string | null) => {
    if (!id) return null;
    const l = lessons.find(x => x.id === id);
    if (!l) return null;
    if (l.parent_id) {
      const parent = lessons.find(x => x.id === l.parent_id);
      return parent ? `${parent.title} → ${l.title}` : l.title;
    }
    return l.title;
  };

  const typeColor = (t: string) =>
    t === 'MCQ' ? 'bg-primary/10 text-primary' : t === 'ESSAY' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground';

  // Summary stats
  const mcqCount = questions.filter(q => q.question_type === 'MCQ').length;
  const essayCount = questions.filter(q => q.question_type === 'ESSAY').length;
  const shortEssayCount = questions.filter(q => q.question_type === 'SHORT_ESSAY').length;
  const withExplainCount = questions.filter(q => !!q.explain_video_url).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground text-sm mt-1">{questions.length} total questions</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'MCQ', count: mcqCount, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Essay', count: essayCount, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Short Essay', count: shortEssayCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'With Explain Video', count: withExplainCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <span className={`text-base font-bold ${s.color}`}>{s.count}</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8 w-52" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADES.map(g => <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMedium} onValueChange={setFilterMedium}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Medium" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mediums</SelectItem>
              {MEDIUMS.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterLesson} onValueChange={setFilterLesson}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Lessons" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lessons</SelectItem>
              {lessons.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.parent_id ? `  ↳ ${l.title}` : l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileQuestion className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No questions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredQuestions.map((q, idx) => (
              <Card key={q.id} className="overflow-hidden">
                <Collapsible
                  open={expandedId === q.id}
                  onOpenChange={open => setExpandedId(open ? q.id : null)}
                >
                  <CardHeader className="py-2 px-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 flex-1 text-left min-w-0">
                          {expandedId === q.id ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground shrink-0 font-mono">#{idx + 1}</span>
                          <Badge className={`text-xs shrink-0 border-0 ${typeColor(q.question_type)}`}>
                            {q.question_type.replace('_', ' ')}
                          </Badge>
                          {q.category === 'PAST_PAPER' && (
                            <Badge variant="outline" className="text-xs shrink-0">Past Paper</Badge>
                          )}
                          <span className="text-sm truncate flex-1">
                            {q.question_text
                              ? q.question_text.slice(0, 80) + (q.question_text.length > 80 ? '...' : '')
                              : q.question_image_url
                              ? '[Image question]'
                              : '[Empty]'}
                          </span>
                          <div className="flex gap-1 shrink-0">
                            {q.grade && <Badge variant="secondary" className="text-xs">{q.grade >= 12 ? 'A/L' : `G${q.grade}`}</Badge>}
                            {q.medium && <Badge variant="outline" className="text-xs capitalize">{q.medium}</Badge>}
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(q)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(q.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-4 pb-4 space-y-4">
                      {/* Question content */}
                      {q.question_image_url ? (
                        <img src={q.question_image_url} alt="Question" className="max-h-48 rounded-lg border" />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{q.question_text}</p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {q.category === 'PAST_PAPER' && q.past_paper_ref && (
                          <span className="bg-muted px-2 py-0.5 rounded">📄 {q.past_paper_ref}</span>
                        )}
                        {getLessonLabel(q.lesson_id) && (
                          <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {getLessonLabel(q.lesson_id)}
                          </span>
                        )}
                        {q.explain_video_url && (
                           <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1 text-destructive">
                             <Youtube className="w-3 h-3" /> Explanation video
                           </span>
                        )}
                      </div>

                      {/* MCQ options */}
                      {q.question_type === 'MCQ' && q.question_bank_options.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {q.question_bank_options.map(o => (
                            <div
                              key={o.option_no}
                              className={`p-2 rounded-lg border text-sm flex items-center gap-2 ${o.is_correct ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                             >
                               {o.is_correct ? (
                                 <Check className="w-4 h-4 text-primary shrink-0" />
                              ) : (
                                <span className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />
                              )}
                              <span className="font-medium text-xs text-muted-foreground shrink-0">
                                {String.fromCharCode(64 + o.option_no)}
                              </span>
                              {o.option_image_url ? (
                                <img src={o.option_image_url} alt={`Option ${o.option_no}`} className="max-h-12 rounded" />
                              ) : (
                                <span>{o.option_text}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Explanation video */}
                      {q.explain_video_url && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Explanation Video</p>
                          <YouTubeEmbed url={q.explain_video_url} />
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setEditing(null); setForm(defaultForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Type, Grade, Medium row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Question Type *</Label>
                <Select value={form.question_type} onValueChange={v => setForm(f => ({ ...f, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={form.grade || '__none__'} onValueChange={v => setForm(f => ({ ...f, grade: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    {GRADES.map(g => <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Medium</Label>
                <Select value={form.medium || '__none__'} onValueChange={v => setForm(f => ({ ...f, medium: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    {MEDIUMS.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.category === 'PAST_PAPER' && (
                <div className="space-y-1.5">
                  <Label>Past Paper Reference</Label>
                  <Input placeholder="e.g. 2023 A/L ICT Paper I" value={form.past_paper_ref} onChange={e => setForm(f => ({ ...f, past_paper_ref: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Lesson */}
            <div className="space-y-1.5">
              <Label>Syllabus Lesson</Label>
              <Select value={form.lesson_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, lesson_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select lesson (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No lesson</SelectItem>
                  {lessons.filter(l => !l.parent_id).map(l => (
                    <>
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                      {lessons.filter(s => s.parent_id === l.id).map(s => (
                        <SelectItem key={s.id} value={s.id}>↳ {s.title}</SelectItem>
                      ))}
                    </>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question content */}
            <div className="space-y-2">
              <Label>Question Content *</Label>
              <Tabs value={form.questionInputMode} onValueChange={v => setForm(f => ({ ...f, questionInputMode: v as 'text' | 'image' }))}>
                <TabsList className="h-8 w-40">
                  <TabsTrigger value="text" className="text-xs flex items-center gap-1">
                    <Type className="w-3 h-3" /> Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="text-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Image
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-2">
                  <Textarea
                    placeholder="Enter question text..."
                    value={form.question_text}
                    onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                    rows={3}
                  />
                </TabsContent>
                <TabsContent value="image" className="mt-2">
                  {form.question_image_url ? (
                    <div className="relative inline-block">
                      <img src={form.question_image_url} alt="Question" className="max-h-40 rounded-lg border" />
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setForm(f => ({ ...f, question_image_url: null }))}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      {uploadingField === 'question' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload question image</span>
                        </>
                      )}
                      <input ref={qImageRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadImage(file, 'question');
                          setForm(f => ({ ...f, question_image_url: url }));
                        } catch (err: unknown) {
                          toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
                        }
                      }} />
                    </label>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* MCQ Options */}
            {form.question_type === 'MCQ' && (
              <div className="space-y-2">
                <Label>Options (click circle to mark correct answer)</Label>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={opt.option_no} className={`p-2 rounded-lg border transition-colors ${opt.is_correct ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'}`}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOptionCorrect(opt.option_no)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${opt.is_correct ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground hover:border-primary'}`}
                        >
                          {opt.is_correct && <Check className="w-3 h-3" />}
                        </button>
                        <Badge variant="secondary" className="text-xs shrink-0">{String.fromCharCode(64 + opt.option_no)}</Badge>

                        {opt.option_image_url ? (
                          <div className="relative inline-block flex-1">
                            <img src={opt.option_image_url} alt="" className="max-h-12 rounded border" />
                            <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 h-4 w-4"
                              onClick={() => setForm(f => ({ ...f, options: f.options.map(o => o.option_no === opt.option_no ? { ...o, option_image_url: null } : o) }))}>
                              <X className="w-2 h-2" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Input
                              className="flex-1 h-8 text-sm"
                              placeholder={`Option ${String.fromCharCode(64 + opt.option_no)}`}
                              value={opt.option_text}
                              onChange={e => setForm(f => ({ ...f, options: f.options.map(o => o.option_no === opt.option_no ? { ...o, option_text: e.target.value } : o) }))}
                            />
                            <label className="cursor-pointer shrink-0">
                              {uploadingField === `opt_${opt.option_no}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <span><ImageIcon className="w-4 h-4" /></span>
                                </Button>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const url = await uploadImage(file, `opt_${opt.option_no}`);
                                  setForm(f => ({ ...f, options: f.options.map(o => o.option_no === opt.option_no ? { ...o, option_image_url: url } : o) }));
                                } catch (err: unknown) {
                                  toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
                                }
                              }} />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explain Video */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-destructive" />
                Explanation Video URL (optional)
              </Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=... (unlisted OK)"
                value={form.explain_video_url}
                onChange={e => setForm(f => ({ ...f, explain_video_url: e.target.value }))}
              />
              {form.explain_video_url && (
                <div className="mt-2">
                  <YouTubeEmbed url={form.explain_video_url} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminQuestionBank;
