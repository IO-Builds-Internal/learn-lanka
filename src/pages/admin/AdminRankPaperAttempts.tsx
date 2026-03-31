import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Loader2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Award,
  Send,
  Download,
  AlertTriangle,
  SendHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { invokeFunction } from '@/lib/functions';

interface RankPaper {
  id: string;
  title: string;
  grade: number;
  has_mcq: boolean;
  has_short_essay: boolean;
  has_essay: boolean;
  class_id: string | null;
  fee_amount: number | null;
}

interface Attempt {
  id: string;
  user_id: string;
  started_at: string;
  ends_at: string;
  submitted_at: string | null;
  auto_closed: boolean;
  tab_switch_count: number;
  window_close_count: number;
  profile?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface McqAnswer {
  id: string;
  question_id: string;
  selected_option_no: number | null;
  question?: {
    q_no: number;
    question_text: string | null;
  };
  correct_option?: number;
}

interface EssayUpload {
  id: string;
  upload_type: string;
  pdf_url: string;
  created_at: string;
}

interface RankMark {
  id: string;
  attempt_id: string;
  mcq_score: number | null;
  short_essay_score: number | null;
  essay_score: number | null;
  total_score: number | null;
  reviewed_by: string | null;
  published_at: string | null;
}

const AdminRankPaperAttempts = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [markingDialog, setMarkingDialog] = useState<Attempt | null>(null);
  const [mcqScore, setMcqScore] = useState('');
  const [shortEssayScore, setShortEssayScore] = useState('');
  const [essayScore, setEssayScore] = useState('');

  // Fetch paper details
  const { data: paper, isLoading: loadingPaper } = useQuery({
    queryKey: ['rank-paper', paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('id, title, grade, has_mcq, has_short_essay, has_essay, class_id, fee_amount')
        .eq('id', paperId!)
        .single();
      if (error) throw error;
      return data as RankPaper;
    },
    enabled: !!paperId,
  });

  // Fetch attempts with profile info
  const { data: attempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['rank-paper-attempts', paperId],
    queryFn: async () => {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('rank_attempts')
        .select('*')
        .eq('rank_paper_id', paperId!)
        .order('started_at', { ascending: false });
      
      if (attemptsError) throw attemptsError;

      // Fetch profiles for each attempt
      const userIds = [...new Set(attemptsData.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return attemptsData.map(attempt => ({
        ...attempt,
        profile: profileMap.get(attempt.user_id)
      })) as Attempt[];
    },
    enabled: !!paperId,
  });

  // Fetch marks for all attempts
  const { data: marksMap = {} } = useQuery({
    queryKey: ['rank-marks', paperId],
    queryFn: async () => {
      const attemptIds = attempts.map(a => a.id);
      if (attemptIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('rank_marks')
        .select('*')
        .in('attempt_id', attemptIds);
      
      if (error) throw error;
      
      const map: Record<string, RankMark> = {};
      data?.forEach(mark => {
        map[mark.attempt_id] = mark;
      });
      return map;
    },
    enabled: attempts.length > 0,
  });

  // Fetch MCQ answers for selected attempt
  const { data: mcqAnswers = [] } = useQuery({
    queryKey: ['mcq-answers', selectedAttempt?.id],
    queryFn: async () => {
      // Get the answers
      const { data: answers, error } = await supabase
        .from('rank_answers_mcq')
        .select('id, question_id, selected_option_no')
        .eq('attempt_id', selectedAttempt!.id);
      
      if (error) throw error;

      // Get question details and correct answers
      const questionIds = answers?.map(a => a.question_id) || [];
      const { data: questions } = await supabase
        .from('rank_mcq_questions')
        .select('id, q_no, question_text')
        .in('id', questionIds);

      const { data: options } = await supabase
        .from('rank_mcq_options')
        .select('question_id, option_no, is_correct')
        .in('question_id', questionIds)
        .eq('is_correct', true);

      const questionMap = new Map(questions?.map(q => [q.id, q]) || []);
      const correctMap = new Map(options?.map(o => [o.question_id, o.option_no]) || []);

      return answers?.map(ans => ({
        ...ans,
        question: questionMap.get(ans.question_id),
        correct_option: correctMap.get(ans.question_id)
      })).sort((a, b) => (a.question?.q_no || 0) - (b.question?.q_no || 0)) as McqAnswer[];
    },
    enabled: !!selectedAttempt?.id && paper?.has_mcq,
  });

  // Fetch essay uploads for selected attempt
  const { data: essayUploads = [] } = useQuery({
    queryKey: ['essay-uploads', selectedAttempt?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_answers_uploads')
        .select('*')
        .eq('attempt_id', selectedAttempt!.id);
      
      if (error) throw error;
      return data as EssayUpload[];
    },
    enabled: !!selectedAttempt?.id,
  });

  // Save marks mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      if (!markingDialog) return;
      
      const totalScore = 
        (parseInt(mcqScore) || 0) + 
        (parseInt(shortEssayScore) || 0) + 
        (parseInt(essayScore) || 0);

      const markData = {
        attempt_id: markingDialog.id,
        mcq_score: mcqScore ? parseInt(mcqScore) : null,
        short_essay_score: shortEssayScore ? parseInt(shortEssayScore) : null,
        essay_score: essayScore ? parseInt(essayScore) : null,
        total_score: totalScore,
        reviewed_by: user?.id,
      };

      const existingMark = marksMap[markingDialog.id];
      
      if (existingMark) {
        const { error } = await supabase
          .from('rank_marks')
          .update(markData)
          .eq('id', existingMark.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rank_marks')
          .insert(markData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Marks saved!');
      queryClient.invalidateQueries({ queryKey: ['rank-marks', paperId] });
      setMarkingDialog(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save marks');
    },
  });

  // Publish marks mutation
  const publishMarksMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      const { error } = await supabase
        .from('rank_marks')
        .update({ published_at: new Date().toISOString() })
        .eq('attempt_id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marks published! Student can now view their results.');
      queryClient.invalidateQueries({ queryKey: ['rank-marks', paperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish marks');
    },
  });

  // Publish ALL marks mutation with SMS notification
  const publishAllMarksMutation = useMutation({
    mutationFn: async () => {
      // Get all attempts that have marks but aren't published
      const markedButNotPublished = attempts.filter(a => {
        const mark = marksMap[a.id];
        return mark && mark.total_score !== null && !mark.published_at;
      });
      
      if (markedButNotPublished.length === 0) {
        throw new Error('No unmarked or unpublished results to publish');
      }

      const attemptIds = markedButNotPublished.map(a => a.id);
      const { error } = await supabase
        .from('rank_marks')
        .update({ published_at: new Date().toISOString() })
        .in('attempt_id', attemptIds);
      
      if (error) throw error;

      // Send SMS notification to eligible students
      if (paper) {
        await invokeFunction('send-sms-notification', {
          body: {
            type: 'rank_results_published',
            rankPaperId: paper.id,
            classId: paper.class_id,
            data: {
              paperTitle: paper.title,
              grade: paper.grade,
            },
          },
        });
      }

      return attemptIds.length;
    },
    onSuccess: (count) => {
      toast.success(`Published ${count} results! SMS sent to eligible students.`);
      queryClient.invalidateQueries({ queryKey: ['rank-marks', paperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish all marks');
    },
  });

  // Unpublish marks mutation
  const unpublishMarksMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      const { error } = await supabase
        .from('rank_marks')
        .update({ published_at: null })
        .eq('attempt_id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marks unpublished.');
      queryClient.invalidateQueries({ queryKey: ['rank-marks', paperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unpublish marks');
    },
  });

  const openMarkingDialog = (attempt: Attempt) => {
    const existingMark = marksMap[attempt.id];
    setMcqScore(existingMark?.mcq_score?.toString() || '');
    setShortEssayScore(existingMark?.short_essay_score?.toString() || '');
    setEssayScore(existingMark?.essay_score?.toString() || '');
    setMarkingDialog(attempt);
  };

  const getAttemptStatus = (attempt: Attempt) => {
    if (attempt.submitted_at) {
      return <Badge className="bg-success text-success-foreground">Submitted</Badge>;
    }
    if (attempt.auto_closed) {
      return <Badge variant="secondary">Auto-closed</Badge>;
    }
    const now = new Date();
    const endsAt = new Date(attempt.ends_at);
    if (now > endsAt) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="outline">In Progress</Badge>;
  };

  const getMarkStatus = (attemptId: string) => {
    const mark = marksMap[attemptId];
    if (!mark) {
      return <Badge variant="outline">Not Marked</Badge>;
    }
    if (mark.published_at) {
      return <Badge className="bg-success text-success-foreground">Published</Badge>;
    }
    return <Badge variant="secondary">Marked (Not Published)</Badge>;
  };

  const calculateMcqScore = () => {
    let correct = 0;
    let total = mcqAnswers.length;
    mcqAnswers.forEach(ans => {
      if (ans.selected_option_no === ans.correct_option) {
        correct++;
      }
    });
    return { correct, total };
  };

  if (loadingPaper || loadingAttempts) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!paper) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p>Paper not found</p>
          <Button className="mt-4" onClick={() => navigate(window.location.pathname.startsWith('/teacher') ? '/teacher/rank-papers' : '/admin/rank-papers')}>
            Back to Papers
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(window.location.pathname.startsWith('/teacher') ? '/teacher/rank-papers' : '/admin/rank-papers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{paper.title}</h1>
            <p className="text-muted-foreground">View attempts and manage marks • Grade {paper.grade}</p>
          </div>
          <Badge variant="outline">{attempts.length} Attempts</Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{attempts.length}</p>
                  <p className="text-xs text-muted-foreground">Total Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {attempts.filter(a => a.submitted_at).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(marksMap).filter(m => m.total_score !== null).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Marked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(marksMap).filter(m => m.published_at).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attempts Table */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student Attempts</CardTitle>
              <CardDescription>View submissions and manage marks</CardDescription>
            </div>
            {/* Publish All Button */}
            {Object.values(marksMap).filter(m => m.total_score !== null && !m.published_at).length > 0 && (
              <Button 
                onClick={() => publishAllMarksMutation.mutate()}
                disabled={publishAllMarksMutation.isPending}
                className="gap-2"
              >
                {publishAllMarksMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
                Publish All Results ({Object.values(marksMap).filter(m => m.total_score !== null && !m.published_at).length})
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Mark Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const mark = marksMap[attempt.id];
                  return (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {attempt.profile?.first_name} {attempt.profile?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatPhoneDisplay(attempt.profile?.phone)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {format(new Date(attempt.started_at), 'MMM d, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>{getAttemptStatus(attempt)}</TableCell>
                      <TableCell>
                        {(attempt.tab_switch_count > 0 || attempt.window_close_count > 0) ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-destructive">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span className="text-sm font-medium">
                                {attempt.tab_switch_count + attempt.window_close_count} violations
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-5">
                              {attempt.tab_switch_count > 0 && (
                                <p>Tab: {attempt.tab_switch_count}×</p>
                              )}
                              {attempt.window_close_count > 0 && (
                                <p>App switch: {attempt.window_close_count}×</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-success text-sm">✓ Clean</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mark?.total_score !== null && mark?.total_score !== undefined ? (
                          <span className="font-medium">{mark.total_score}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getMarkStatus(attempt.id)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedAttempt(attempt)}
                            title="View Answers"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openMarkingDialog(attempt)}
                            title="Add/Edit Marks"
                          >
                            <Award className="w-4 h-4" />
                          </Button>
                          {mark && !mark.published_at && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => publishMarksMutation.mutate(attempt.id)}
                              title="Publish Marks"
                              disabled={publishMarksMutation.isPending}
                            >
                              <Send className="w-4 h-4 text-success" />
                            </Button>
                          )}
                          {mark?.published_at && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => unpublishMarksMutation.mutate(attempt.id)}
                              title="Unpublish Marks"
                              disabled={unpublishMarksMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {attempts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No attempts yet</h3>
                <p className="text-sm text-muted-foreground">Students will appear here once they start the exam</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Answers Dialog */}
      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Answers - {selectedAttempt?.profile?.first_name} {selectedAttempt?.profile?.last_name}
            </DialogTitle>
            <DialogDescription>
              Review student's submitted answers
            </DialogDescription>
          </DialogHeader>

          {/* Integrity Summary */}
          {selectedAttempt && (
            <div className={`p-3 rounded-lg border text-sm flex flex-wrap gap-4 ${
              (selectedAttempt.tab_switch_count > 0 || selectedAttempt.window_close_count > 0)
                ? 'bg-destructive/5 border-destructive/30'
                : 'bg-success/5 border-success/20'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${
                  (selectedAttempt.tab_switch_count > 0 || selectedAttempt.window_close_count > 0)
                    ? 'text-destructive' : 'text-success'
                }`} />
                <span className="font-medium">Integrity Report</span>
              </div>
              <div className="flex gap-4 text-muted-foreground">
                <span>
                  Tab switches:{' '}
                  <strong className={selectedAttempt.tab_switch_count > 0 ? 'text-destructive' : 'text-success'}>
                    {selectedAttempt.tab_switch_count}
                  </strong>
                </span>
                <span>
                  App/Browser switches:{' '}
                  <strong className={selectedAttempt.window_close_count > 0 ? 'text-destructive' : 'text-success'}>
                    {selectedAttempt.window_close_count}
                  </strong>
                </span>
                <span>
                  Total violations:{' '}
                  <strong className={(selectedAttempt.tab_switch_count + selectedAttempt.window_close_count) > 0 ? 'text-destructive' : 'text-success'}>
                    {selectedAttempt.tab_switch_count + selectedAttempt.window_close_count}
                  </strong>
                </span>
              </div>
            </div>
          )}
          
          <Tabs defaultValue={paper.has_mcq ? "mcq" : (paper.has_short_essay ? "short_essay" : "essay")}>
            <TabsList>
              {paper.has_mcq && <TabsTrigger value="mcq">MCQ Answers</TabsTrigger>}
              {paper.has_short_essay && <TabsTrigger value="short_essay">Short Essay</TabsTrigger>}
              {paper.has_essay && <TabsTrigger value="essay">Essay</TabsTrigger>}
            </TabsList>

            {paper.has_mcq && (
              <TabsContent value="mcq" className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span>Auto-calculated MCQ Score:</span>
                  <span className="font-bold text-lg">
                    {calculateMcqScore().correct} / {calculateMcqScore().total}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Q#</TableHead>
                      <TableHead>Selected</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mcqAnswers.map((ans) => (
                      <TableRow key={ans.id}>
                        <TableCell>Q{ans.question?.q_no}</TableCell>
                        <TableCell>
                          {ans.selected_option_no !== null ? (
                            <Badge variant="outline">{String.fromCharCode(64 + ans.selected_option_no)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{String.fromCharCode(64 + (ans.correct_option || 0))}</Badge>
                        </TableCell>
                        <TableCell>
                          {ans.selected_option_no === ans.correct_option ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            )}

            {paper.has_short_essay && (
              <TabsContent value="short_essay" className="space-y-4">
                {essayUploads.filter(u => u.upload_type === 'SHORT_ESSAY').map(upload => (
                  <Card key={upload.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-medium">Short Essay Submission</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {format(new Date(upload.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <a href={upload.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          View PDF
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {essayUploads.filter(u => u.upload_type === 'SHORT_ESSAY').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No short essay uploaded
                  </div>
                )}
              </TabsContent>
            )}

            {paper.has_essay && (
              <TabsContent value="essay" className="space-y-4">
                {essayUploads.filter(u => u.upload_type === 'ESSAY').map(upload => (
                  <Card key={upload.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-medium">Essay Submission</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {format(new Date(upload.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <a href={upload.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          View PDF
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {essayUploads.filter(u => u.upload_type === 'ESSAY').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No essay uploaded
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Marking Dialog */}
      <Dialog open={!!markingDialog} onOpenChange={() => setMarkingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add/Edit Marks - {markingDialog?.profile?.first_name} {markingDialog?.profile?.last_name}
            </DialogTitle>
            <DialogDescription>
              Enter scores for each section. Marks will only be visible to the student after you publish them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {paper.has_mcq && (
              <div className="space-y-2">
                <Label htmlFor="mcqScore">MCQ Score</Label>
                <Input 
                  id="mcqScore"
                  type="number"
                  placeholder="e.g., 35"
                  value={mcqScore}
                  onChange={(e) => setMcqScore(e.target.value)}
                />
              </div>
            )}
            {paper.has_short_essay && (
              <div className="space-y-2">
                <Label htmlFor="shortEssayScore">Short Essay Score</Label>
                <Input 
                  id="shortEssayScore"
                  type="number"
                  placeholder="e.g., 20"
                  value={shortEssayScore}
                  onChange={(e) => setShortEssayScore(e.target.value)}
                />
              </div>
            )}
            {paper.has_essay && (
              <div className="space-y-2">
                <Label htmlFor="essayScore">Essay Score</Label>
                <Input 
                  id="essayScore"
                  type="number"
                  placeholder="e.g., 45"
                  value={essayScore}
                  onChange={(e) => setEssayScore(e.target.value)}
                />
              </div>
            )}
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Score:</span>
                <span className="text-xl font-bold">
                  {(parseInt(mcqScore) || 0) + (parseInt(shortEssayScore) || 0) + (parseInt(essayScore) || 0)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkingDialog(null)}>Cancel</Button>
            <Button 
              onClick={() => saveMarksMutation.mutate()}
              disabled={saveMarksMutation.isPending}
            >
              {saveMarksMutation.isPending ? 'Saving...' : 'Save Marks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRankPaperAttempts;
