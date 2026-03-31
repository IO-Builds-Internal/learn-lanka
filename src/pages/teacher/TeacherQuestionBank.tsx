import TeacherLayout from '@/components/layouts/TeacherLayout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, HelpCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const TeacherQuestionBank = () => {
  const { profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subject } = useQuery({
    queryKey: ['teacher-subject-qb', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['teacher-question-bank', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return [];
      const { data } = await supabase
        .from('question_bank')
        .select('*')
        .eq('subject_id', teacherSubjectId)
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!teacherSubjectId,
  });

  const filtered = questions.filter((q: any) =>
    (q.question_text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.past_paper_ref || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
            <p className="text-muted-foreground">{subject?.name} questions (read-only)</p>
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
            placeholder="Search questions..."
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
              <HelpCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No questions found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((q: any) => (
              <div key={q.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {q.question_text && (
                      <p className="text-sm line-clamp-2">{q.question_text}</p>
                    )}
                    {q.question_image_url && !q.question_text && (
                      <img src={q.question_image_url} alt="Question" className="max-h-24 rounded" />
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                      {q.grade && <Badge variant="secondary" className="text-xs">Grade {q.grade}</Badge>}
                      {q.past_paper_ref && (
                        <span className="text-xs text-muted-foreground">{q.past_paper_ref}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherQuestionBank;
