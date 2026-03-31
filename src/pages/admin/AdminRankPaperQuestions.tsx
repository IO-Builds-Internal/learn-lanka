import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Loader2, FileText, ChevronsUpDown, Upload, Eye, Trash2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layouts/AdminLayout';
import BulkAddQuestionsDialog from '@/components/admin/BulkAddQuestionsDialog';
import SortableQuestionCard from '@/components/admin/SortableQuestionCard';
import RankPaperAttachmentsManager from '@/components/admin/RankPaperAttachmentsManager';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MCQOption {
  id?: string;
  option_no: number;
  option_text: string | null;
  option_image_url: string | null;
  is_correct: boolean;
}

interface MCQQuestion {
  id: string;
  q_no: number;
  question_text: string | null;
  question_image_url: string | null;
  options: MCQOption[];
}

const AdminRankPaperQuestions = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [uploadingEssayPdf, setUploadingEssayPdf] = useState(false);
  const [uploadingShortEssayPdf, setUploadingShortEssayPdf] = useState(false);
  const essayFileRef = useRef<HTMLInputElement>(null);
  const shortEssayFileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch paper details
  const { data: paper } = useQuery({
    queryKey: ['rank-paper', paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('*')
        .eq('id', paperId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!paperId,
  });

  // Fetch questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['rank-mcq-questions', paperId],
    queryFn: async () => {
      const { data: questionsData, error: qError } = await supabase
        .from('rank_mcq_questions')
        .select('*')
        .eq('rank_paper_id', paperId)
        .order('q_no', { ascending: true });
      
      if (qError) throw qError;

      const questionsWithOptions = await Promise.all(
        questionsData.map(async (q) => {
          const { data: options } = await supabase
            .from('rank_mcq_options')
            .select('*')
            .eq('question_id', q.id)
            .order('option_no', { ascending: true });
          
          return { ...q, options: options || [] };
        })
      );

      return questionsWithOptions as MCQQuestion[];
    },
    enabled: !!paperId,
  });

  // Max 50 questions enforced by DB constraint
  const MAX_QUESTIONS = 50;
  const canAddMore = questions.length < MAX_QUESTIONS;

  // Helper to get current max q_no from database (avoids stale state race conditions)
  const fetchMaxQNo = async (): Promise<number> => {
    const { data, error } = await supabase
      .from('rank_mcq_questions')
      .select('q_no')
      .eq('rank_paper_id', paperId)
      .order('q_no', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? data[0].q_no : 0;
  };

  // Initialize expanded state when questions load
  useEffect(() => {
    if (questions.length > 0 && expandedIds.size === 0 && allExpanded) {
      setExpandedIds(new Set(questions.map(q => q.id)));
    }
  }, [questions]);

  // Reorder questions mutation using RPC for atomic updates
  const reorderMutation = useMutation({
    mutationFn: async (reorderedQuestions: MCQQuestion[]) => {
      const questionIds = reorderedQuestions.map(q => q.id);
      const newOrder = reorderedQuestions.map((_, index) => index + 1);
      
      const { error } = await supabase.rpc('reorder_rank_mcq_questions', {
        question_ids: questionIds,
        new_order: newOrder,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
      toast.success('Questions reordered!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reorder questions');
    },
  });

  // Toggle all expanded/collapsed
  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(questions.map(q => q.id)));
    }
    setAllExpanded(!allExpanded);
  };

  // Handle individual question expand/collapse
  const handleExpandChange = (id: string, isExpanded: boolean) => {
    const newSet = new Set(expandedIds);
    if (isExpanded) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setExpandedIds(newSet);
    setAllExpanded(newSet.size === questions.length);
  };

  // Add question mutation (fetches max q_no from DB to avoid stale-state duplicate keys)
  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      // Guard: enforce 50 question cap
      const currentCount = questions.length;
      if (currentCount >= MAX_QUESTIONS) {
        throw new Error(`Maximum ${MAX_QUESTIONS} questions allowed per paper.`);
      }

      // Get fresh max q_no from database
      const maxQNo = await fetchMaxQNo();
      const newQNo = maxQNo + 1;

      if (newQNo > MAX_QUESTIONS) {
        throw new Error(`Question number would exceed ${MAX_QUESTIONS}. Delete some questions first.`);
      }

      const { data: question, error: qError } = await supabase
        .from('rank_mcq_questions')
        .insert({
          rank_paper_id: paperId,
          q_no: newQNo,
          question_text: '',
        })
        .select()
        .single();
      
      if (qError) throw qError;

      const optionsToInsert = [1, 2, 3, 4].map((no) => ({
        question_id: question.id,
        option_no: no,
        option_text: '',
        is_correct: no === 1,
      }));

      const { error: oError } = await supabase
        .from('rank_mcq_options')
        .insert(optionsToInsert);
      
      if (oError) throw oError;

      return question;
    },
    onSuccess: () => {
      toast.success('Question added!');
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add question');
    },
  });

  // Duplicate question mutation (fetches max q_no from DB to avoid stale-state duplicate keys)
  const duplicateQuestionMutation = useMutation({
    mutationFn: async (sourceQuestion: MCQQuestion) => {
      // Guard: enforce 50 question cap
      const currentCount = questions.length;
      if (currentCount >= MAX_QUESTIONS) {
        throw new Error(`Maximum ${MAX_QUESTIONS} questions allowed per paper.`);
      }

      // Get fresh max q_no from database
      const maxQNo = await fetchMaxQNo();
      const newQNo = maxQNo + 1;

      if (newQNo > MAX_QUESTIONS) {
        throw new Error(`Question number would exceed ${MAX_QUESTIONS}. Delete some questions first.`);
      }

      const { data: question, error: qError } = await supabase
        .from('rank_mcq_questions')
        .insert({
          rank_paper_id: paperId,
          q_no: newQNo,
          question_text: sourceQuestion.question_text,
          question_image_url: sourceQuestion.question_image_url,
        })
        .select()
        .single();
      
      if (qError) throw qError;

      const optionsToInsert = sourceQuestion.options.map((opt) => ({
        question_id: question.id,
        option_no: opt.option_no,
        option_text: opt.option_text,
        option_image_url: opt.option_image_url,
        is_correct: opt.is_correct,
      }));

      const { error: oError } = await supabase
        .from('rank_mcq_options')
        .insert(optionsToInsert);
      
      if (oError) throw oError;

      return question;
    },
    onSuccess: () => {
      toast.success('Question duplicated!');
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate question');
    },
  });

  // Update question text mutation
  const updateQuestionTextMutation = useMutation({
    mutationFn: async ({ id, question_text }: { id: string; question_text: string }) => {
      const { error } = await supabase
        .from('rank_mcq_questions')
        .update({ question_text })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Update question image mutation
  const updateQuestionImageMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      const { error } = await supabase
        .from('rank_mcq_questions')
        .update({ question_image_url: url })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Update option text mutation
  const updateOptionTextMutation = useMutation({
    mutationFn: async ({ id, option_text }: { id: string; option_text: string }) => {
      const { error } = await supabase
        .from('rank_mcq_options')
        .update({ option_text })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Update option image mutation
  const updateOptionImageMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      const { error } = await supabase
        .from('rank_mcq_options')
        .update({ option_image_url: url })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Set correct answer mutation
  const setCorrectAnswerMutation = useMutation({
    mutationFn: async ({ questionId, optionId }: { questionId: string; optionId: string }) => {
      await supabase
        .from('rank_mcq_options')
        .update({ is_correct: false })
        .eq('question_id', questionId);

      const { error } = await supabase
        .from('rank_mcq_options')
        .update({ is_correct: true })
        .eq('id', optionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Correct answer set!');
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('rank_mcq_options').delete().eq('question_id', id);
      const { error } = await supabase.from('rank_mcq_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question deleted!');
      queryClient.invalidateQueries({ queryKey: ['rank-mcq-questions', paperId] });
    },
  });

  // Upload image handler
  const handleImageUpload = async (
    file: File,
    type: 'question' | 'option',
    id: string
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    if (type === 'question') {
      setUploadingQuestionId(id);
    } else {
      setUploadingOptionId(id);
    }

    try {
      const fileName = `${paperId}/${type}-${id}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('papers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('papers')
        .getPublicUrl(fileName);

      if (type === 'question') {
        await updateQuestionImageMutation.mutateAsync({ id, url: publicUrl });
      } else {
        await updateOptionImageMutation.mutateAsync({ id, url: publicUrl });
      }

      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploadingQuestionId(null);
      setUploadingOptionId(null);
    }
  };

  // Handle essay PDF upload
  const handleEssayPdfUpload = async (file: File, type: 'essay' | 'short_essay') => {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF must be less than 10MB');
      return;
    }

    if (type === 'essay') {
      setUploadingEssayPdf(true);
    } else {
      setUploadingShortEssayPdf(true);
    }

    try {
      const fileName = `${paperId}/${type}-questions-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('papers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('papers')
        .getPublicUrl(fileName);

      // Update the rank_paper with the PDF URL
      const updateField = type === 'essay' ? 'essay_pdf_url' : 'short_essay_pdf_url';
      const { error: updateError } = await supabase
        .from('rank_papers')
        .update({ [updateField]: publicUrl })
        .eq('id', paperId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['rank-paper', paperId] });
      toast.success(`${type === 'essay' ? 'Essay' : 'Short Essay'} questions PDF uploaded!`);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploadingEssayPdf(false);
      setUploadingShortEssayPdf(false);
    }
  };

  // Remove essay PDF
  const handleRemoveEssayPdf = async (type: 'essay' | 'short_essay') => {
    try {
      const updateField = type === 'essay' ? 'essay_pdf_url' : 'short_essay_pdf_url';
      const { error } = await supabase
        .from('rank_papers')
        .update({ [updateField]: null })
        .eq('id', paperId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['rank-paper', paperId] });
      toast.success('PDF removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove PDF');
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      
      const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
      reorderMutation.mutate(reorderedQuestions);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Determine which sections are available
  const hasMcq = paper?.has_mcq;
  const hasShortEssay = paper?.has_short_essay;
  const hasEssay = paper?.has_essay;
  const defaultTab = hasMcq ? 'mcq' : hasShortEssay ? 'short_essay' : 'essay';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(window.location.pathname.startsWith('/teacher') ? '/teacher/rank-papers' : '/admin/rank-papers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Manage Questions</h1>
            <p className="text-muted-foreground">{paper?.title}</p>
          </div>
          <div className="flex gap-2">
            {hasMcq && <Badge variant="outline">MCQ</Badge>}
            {hasShortEssay && <Badge variant="outline">Short Essay</Badge>}
            {hasEssay && <Badge variant="outline">Essay</Badge>}
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {hasMcq && <TabsTrigger value="mcq">MCQ Questions</TabsTrigger>}
            {hasShortEssay && <TabsTrigger value="short_essay">Short Essay</TabsTrigger>}
            {hasEssay && <TabsTrigger value="essay">Essay</TabsTrigger>}
          </TabsList>

          {/* MCQ Tab */}
          {hasMcq && (
            <TabsContent value="mcq" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {questions.length}/{MAX_QUESTIONS} questions (drag to reorder)
                </p>
                <div className="flex gap-2">
                  {questions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={toggleAllExpanded}>
                      <ChevronsUpDown className="w-4 h-4 mr-2" />
                      {allExpanded ? 'Collapse All' : 'Expand All'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setBulkAddOpen(true)} disabled={!canAddMore}>
                    <FileText className="w-4 h-4 mr-2" />
                    Bulk Add
                  </Button>
                  <Button onClick={() => addQuestionMutation.mutate()} disabled={addQuestionMutation.isPending || !canAddMore}>
                    {addQuestionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add One
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No MCQ questions yet. Add your first question to get started.</p>
                    <Button onClick={() => addQuestionMutation.mutate()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Question
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={questions.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid gap-4">
                      {questions.map((question) => (
                        <SortableQuestionCard
                          key={question.id}
                          question={question}
                          isExpanded={expandedIds.has(question.id)}
                          onExpandChange={(isExpanded) => handleExpandChange(question.id, isExpanded)}
                          uploadingQuestionId={uploadingQuestionId}
                          uploadingOptionId={uploadingOptionId}
                          onUpdateQuestionText={(id, text) => 
                            updateQuestionTextMutation.mutate({ id, question_text: text })
                          }
                          onUpdateQuestionImage={(id, url) => 
                            updateQuestionImageMutation.mutate({ id, url })
                          }
                          onUpdateOptionText={(id, text) => 
                            updateOptionTextMutation.mutate({ id, option_text: text })
                          }
                          onUpdateOptionImage={(id, url) => 
                            updateOptionImageMutation.mutate({ id, url })
                          }
                          onSetCorrectAnswer={(questionId, optionId) => 
                            setCorrectAnswerMutation.mutate({ questionId, optionId })
                          }
                          onDeleteQuestion={(id) => deleteQuestionMutation.mutate(id)}
                          onDuplicateQuestion={(q) => duplicateQuestionMutation.mutate(q)}
                          onImageUpload={handleImageUpload}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {questions.length > 0 && canAddMore && (
                <div className="flex justify-center pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => addQuestionMutation.mutate()}
                    disabled={addQuestionMutation.isPending || !canAddMore}
                  >
                    {addQuestionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Another Question
                  </Button>
                </div>
              )}
              {!canAddMore && questions.length > 0 && (
                <div className="text-center pt-4 text-muted-foreground">
                  Maximum {MAX_QUESTIONS} questions reached.
                </div>
              )}
            </TabsContent>
          )}

          {/* Short Essay Tab */}
          {hasShortEssay && (
            <TabsContent value="short_essay" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="w-5 h-5" />
                    Short Essay Questions PDF
                  </CardTitle>
                  <CardDescription>
                    Upload a PDF containing short essay questions. Students will download this and upload their answers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={shortEssayFileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEssayPdfUpload(file, 'short_essay');
                    }}
                  />
                  
                  {paper?.short_essay_pdf_url ? (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <FileText className="w-10 h-10 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Short Essay Questions PDF</p>
                        <p className="text-sm text-muted-foreground">PDF uploaded successfully</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(paper.short_essay_pdf_url!, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shortEssayFileRef.current?.click()}
                          disabled={uploadingShortEssayPdf}
                        >
                          {uploadingShortEssayPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Replace
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveEssayPdf('short_essay')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => shortEssayFileRef.current?.click()}
                    >
                      {uploadingShortEssayPdf ? (
                        <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                      ) : (
                        <FileUp className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                      )}
                      <p className="font-medium mb-1">Click to upload Short Essay Questions PDF</p>
                      <p className="text-sm text-muted-foreground">PDF up to 10MB</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Essay Tab */}
          {hasEssay && (
            <TabsContent value="essay" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="w-5 h-5" />
                    Essay Questions PDF
                  </CardTitle>
                  <CardDescription>
                    Upload a PDF containing essay questions. Students will download this and upload their answers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={essayFileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEssayPdfUpload(file, 'essay');
                    }}
                  />
                  
                  {paper?.essay_pdf_url ? (
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <FileText className="w-10 h-10 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Essay Questions PDF</p>
                        <p className="text-sm text-muted-foreground">PDF uploaded successfully</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(paper.essay_pdf_url!, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => essayFileRef.current?.click()}
                          disabled={uploadingEssayPdf}
                        >
                          {uploadingEssayPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Replace
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveEssayPdf('essay')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => essayFileRef.current?.click()}
                    >
                      {uploadingEssayPdf ? (
                        <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                      ) : (
                        <FileUp className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                      )}
                      <p className="font-medium mb-1">Click to upload Essay Questions PDF</p>
                      <p className="text-sm text-muted-foreground">PDF up to 10MB</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Review Materials Section */}
        {paper && (
          <RankPaperAttachmentsManager 
            rankPaperId={paper.id} 
            paperTitle={paper.title} 
          />
        )}
      </div>

      {/* Bulk Add Dialog */}
      <BulkAddQuestionsDialog
        paperId={paperId || ''}
        maxQuestions={MAX_QUESTIONS}
        currentCount={questions.length}
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
      />
    </AdminLayout>
  );
};

export default AdminRankPaperQuestions;
