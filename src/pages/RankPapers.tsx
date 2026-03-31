import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Clock, 
  FileText, 
  Award, 
  ChevronRight,
  CheckCircle,
  Lock,
  Loader2,
  History,
  TrendingUp,
  Play,
  AlertCircle,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import StudentLayout from '@/components/layouts/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const RankPapers = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [mediumFilter, setMediumFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Fetch enabled subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, slug').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch published rank papers
  const { data: rankPapers = [], isLoading: loadingPapers } = useQuery({
    queryKey: ['rank-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('*')
        .eq('publish_status', 'PUBLISHED')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's attempts (all — including in-progress)
  const { data: attempts = [] } = useQuery({
    queryKey: ['rank-attempts-full', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('rank_attempts')
        .select('rank_paper_id, submitted_at, started_at, ends_at, auto_closed, tab_switch_count, window_close_count')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch published marks for user's attempts
  const { data: marksData = [] } = useQuery({
    queryKey: ['rank-marks-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // get attempt ids the user has
      const attemptIds = attempts.map((a: any) => a.rank_paper_id);
      if (attemptIds.length === 0) return [];

      // fetch submitted attempts to get their ids
      const { data: submittedAttempts } = await supabase
        .from('rank_attempts')
        .select('id, rank_paper_id')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null);

      if (!submittedAttempts?.length) return [];

      const { data, error } = await supabase
        .from('rank_marks')
        .select('attempt_id, total_score, mcq_score, published_at')
        .in('attempt_id', submittedAttempts.map(a => a.id))
        .not('published_at', 'is', null);
      if (error) throw error;

      // map to rank_paper_id
      const attemptMap = new Map(submittedAttempts.map(a => [a.id, a.rank_paper_id]));
      return (data || []).map(m => ({
        ...m,
        rank_paper_id: attemptMap.get(m.attempt_id),
      }));
    },
    enabled: !!user && attempts.length > 0,
  });

  // Fetch user's rank paper payments
  const { data: paidPapers = [] } = useQuery({
    queryKey: ['rank-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('ref_id')
        .eq('user_id', user.id)
        .eq('payment_type', 'RANK_PAPER')
        .eq('status', 'APPROVED');
      if (error) throw error;
      return data?.map(p => p.ref_id) || [];
    },
    enabled: !!user,
  });

  const attemptMap = new Map(attempts.map((a: any) => [a.rank_paper_id, a]));
  const marksMap = new Map(marksData.map((m: any) => [m.rank_paper_id, m]));

  const applyFilters = (papers: any[]) => papers.filter((paper) => {
    const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || paper.grade.toString() === gradeFilter;
    const matchesMedium = mediumFilter === 'all' || (paper.medium || 'sinhala') === mediumFilter;
    return matchesSearch && matchesGrade && matchesMedium;
  });

  // Split: history = submitted attempts; available = not attempted at all
  const submittedIds = new Set(attempts.filter((a: any) => a.submitted_at).map((a: any) => a.rank_paper_id));
  const inProgressIds = new Set(attempts.filter((a: any) => !a.submitted_at).map((a: any) => a.rank_paper_id));

  const availablePapers = applyFilters(rankPapers.filter(p => !submittedIds.has(p.id)));
  const historyPapers = applyFilters(rankPapers.filter(p => submittedIds.has(p.id)));

  const isLoading = loadingPapers;

  if (isLoading) {
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
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rank Papers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Test your knowledge and compete
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[10, 11, 12, 13].map((g) => (
                <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mediumFilter} onValueChange={setMediumFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-10">
              <SelectValue placeholder="Medium" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mediums</SelectItem>
              <SelectItem value="sinhala">Sinhala</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="tamil">Tamil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{submittedIds.size}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-warning">{inProgressIds.size}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-success">{availablePapers.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Available Papers ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Available Papers</h2>
            <Badge variant="secondary" className="text-xs">{availablePapers.length}</Badge>
          </div>

          {availablePapers.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="w-10 h-10 text-success mb-3" />
                <p className="font-medium text-foreground text-sm">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">You've attempted all available papers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {availablePapers.map((paper) => {
                const attempt = attemptMap.get(paper.id);
                const isInProgress = inProgressIds.has(paper.id);
                const hasPaid = paidPapers.includes(paper.id) || !paper.fee_amount;
                const needsPayment = paper.fee_amount && !hasPaid;

                return (
                  <Card key={paper.id} className="card-elevated hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-sm sm:text-base line-clamp-1">{paper.title}</CardTitle>
                      <CardDescription className="text-xs">Grade {paper.grade} · <span className="capitalize">{paper.medium || 'Sinhala'}</span></CardDescription>
                        </div>
                        {isInProgress ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-xs shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            In Progress
                          </Badge>
                        ) : needsPayment ? (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Lock className="w-3 h-3 mr-1" />
                            Rs. {paper.fee_amount}
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                            Free
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 sm:p-4 pt-0 sm:pt-0">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {paper.time_limit_minutes}min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {[paper.has_mcq && 'MCQ', paper.has_short_essay && 'Short', paper.has_essay && 'Essay'].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      <Link to={`/rank-papers/${paper.id}`} className="block">
                        <Button className="w-full" size="sm" variant={isInProgress ? 'outline' : 'default'}>
                          {isInProgress ? (
                            <><Clock className="w-3 h-3 mr-2" />Continue</>
                          ) : needsPayment ? (
                            <><Lock className="w-3 h-3 mr-2" />Pay & Start</>
                          ) : (
                            <>Start Paper<ChevronRight className="w-3 h-3 ml-2" /></>
                          )}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── History ── */}
        {historyPapers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Attempt History</h2>
              <Badge variant="secondary" className="text-xs">{historyPapers.length}</Badge>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {historyPapers.map((paper) => {
                const attempt = attemptMap.get(paper.id) as any;
                const marks = marksMap.get(paper.id) as any;
                const hasMarks = marks?.published_at;
                const violations = attempt ? (attempt.tab_switch_count || 0) + (attempt.window_close_count || 0) : 0;

                return (
                  <Card key={paper.id} className="card-elevated border-success/20 bg-success/2">
                    <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-sm sm:text-base line-clamp-1">{paper.title}</CardTitle>
                          <CardDescription className="text-xs">
                            Grade {paper.grade} · <span className="capitalize">{paper.medium || 'Sinhala'}</span>
                            {attempt?.submitted_at && (
                              <span className="ml-2">· {format(new Date(attempt.submitted_at), 'MMM d, yyyy')}</span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge className="bg-success/10 text-success border-success/20 text-xs shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 sm:p-4 pt-0 sm:pt-0">
                      {/* Score / Pending */}
                      {hasMarks ? (
                        <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Trophy className="w-3 h-3" />
                              Total Score
                            </span>
                            <span className="font-bold text-primary text-sm">{marks.total_score ?? '—'}</span>
                          </div>
                          {marks.mcq_score !== null && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>MCQ</span>
                              <span className="font-medium">{marks.mcq_score}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          Results pending review
                        </div>
                      )}

                      {/* Violations indicator */}
                      {violations > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive/80">
                          <AlertCircle className="w-3 h-3" />
                          {violations} violation{violations > 1 ? 's' : ''} recorded
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link to={`/rank-papers/${paper.id}/results`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <TrendingUp className="w-3 h-3 mr-1.5" />
                            View Results
                          </Button>
                        </Link>
                        <Link to={`/rank-papers/${paper.id}/leaderboard`}>
                          <Button variant="ghost" size="sm" className="px-2.5">
                            <Award className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {rankPapers.length === 0 && (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No papers available</h3>
              <p className="text-sm text-muted-foreground">Check back soon for new papers</p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default RankPapers;
