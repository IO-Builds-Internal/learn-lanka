import { useParams, Link } from 'react-router-dom';
import { 
  Award, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Users,
  Trophy,
  Play,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StudentLayout from '@/components/layouts/StudentLayout';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Attachment {
  id: string;
  attachment_type: 'VIDEO' | 'ANSWER_PDF';
  title: string | null;
  url: string;
  sort_order: number;
}

const RankPaperResults = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Fetch paper details
  const { data: paper, isLoading: loadingPaper } = useQuery({
    queryKey: ['rank-paper', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's attempt
  const { data: attempt, isLoading: loadingAttempt } = useQuery({
    queryKey: ['rank-attempt-result', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('rank_attempts')
        .select('*')
        .eq('rank_paper_id', id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch marks if published
  const { data: marks } = useQuery({
    queryKey: ['rank-marks', attempt?.id],
    queryFn: async () => {
      if (!attempt) return null;
      const { data } = await supabase
        .from('rank_marks')
        .select('*')
        .eq('attempt_id', attempt.id)
        .single();
      return data;
    },
    enabled: !!attempt,
  });

  // Fetch MCQ answers for review
  const { data: mcqAnswers = [] } = useQuery({
    queryKey: ['rank-mcq-answers', attempt?.id],
    queryFn: async () => {
      if (!attempt) return [];
      const { data } = await supabase
        .from('rank_answers_mcq')
        .select(`
          question_id,
          selected_option_no,
          rank_mcq_questions (
            q_no,
            question_text,
            rank_mcq_options (
              option_no,
              option_text,
              is_correct
            )
          )
        `)
        .eq('attempt_id', attempt.id);
      return data || [];
    },
    enabled: !!attempt,
  });

  // Fetch attachments (videos and answer PDFs) - only visible after marks published
  const { data: attachments = [] } = useQuery({
    queryKey: ['rank-paper-attachments', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rank_paper_attachments')
        .select('*')
        .eq('rank_paper_id', id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Attachment[];
    },
    enabled: !!id && !!marks?.published_at,
  });

  if (loadingPaper || loadingAttempt) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!paper) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle className="w-16 h-16 text-warning mb-4" />
          <h2 className="text-xl font-bold mb-2">Paper Not Found</h2>
          <Link to="/rank-papers">
            <Button>Back to Papers</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  if (!attempt) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">No Attempt Found</h2>
          <p className="text-muted-foreground mb-4">You haven't attempted this paper yet.</p>
          <Link to={`/rank-papers/${id}`}>
            <Button>Go to Paper</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  // Calculate MCQ score
  let correctCount = 0;
  let totalQuestions = mcqAnswers.length;
  
  mcqAnswers.forEach((answer: any) => {
    const correctOption = answer.rank_mcq_questions?.rank_mcq_options?.find((o: any) => o.is_correct);
    if (correctOption && answer.selected_option_no === correctOption.option_no) {
      correctCount++;
    }
  });

  const mcqPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Check for violations
  const tabSwitchCount = (attempt as any).tab_switch_count || 0;
  const windowCloseCount = (attempt as any).window_close_count || 0;
  const hasViolations = tabSwitchCount > 0 || windowCloseCount > 0;

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Link */}
        <Link to="/rank-papers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
          Back to Rank Papers
        </Link>

        {/* Header Card */}
        <Card className="card-elevated">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Exam Completed!</CardTitle>
            <CardDescription>{paper.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Submission Info */}
            <div className="text-center text-sm text-muted-foreground">
              {attempt.submitted_at ? (
                <p>Submitted on {format(new Date(attempt.submitted_at), 'PPpp')}</p>
              ) : attempt.auto_closed ? (
                <p className="text-warning">Auto-submitted (time expired)</p>
              ) : null}
            </div>

            {/* Violations Warning */}
            {!hasViolations && (
              <div className="p-3 rounded-lg border border-success/20 bg-success/5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <p className="text-sm text-success font-medium">No integrity violations recorded ✓</p>
              </div>
            )}

            {hasViolations && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Integrity Violations Recorded</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">These were recorded during your exam session</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-background border text-center">
                        <p className="text-2xl font-bold text-destructive">{tabSwitchCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Browser tab switches</p>
                      </div>
                      <div className="p-3 rounded-lg bg-background border text-center">
                        <p className="text-2xl font-bold text-destructive">{windowCloseCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">App / window switches</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Total: <strong>{tabSwitchCount + windowCloseCount}</strong> violations — This has been reported to the examiner.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MCQ Score - Only show after admin releases results */}
            {paper.has_mcq && marks?.published_at && (
              <div className="p-6 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">MCQ Score</span>
                  <span className="text-3xl font-bold text-primary">
                    {correctCount}/{totalQuestions}
                  </span>
                </div>
                <Progress value={mcqPercentage} className="h-3" />
                <p className="text-center mt-2 text-sm text-muted-foreground">
                  {mcqPercentage}% correct
                </p>
              </div>
            )}

            {/* Official Marks (if published) */}
            {marks?.published_at && (
              <div className="p-6 rounded-xl bg-success/5 border border-success/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-success" />
                  Official Results
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {marks.mcq_score !== null && (
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-2xl font-bold">{marks.mcq_score}</p>
                      <p className="text-xs text-muted-foreground">MCQ</p>
                    </div>
                  )}
                  {marks.short_essay_score !== null && (
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-2xl font-bold">{marks.short_essay_score}</p>
                      <p className="text-xs text-muted-foreground">Short Essay</p>
                    </div>
                  )}
                  {marks.essay_score !== null && (
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-2xl font-bold">{marks.essay_score}</p>
                      <p className="text-xs text-muted-foreground">Essay</p>
                    </div>
                  )}
                  {marks.total_score !== null && (
                    <div className="text-center p-3 bg-primary/10 rounded-lg col-span-2">
                      <p className="text-3xl font-bold text-primary">{marks.total_score}</p>
                      <p className="text-xs text-muted-foreground">Total Score</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Review Notice */}
            {!marks?.published_at && (paper.has_short_essay || paper.has_essay) && (
              <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">Results Pending</p>
                    <p className="text-sm text-muted-foreground">
                      Your essay answers are being reviewed. Official results will be published soon.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Review Videos - Multiple Embedded Players */}
            {marks?.published_at && (attachments.filter(a => a.attachment_type === 'VIDEO').length > 0 || paper.review_video_url) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Review Videos</h3>
                </div>
                
                {/* Legacy single video support */}
                {paper.review_video_url && attachments.filter(a => a.attachment_type === 'VIDEO').length === 0 && (
                  <div className="space-y-2">
                    <YouTubeEmbed 
                      url={paper.review_video_url} 
                      title={`${paper.title} - Review`}
                      className="shadow-lg"
                    />
                  </div>
                )}

                {/* Multiple videos from attachments */}
                {attachments.filter(a => a.attachment_type === 'VIDEO').map((video, idx) => (
                  <div key={video.id} className="space-y-2">
                    {video.title && (
                      <p className="text-sm font-medium text-muted-foreground">{video.title}</p>
                    )}
                    <YouTubeEmbed 
                      url={video.url} 
                      title={video.title || `Review Video ${idx + 1}`}
                      className="shadow-lg"
                    />
                  </div>
                ))}
                
                <p className="text-sm text-muted-foreground text-center">
                  Watch the review to understand the solutions
                </p>
              </div>
            )}

            {/* Answer PDFs */}
            {marks?.published_at && attachments.filter(a => a.attachment_type === 'ANSWER_PDF').length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Answer Sheets</h3>
                </div>
                <div className="space-y-2">
                  {attachments.filter(a => a.attachment_type === 'ANSWER_PDF').map((pdf) => (
                    <a
                      key={pdf.id}
                      href={pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{pdf.title || 'Answer Sheet'}</p>
                        <p className="text-sm text-muted-foreground">Download PDF</p>
                      </div>
                      <Download className="w-5 h-5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard Link */}
            <Link 
              to={`/rank-papers/${id}/leaderboard`}
              className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">View Leaderboard</p>
                  <p className="text-sm text-muted-foreground">See how you rank among others</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

      </div>
    </StudentLayout>
  );
};

export default RankPaperResults;
