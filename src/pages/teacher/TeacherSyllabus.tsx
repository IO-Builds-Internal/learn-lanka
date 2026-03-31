import TeacherLayout from '@/components/layouts/TeacherLayout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Layers, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const TeacherSyllabus = () => {
  const { profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;

  const { data: subject } = useQuery({
    queryKey: ['teacher-subject-syllabus', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['teacher-syllabus', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return [];
      const { data } = await supabase
        .from('syllabus_lessons')
        .select('*')
        .eq('subject_id', teacherSubjectId)
        .order('sort_order');
      return data || [];
    },
    enabled: !!teacherSubjectId,
  });

  const topLevel = lessons.filter((l: any) => !l.parent_id);
  const getChildren = (parentId: string) => lessons.filter((l: any) => l.parent_id === parentId);

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
            <h1 className="text-2xl font-bold text-foreground">Syllabus</h1>
            <p className="text-muted-foreground">{subject?.name} syllabus (read-only)</p>
          </div>
          {subject && (
            <Badge style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
              {subject.name}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : topLevel.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No syllabus content for your subject</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {topLevel.map((lesson: any) => {
              const children = getChildren(lesson.id);
              return (
                <div key={lesson.id} className="rounded-lg border bg-card">
                  <div className="p-3 font-medium text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    {lesson.title}
                    {lesson.grade && (
                      <Badge variant="outline" className="text-xs ml-auto">Grade {lesson.grade}</Badge>
                    )}
                  </div>
                  {children.length > 0 && (
                    <div className="border-t px-3 pb-2">
                      {children.map((child: any) => (
                        <div key={child.id} className="flex items-center gap-2 py-1.5 pl-4 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3" />
                          {child.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherSyllabus;
