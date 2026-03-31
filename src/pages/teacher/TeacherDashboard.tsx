import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Clock, CheckCircle, FileText, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;

  const { data: teacherSubject } = useQuery({
    queryKey: ['teacher-subject', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
  });

  const { data: stats } = useQuery({
    queryKey: ['teacher-stats', user?.id, teacherSubjectId],
    queryFn: async () => {
      if (!user) return null;
      const [classesRes, papersRes, rankPapersRes] = await Promise.all([
        supabase.from('classes').select('id, approval_status').eq('teacher_id', user.id),
        supabase.from('papers').select('id', { count: 'exact', head: true }).eq('subject_id', teacherSubjectId || ''),
        supabase.from('rank_papers').select('id', { count: 'exact', head: true }).eq('subject_id', teacherSubjectId || ''),
      ]);
      const classes = classesRes.data || [];
      const classIds = classes.map(c => c.id);
      
      let totalStudents = 0;
      if (classIds.length > 0) {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('status', 'ACTIVE');
        totalStudents = count || 0;
      }

      return {
        total: classes.length,
        approved: classes.filter(c => c.approval_status === 'APPROVED').length,
        pending: classes.filter(c => c.approval_status === 'PENDING').length,
        students: totalStudents,
        papers: papersRes.count || 0,
        rankPapers: rankPapersRes.count || 0,
      };
    },
    enabled: !!user,
  });

  // Recent classes with enrollments
  const { data: recentClasses = [] } = useQuery({
    queryKey: ['teacher-recent-classes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, title, approval_status, monthly_fee_amount, max_students')
        .eq('teacher_id', user.id)
        .eq('approval_status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!classes?.length) return [];
      const results = await Promise.all(classes.map(async (cls) => {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'ACTIVE');
        return { ...cls, enrolledCount: count || 0 };
      }));
      return results;
    },
    enabled: !!user,
  });

  const statCards = [
    { label: 'My Classes', value: stats?.total || 0, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', link: '/teacher/classes' },
    { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', link: '/teacher/classes' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', link: '/teacher/classes', alert: (stats?.pending || 0) > 0 },
    { label: 'Total Students', value: stats?.students || 0, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', link: '/teacher/enrollments' },
    { label: 'Past Papers', value: stats?.papers || 0, icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', link: '/teacher/papers' },
    { label: 'Rank Papers', value: stats?.rankPapers || 0, icon: Award, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', link: '/teacher/rank-papers' },
  ];

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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} to={card.link}>
              <div className={cn(
                "relative rounded-xl border p-4 bg-card hover:shadow-md transition-all duration-200 group cursor-pointer",
                card.border
              )}>
                {card.alert && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", card.bg)}>
                    <card.icon className={cn("w-4 h-4", card.color)} />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent classes */}
        {recentClasses.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-base">Class Enrollment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Active students in your classes</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/teacher/enrollments" className="text-xs gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {recentClasses.map((cls: any) => {
                const maxStudents = cls.max_students || 50;
                const pct = Math.min((cls.enrolledCount / maxStudents) * 100, 100);
                return (
                  <div key={cls.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate max-w-[200px]">{cls.title}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {cls.enrolledCount}{cls.max_students ? `/${cls.max_students}` : ''} students
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;