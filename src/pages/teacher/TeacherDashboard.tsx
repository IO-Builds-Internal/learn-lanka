import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery as useQuerySingle } from '@tanstack/react-query';

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, approved: 0, pending: 0, students: 0 };
      const [classesRes, enrollmentsRes] = await Promise.all([
        supabase.from('classes').select('id, approval_status').eq('teacher_id', user.id),
        supabase.from('class_enrollments').select('id, class_id').eq('status', 'ACTIVE'),
      ]);
      const classes = classesRes.data || [];
      const classIds = classes.map(c => c.id);
      const enrollments = (enrollmentsRes.data || []).filter(e => classIds.includes(e.class_id));
      return {
        total: classes.length,
        approved: classes.filter(c => c.approval_status === 'APPROVED').length,
        pending: classes.filter(c => c.approval_status === 'PENDING').length,
        students: enrollments.length,
      };
    },
    enabled: !!user,
  });
  const { data: teacherSubject } = useQuerySingle({
    queryKey: ['teacher-subject', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
  });

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Manage your classes and content</p>
          </div>
          {teacherSubject && (
            <Badge className="text-sm" style={{ backgroundColor: `${teacherSubject.color}20`, color: teacherSubject.color, borderColor: `${teacherSubject.color}30` }}>
              {teacherSubject.name}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">My Classes</CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats?.approved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
              <Clock className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.students || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
