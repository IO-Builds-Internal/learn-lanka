import TeacherLayout from '@/components/layouts/TeacherLayout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Plus, Search, MoreVertical, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TeacherPapers = () => {
  const { user, profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subject } = useQuery({
    queryKey: ['teacher-subject-info', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
  });

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['teacher-papers', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return [];
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('subject_id', teacherSubjectId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!teacherSubjectId,
  });

  const filtered = papers.filter((p: any) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!teacherSubjectId) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No subject assigned. Contact admin.</p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Past Papers</h1>
            <p className="text-muted-foreground">
              {subject?.name} papers — view only (admin manages uploads)
            </p>
          </div>
          {subject && (
            <Badge style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
              {subject.name}
            </Badge>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No papers found for your subject</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((paper: any) => (
              <div key={paper.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{paper.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {paper.paper_type} • {paper.year || 'N/A'} • Grade {paper.grade || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {paper.is_free ? 'Free' : 'Paid'}
                  </Badge>
                  <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherPapers;
