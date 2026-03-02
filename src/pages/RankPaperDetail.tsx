import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  FileText, 
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Lock,
  Award,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StudentLayout from '@/components/layouts/StudentLayout';
import PaymentUploadForm from '@/components/payments/PaymentUploadForm';
import BankAccountsList from '@/components/payments/BankAccountsList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const RankPaperDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [starting, setStarting] = useState(false);

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

  // Fetch existing attempt
  const { data: existingAttempt, isLoading: loadingAttempt } = useQuery({
    queryKey: ['rank-attempt', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('rank_attempts')
        .select('*')
        .eq('rank_paper_id', id)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!id && !!user,
  });

  // Check if user has paid for this specific rank paper
  const { data: rankPaperPayment, refetch: refetchPayment } = useQuery({
    queryKey: ['rank-paper-payment', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('payments')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('ref_id', id)
        .eq('payment_type', 'RANK_PAPER')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // Subscribe to realtime payment updates for this user
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('payment-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchPayment();
          queryClient.invalidateQueries({ queryKey: ['class-monthly-access'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchPayment, queryClient]);

  // Check if user has paid for current month's class fee (grants free access to class rank papers)
  const { data: hasClassMonthlyAccess } = useQuery({
    queryKey: ['class-monthly-access', paper?.class_id, user?.id],
    queryFn: async () => {
      if (!user || !paper?.class_id) return false;
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const refIdPattern = `${paper.class_id}-${currentMonth}`;
      
      const { data } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_type', 'CLASS_MONTH')
        .eq('status', 'APPROVED')
        .eq('ref_id', refIdPattern)
        .limit(1)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!paper?.class_id && !!user,
  });

  // Check user enrollment
  const { data: isEnrolled } = useQuery({
    queryKey: ['enrollment-check', paper?.class_id, user?.id],
    queryFn: async () => {
      if (!user || !paper?.class_id) return false;
      const { data } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', paper.class_id)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: !!paper?.class_id && !!user,
  });

  const openExamWindow = (url: string) => {
    const sw = window.screen.availWidth;
    const sh = window.screen.availHeight;

    const popupWidth = Math.min(1400, Math.floor(sw * 0.82));
    const popupHeight = Math.min(900, Math.floor(sh * 0.88));
    const left = Math.floor((sw - popupWidth) / 2);
    const top = Math.floor((sh - popupHeight) / 2);

    // The 'popup' keyword is required by Chrome 87+ to open a real popup window
    // (separate window, no address bar) instead of a new tab.
    // width/height/left/top position it on screen.
    const features = [
      'popup=yes',
      `width=${popupWidth}`,
      `height=${popupHeight}`,
      `left=${left}`,
      `top=${top}`,
    ].join(',');

    const origin = window.location.origin;
    const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;

    let examWindow: Window | null = null;
    try {
      examWindow = (window.top ?? window).open(absoluteUrl, 'exam_window', features);
    } catch {
      examWindow = window.open(absoluteUrl, 'exam_window', features);
    }

    if (examWindow) {
      examWindow.focus();
    } else {
      toast.warning('Popup was blocked! Please allow popups for this site and try again.');
    }
  };

  const handleStartAttempt = async () => {
    if (!user || !paper) return;

    setStarting(true);
    try {
      const { data: existing } = await supabase
        .from('rank_attempts')
        .select('id, submitted_at')
        .eq('rank_paper_id', paper.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        if (existing.submitted_at) {
          toast.info('You have already completed this paper');
          navigate(`/rank-papers/${paper.id}/results`);
        } else {
          openExamWindow(`/rank-papers/${paper.id}/attempt`);
        }
        return;
      }

      openExamWindow(`/rank-papers/${paper.id}/attempt`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start attempt');
    } finally {
      setStarting(false);
      setShowStartDialog(false);
    }
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['rank-paper-payment', id] });
    setShowPaymentDialog(false);
  };

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
          <p className="text-muted-foreground mb-4">This paper may have been removed or is not available.</p>
          <Link to="/rank-papers">
            <Button>Back to Papers</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const hasSubmitted = existingAttempt?.submitted_at;
  const hasOngoingAttempt = existingAttempt && !existingAttempt.submitted_at;
  
  // Determine access status
  const isFree = !paper.fee_amount;
  const hasPaidForPaper = rankPaperPayment?.status === 'APPROVED';
  const hasPendingPayment = rankPaperPayment?.status === 'PENDING';
  const hasRejectedPayment = rankPaperPayment?.status === 'REJECTED';
  
  // Access granted if: free paper, OR paid for paper, OR class monthly payment covers it
  const hasAccess = isFree || hasPaidForPaper || (paper.class_id && hasClassMonthlyAccess);
  const needsPayment = paper.fee_amount && !hasAccess && !hasPendingPayment;

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <Link to="/rank-papers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
          Back to Rank Papers
        </Link>

        {/* Paper Info Card */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">{paper.title}</CardTitle>
                <CardDescription>Grade {paper.grade}</CardDescription>
              </div>
              {hasSubmitted && (
                <Badge className="bg-success/10 text-success border-success/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {hasOngoingAttempt && (
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  <Clock className="w-3 h-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Paper Details */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Time Limit</span>
                </div>
                <p className="font-semibold text-sm sm:text-base">{paper.time_limit_minutes} minutes</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Sections</span>
                </div>
                <p className="font-semibold text-sm sm:text-base">
                  {[
                    paper.has_mcq && 'MCQ',
                    paper.has_short_essay && 'Short Essay',
                    paper.has_essay && 'Essay'
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Access Status Section */}
            {isFree ? (
              <div className="p-4 rounded-lg border bg-success/5 border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Free Paper</span>
                </div>
              </div>
            ) : hasAccess ? (
              <div className="p-4 rounded-lg border bg-success/5 border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {hasClassMonthlyAccess ? 'Access Included (Monthly Fee Paid)' : 'Paper Fee Paid'}
                  </span>
                </div>
              </div>
            ) : hasPendingPayment ? (
              <div className="p-4 rounded-lg border bg-warning/10 border-warning/30">
                <div className="flex items-center gap-2 text-warning">
                  <Clock className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Payment Verification Pending</span>
                    <p className="text-sm text-muted-foreground">We'll verify your payment within 24 hours</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Paper Fee</span>
                  <span className="text-xl font-bold">Rs. {paper.fee_amount}</span>
                </div>
                {paper.class_id && isEnrolled && (
                  <p className="text-sm text-muted-foreground">
                    💡 Pay your monthly class fee to get free access to all class papers
                  </p>
                )}
                {paper.class_id && !isEnrolled && (
                  <p className="text-sm text-muted-foreground">
                    Pay individually or enroll in the class for monthly access
                  </p>
                )}
                {hasRejectedPayment && (
                  <p className="text-sm text-destructive mt-2">
                    Your previous payment was rejected. Please upload a valid slip.
                  </p>
                )}
              </div>
            )}

            {/* Important Instructions */}
            <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-warning">Important Instructions</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs sm:text-sm">
                    <li>Exam opens in a new fullscreen window</li>
                    <li>Once started, the timer cannot be paused</li>
                    <li>Switching tabs or closing the window will be recorded</li>
                    <li>Your answers are auto-saved as you progress</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {hasSubmitted ? (
                <Link to={`/rank-papers/${paper.id}/results`} className="flex-1">
                  <Button className="w-full" variant="outline">
                    <Award className="w-4 h-4 mr-2" />
                    View Results
                  </Button>
                </Link>
              ) : hasOngoingAttempt ? (
                <Button 
                  className="flex-1" 
                  onClick={() => openExamWindow(`/rank-papers/${paper.id}/attempt`)}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Continue Attempt
                </Button>
              ) : hasPendingPayment ? (
                <Button className="flex-1" variant="outline" disabled>
                  <Clock className="w-4 h-4 mr-2" />
                  Awaiting Verification
                </Button>
              ) : needsPayment ? (
                <Button 
                  className="flex-1" 
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay & Unlock (Rs. {paper.fee_amount})
                </Button>
              ) : hasAccess ? (
                <Button 
                  className="flex-1" 
                  onClick={() => setShowStartDialog(true)}
                  disabled={starting}
                >
                  {starting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  Start Paper
                </Button>
              ) : (
                <Button className="flex-1" variant="outline" disabled>
                  <Lock className="w-4 h-4 mr-2" />
                  Access Required
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Link */}
        <Link to={`/rank-papers/${paper.id}/leaderboard`}>
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <span className="font-medium">View Leaderboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Start Confirmation Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Exam?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to start <strong>{paper.title}</strong>.
              </p>
              <p>
                You will have <strong>{paper.time_limit_minutes} minutes</strong> to complete this paper.
                The timer will start immediately and cannot be paused.
              </p>
              <p className="text-warning">
                Make sure you are ready before proceeding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={starting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartAttempt} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Now'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Pay for {paper.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Upload your bank transfer slip to unlock this paper
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <BankAccountsList />
            
            <PaymentUploadForm
              paymentType="RANK_PAPER"
              refId={paper.id}
              amount={paper.fee_amount || 0}
              title="Upload Payment Slip"
              currentStatus={rankPaperPayment?.status as any}
              onSuccess={handlePaymentSuccess}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
};

export default RankPaperDetail;
