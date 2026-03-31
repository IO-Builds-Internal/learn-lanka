import { 
  Users, 
  BookOpen, 
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  BarChart3,
  FileText,
  Award,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/layouts/AdminLayout';
import ClassScheduleGantt from '@/components/admin/ClassScheduleGantt';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: activeClasses },
        { count: pendingPayments },
        { data: approvedPayments },
        { count: totalQuestions },
        { count: totalPapers },
        { count: totalRankPapers },
        { count: totalSubjects },
        { count: pendingApprovals },
        { count: totalTeachers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('payments').select('amount').eq('status', 'APPROVED'),
        supabase.from('question_bank').select('*', { count: 'exact', head: true }),
        supabase.from('papers').select('*', { count: 'exact', head: true }),
        supabase.from('rank_papers').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('approval_status', 'PENDING'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      ]);
      const totalRevenue = approvedPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      return {
        totalUsers: totalUsers || 0,
        activeClasses: activeClasses || 0,
        pendingPayments: pendingPayments || 0,
        totalRevenue,
        totalQuestions: totalQuestions || 0,
        totalPapers: totalPapers || 0,
        totalRankPapers: totalRankPapers || 0,
        totalSubjects: totalSubjects || 0,
        pendingApprovals: pendingApprovals || 0,
        totalTeachers: totalTeachers || 0,
      };
    },
  });

  const { data: recentPayments = [] } = useQuery({
    queryKey: ['admin-recent-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return data.map(p => ({ ...p, profiles: profileMap[p.user_id] || null }));
    },
  });

  const { data: classStats = [] } = useQuery({
    queryKey: ['admin-class-stats'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('approval_status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      const stats = await Promise.all((classes || []).map(async (cls) => {
        const { count: enrolled } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'ACTIVE');
        return { ...cls, enrolledCount: enrolled || 0 };
      }));
      return stats;
    },
  });

  // Subject breakdown
  const { data: subjectStats = [] } = useQuery({
    queryKey: ['admin-subject-stats'],
    queryFn: async () => {
      const { data: subjects } = await supabase.from('subjects').select('id, name, color').eq('is_active', true).order('sort_order');
      if (!subjects) return [];
      const results = await Promise.all(subjects.map(async (sub) => {
        const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true }).eq('subject_id', sub.id);
        const { count: paperCount } = await supabase.from('papers').select('*', { count: 'exact', head: true }).eq('subject_id', sub.id);
        return { ...sub, classCount: classCount || 0, paperCount: paperCount || 0 };
      }));
      return results;
    },
  });

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', link: '/admin/users' },
    { label: 'Active Classes', value: stats?.activeClasses || 0, icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', link: '/admin/classes' },
    { label: 'Pending Payments', value: stats?.pendingPayments || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', link: '/admin/payments', alert: (stats?.pendingPayments || 0) > 0 },
    { label: 'Total Revenue', value: `Rs. ${((stats?.totalRevenue || 0) / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', link: '/admin/payments' },
    { label: 'Teachers', value: stats?.totalTeachers || 0, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', link: '/admin/teachers' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', link: '/admin/class-approvals', alert: (stats?.pendingApprovals || 0) > 0 },
    { label: 'Past Papers', value: stats?.totalPapers || 0, icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', link: '/admin/papers' },
    { label: 'Rank Papers', value: stats?.totalRankPapers || 0, icon: Award, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', link: '/admin/rank-papers' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your platform overview.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
              <BarChart3 className="w-4 h-4" />
              <span>{stats?.totalQuestions || 0} questions</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
              <Layers className="w-4 h-4" />
              <span>{stats?.totalSubjects || 0} subjects</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} to={card.link}>
              <div className={cn(
                "relative rounded-xl border p-5 bg-card hover:shadow-md transition-all duration-200 group cursor-pointer",
                card.border
              )}>
                {card.alert && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
                <div className="flex items-start justify-between">
                  <div className={cn("p-2.5 rounded-lg", card.bg)}>
                    <card.icon className={cn("w-5 h-5", card.color)} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Subject Breakdown */}
        {subjectStats.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-base">Subject Overview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Classes and papers per subject</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/subjects" className="text-xs gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {subjectStats.map((sub: any) => (
                <div key={sub.id} className="p-3 rounded-lg border" style={{ borderColor: `${sub.color}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                    <span className="font-medium text-sm">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{sub.classCount} classes</span>
                    <span>{sub.paperCount} papers</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Payments - takes 2 cols */}
          <div className="xl:col-span-2 rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-base">Recent Payments</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Latest submissions requiring review</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/payments" className="text-xs gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
            <div className="divide-y">
              {recentPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CreditCard className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No payments yet</p>
                </div>
              ) : (
                recentPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {payment.profiles?.first_name?.[0]}{payment.profiles?.last_name?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {payment.profiles?.first_name} {payment.profiles?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{payment.payment_type}</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <span className="text-sm font-semibold">Rs. {payment.amount?.toLocaleString()}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-0.5 flex items-center gap-1",
                          payment.status === 'APPROVED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                            : payment.status === 'REJECTED'
                            ? 'border-destructive/30 bg-destructive/10 text-destructive'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                        )}
                      >
                        {payment.status === 'APPROVED' ? (
                          <><CheckCircle className="w-3 h-3" /> Approved</>
                        ) : payment.status === 'REJECTED' ? (
                          <><AlertCircle className="w-3 h-3" /> Rejected</>
                        ) : (
                          <><Clock className="w-3 h-3" /> Pending</>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Class stats - 1 col */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold text-base">Class Enrollment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Active students per class</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/classes" className="text-xs gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {classStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <GraduationCap className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No classes yet</p>
                </div>
              ) : (
                classStats.map((cls: any) => {
                  const maxStudents = cls.max_students || 50;
                  const pct = Math.min((cls.enrolledCount / maxStudents) * 100, 100);
                  return (
                    <div key={cls.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate max-w-[160px]">{cls.title}</p>
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
                })
              )}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <ClassScheduleGantt />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;