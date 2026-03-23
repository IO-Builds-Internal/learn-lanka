import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, Loader2, Search, Users, CheckCircle, Clock, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const AdminRankPaperAttemptsIndex = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Fetch all rank papers with attempt counts
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['admin-rank-papers-with-attempts'],
    queryFn: async () => {
      const { data: rankPapers, error } = await supabase
        .from('rank_papers')
        .select('id, title, grade, publish_status, created_at, has_mcq, has_essay, has_short_essay')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch attempt counts per paper
      const ids = rankPapers.map(p => p.id);
      const { data: attempts } = await supabase
        .from('rank_attempts')
        .select('id, rank_paper_id, submitted_at')
        .in('rank_paper_id', ids);

      // Fetch published marks counts
      const attemptIds = (attempts || []).map(a => a.id);
      const { data: marks } = attemptIds.length
        ? await supabase.from('rank_marks').select('attempt_id, published_at').in('attempt_id', attemptIds)
        : { data: [] };

      const marksByAttempt = new Map((marks || []).map(m => [m.attempt_id, m]));

      return rankPapers.map(p => {
        const paperAttempts = (attempts || []).filter(a => a.rank_paper_id === p.id);
        const submitted = paperAttempts.filter(a => a.submitted_at).length;
        const published = paperAttempts.filter(a => marksByAttempt.get(a.id)?.published_at).length;
        return { ...p, total: paperAttempts.length, submitted, published };
      });
    },
  });

  const filtered = papers.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    if (status === 'published') return <Badge className="bg-success/10 text-success border-success/20">Published</Badge>;
    if (status === 'draft') return <Badge variant="outline">Draft</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Rank Paper Attempts
          </h1>
          <p className="text-muted-foreground">Select a paper to view and mark student attempts</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search papers..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No papers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(paper => (
              <Card
                key={paper.id}
                className="card-elevated cursor-pointer hover:border-primary/40 transition-colors group"
                onClick={() => navigate(`/admin/rank-papers/${paper.id}/attempts`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{paper.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0">Grade {paper.grade}</Badge>
                      {statusBadge(paper.publish_status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {paper.total} attempt{paper.total !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {paper.submitted} submitted
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {paper.published} published
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(paper.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Question type badges */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {paper.has_mcq && <Badge variant="secondary" className="text-xs">MCQ</Badge>}
                    {paper.has_short_essay && <Badge variant="secondary" className="text-xs">S.Essay</Badge>}
                    {paper.has_essay && <Badge variant="secondary" className="text-xs">Essay</Badge>}
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRankPaperAttemptsIndex;
