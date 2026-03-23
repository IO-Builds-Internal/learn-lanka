import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  ShoppingBag, 
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Code2,
  Wand2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StudentLayout from '@/components/layouts/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useRankPaperStatus } from '@/hooks/useRankPaperStatus';
import { downloadGeneratedPaperPdf } from '@/lib/generatePaperPdf';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentYearMonth = new Date().toISOString().slice(0, 7);

  // Fetch enrolled classes
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(`
          *,
          classes (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch payments for current month
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.id, currentYearMonth],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_type', 'CLASS_MONTH');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch available rank papers
  const { data: rankPapers = [] } = useQuery({
    queryKey: ['rank-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('*')
        .eq('publish_status', 'PUBLISHED')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch rank paper attempt statuses
  const { data: paperStatuses = [] } = useRankPaperStatus();

  // Fetch previously generated papers
  const { data: generatedPapers = [] } = useQuery({
    queryKey: ['generated-papers-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('generated_papers')
        .select('id, grade, paper_type, mcq_count, short_essay_count, essay_count, created_at, question_ids')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleDownloadPaper = async (paper: any) => {
    setDownloadingId(paper.id);
    try {
      await downloadGeneratedPaperPdf({
        paperId: paper.id,
        grade: paper.grade,
        paperType: paper.paper_type,
        questionIds: paper.question_ids || [],
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Get payment status for a class (considers private vs public classes)
  const getPaymentStatus = (classId: string, isPrivate: boolean, paymentReceivedAt: string | null): 'PAID' | 'PENDING' | 'UNPAID' | 'ENROLLED' => {
    // For private classes, show "Enrolled" status (no monthly payment tracking)
    if (isPrivate) {
      return paymentReceivedAt ? 'PAID' : 'ENROLLED';
    }
    // For public classes, check monthly payment
    const expectedRefId = `${classId}-${currentYearMonth}`;
    const payment = payments.find(p => p.ref_id === expectedRefId);
    if (!payment) return 'UNPAID';
    if (payment.status === 'APPROVED') return 'PAID';
    if (payment.status === 'PENDING') return 'PENDING';
    return 'UNPAID';
  };

  // Get attempt status for a rank paper
  const getPaperStatus = (paperId: string) => {
    return paperStatuses.find(s => s.paperId === paperId);
  };

  const paidCount = enrollments.filter(e => {
    const cls = e.classes as any;
    return getPaymentStatus(e.class_id, cls?.is_private || false, (e as any).payment_received_at) === 'PAID';
  }).length;
  const completedPaperCount = paperStatuses.filter(s => s.status === 'SUBMITTED' || s.status === 'MARKED').length;

  if (enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="section-spacing">
        {/* Welcome Section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Welcome, {profile?.first_name || 'Student'}! 👋
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Continue your learning journey
            </p>
          </div>
          <Link to="/classes">
            <Button variant="accent" size="sm" className="w-full sm:w-auto">
              Browse Classes
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{enrollments.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{paidCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{completedPaperCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Done</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">—</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Classes */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">My Classes</h2>
            <Link to="/classes" className="text-xs sm:text-sm text-primary hover:text-primary/80">
              View All
            </Link>
          </div>

          {enrollments.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="font-medium text-foreground mb-2 text-sm sm:text-base">No classes enrolled</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Browse our catalog to find classes</p>
                <Link to="/classes">
                  <Button size="sm">Browse Classes</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {enrollments.map((enrollment) => {
                const cls = enrollment.classes as any;
                const paymentStatus = getPaymentStatus(
                  enrollment.class_id, 
                  cls?.is_private || false, 
                  (enrollment as any).payment_received_at
                );
                const isPrivateClass = cls?.is_private;
                return (
                  <Card key={enrollment.id} className="card-elevated hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm sm:text-lg line-clamp-1">{cls?.title}</CardTitle>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs shrink-0",
                            paymentStatus === 'PAID' && 'badge-paid',
                            paymentStatus === 'PENDING' && 'badge-pending',
                            paymentStatus === 'UNPAID' && 'badge-unpaid',
                            paymentStatus === 'ENROLLED' && 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          {paymentStatus}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                        {cls?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">{currentMonth}</span>
                            <span className="xs:hidden">{new Date().toLocaleString('default', { month: 'short' })}</span>
                          </span>
                          <span>Rs. {cls?.monthly_fee_amount?.toLocaleString()}</span>
                        </div>
                        <Link to={`/classes/${enrollment.class_id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                            View
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
          <Link to="/classes" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-primary/10 mb-1 sm:mb-3">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Classes</h3>
              </CardContent>
            </Card>
          </Link>

          <Link to="/rank-papers" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-accent/10 mb-1 sm:mb-3">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-accent" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Rank Papers</h3>
              </CardContent>
            </Card>
          </Link>

          <Link to="/shop" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-success/10 mb-1 sm:mb-3">
                  <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Shop</h3>
              </CardContent>
            </Card>
          </Link>

          <Link to="/papers" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-secondary mb-1 sm:mb-3">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-secondary-foreground" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Past Papers</h3>
              </CardContent>
            </Card>
          </Link>

          <Link to="/playground" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 mb-1 sm:mb-3">
                  <Code2 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Playground</h3>
              </CardContent>
            </Card>
          </Link>

          <Link to="/contact" className="block">
            <Card className="card-elevated hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-2 sm:p-4 flex flex-col items-center text-center">
                <div className="p-2 sm:p-3 rounded-full bg-warning/10 mb-1 sm:mb-3">
                  <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-warning" />
                </div>
                <h3 className="font-medium text-xs sm:text-sm">Contact</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upcoming Rank Papers */}
        {rankPapers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Available Papers</h2>
              <Link to="/rank-papers" className="text-xs sm:text-sm text-primary hover:text-primary/80">
                View All
              </Link>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {rankPapers.slice(0, 2).map((paper) => {
                const status = getPaperStatus(paper.id);
                const hasAttempted = !!status;
                const isCompleted = status?.status === 'SUBMITTED' || status?.status === 'MARKED';
                const isInProgress = status?.status === 'IN_PROGRESS';
                
                return (
                  <Card key={paper.id} className="card-elevated">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{paper.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">Grade {paper.grade}</p>
                        </div>
                        {isCompleted ? (
                          <Badge className="bg-success/10 text-success border-success/20 shrink-0">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {status?.marksPublished ? `${status.score} marks` : 'Submitted'}
                          </Badge>
                        ) : isInProgress ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20 shrink-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            In Progress
                          </Badge>
                        ) : paper.fee_amount ? (
                          <Badge variant="outline" className="text-xs shrink-0">Rs. {paper.fee_amount}</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {paper.time_limit_minutes}min
                        </span>
                        <span className="truncate">
                          {[
                            paper.has_mcq && 'MCQ',
                            paper.has_short_essay && 'Short',
                            paper.has_essay && 'Essay'
                          ].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                      <Link to={`/rank-papers/${paper.id}`}>
                        <Button variant={isCompleted ? "secondary" : "outline"} className="w-full" size="sm">
                          {isCompleted ? 'View Results' : isInProgress ? 'Continue' : 'Start Paper'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* My Generated Papers */}
        {generatedPapers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                My Generated Papers
              </h2>
              <Link to="/paper-generator" className="text-xs sm:text-sm text-primary hover:text-primary/80">
                Generate New
              </Link>
            </div>
            <div className="space-y-2">
              {generatedPapers.map((paper: any) => {
                const createdAt = new Date(paper.created_at);
                const parts = [
                  paper.mcq_count > 0 && `${paper.mcq_count} MCQ`,
                  paper.short_essay_count > 0 && `${paper.short_essay_count} S.Essay`,
                  paper.essay_count > 0 && `${paper.essay_count} Essay`,
                ].filter(Boolean).join(' · ');
                return (
                  <Card key={paper.id} className="card-elevated">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-primary">{paper.id}</span>
                          <Badge variant="outline" className="text-xs">
                            {paper.paper_type === 'DAILY' ? 'Daily' : 'Full'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">Grade {paper.grade}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {parts} &nbsp;·&nbsp; {createdAt.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPaper(paper)}
                        disabled={downloadingId === paper.id}
                        className="shrink-0"
                      >
                        {downloadingId === paper.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        <span className="ml-1.5 hidden sm:inline">Download PDF</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
