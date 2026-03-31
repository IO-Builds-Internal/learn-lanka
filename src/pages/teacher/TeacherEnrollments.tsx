import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import ClassEnrollmentsManager from '@/components/admin/ClassEnrollmentsManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';

const TeacherEnrollments = () => {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['teacher-classes-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('classes')
        .select('id, title')
        .eq('teacher_id', user.id)
        .eq('approval_status', 'APPROVED')
        .order('title');
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Enrollments</h1>
          <p className="text-muted-foreground">Manage students enrolled in your classes</p>
        </div>

        <div className="max-w-xs">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedClassId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a class to manage enrollments</p>
            </CardContent>
          </Card>
        ) : (
          <ClassEnrollmentsManager
            classId={selectedClassId}
            className={classes.find((c: any) => c.id === selectedClassId)?.title || ''}
          />
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherEnrollments;
