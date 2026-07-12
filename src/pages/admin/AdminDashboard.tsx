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
  Sparkles,
  Search,
  BookMarked
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
        .limit(5);
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
        .limit(5);
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
            <p className="text-sm text-muted-foreground animate-pulse">Synchronizing dashboard data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/15', glow: 'shadow-blue-500/5 hover:shadow-blue-500/10', link: '/admin/users' },
    { label: 'Active Classes', value: stats?.activeClasses || 0, icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', glow: 'shadow-emerald-500/5 hover:shadow-emerald-500/10', link: '/admin/classes' },
    { label: 'Pending Payments', value: stats?.pendingPayments || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/15', glow: 'shadow-amber-500/5 hover:shadow-amber-500/10', link: '/admin/payments', alert: (stats?.pendingPayments || 0) > 0 },
    { label: 'Total Revenue', value: `Rs. ${((stats?.totalRevenue || 0) / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/15', glow: 'shadow-violet-500/5 hover:shadow-violet-500/10', link: '/admin/payments' },
    { label: 'Teachers', value: stats?.totalTeachers || 0, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/15', glow: 'shadow-indigo-500/5 hover:shadow-indigo-500/10', link: '/admin/teachers' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/15', glow: 'shadow-rose-500/5 hover:shadow-rose-500/10', link: '/admin/class-approvals', alert: (stats?.pendingApprovals || 0) > 0 },
    { label: 'Past Papers', value: stats?.totalPapers || 0, icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/15', glow: 'shadow-cyan-500/5 hover:shadow-cyan-500/10', link: '/admin/papers' },
    { label: 'Rank Papers', value: stats?.totalRankPapers || 0, icon: Award, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/15', glow: 'shadow-pink-500/5 hover:shadow-pink-500/10', link: '/admin/rank-papers' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* ─── Command Search Suggestion Tip Banner ─── */}
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-violet-500/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden shadow-sm">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm flex-shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-snug">Welcome to the Dashboard Command Center</h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                We've redesigned the admin experience. Press <kbd className="bg-background border px-1.5 py-0.5 rounded-md font-mono text-[10px]">Ctrl + K</kbd> anywhere to search all 27+ administrative tools instantly.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 rounded-xl text-xs flex-shrink-0 border-primary/30 text-primary hover:bg-primary/5 active:scale-95" onClick={() => {
            // Trigger Ctrl+K Programmatically
            const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            window.dispatchEvent(e);
          }}>
            <Search className="w-3.5 h-3.5" />
            <span>Search System</span>
          </Button>
        </div>

        {/* ─── Stats Grid Overhaul ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} to={card.link}>
              <div className={cn(
                "relative rounded-2xl border p-5 bg-card/65 backdrop-blur-sm transition-all duration-300 group cursor-pointer shadow-md hover:-translate-y-1 hover:border-primary/30",
                card.border,
                card.glow
              )}>
                {card.alert && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
                <div className="flex items-start justify-between">
                  <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110", card.bg)}>
                    <card.icon className={cn("w-5 h-5", card.color)} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all duration-300 transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{card.value}</p>
                  <p className="text-xs text-muted-foreground/90 font-medium mt-1">{card.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ─── Dynamic Main Content Block ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Glassmorphic Recent Payments - 2/3 cols */}
          <div className="xl:col-span-2 rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <h2 className="font-bold text-sm tracking-wide">Recent Payments Log</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Slips submitted for class admissions</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 hover:bg-muted text-primary" asChild>
                <Link to="/admin/payments">
                  <span>Manage Payments</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border/30 flex-1">
              {recentPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mb-2 opacity-30 text-primary" />
                  <p className="text-sm">No recent slip submissions found</p>
                </div>
              ) : (
                recentPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/10 to-violet-500/10 border border-primary/20 flex items-center justify-center flex-shrink-0 font-bold text-xs text-primary shadow-sm shadow-primary/5">
                      {payment.profiles?.first_name?.[0] || 'S'}{payment.profiles?.last_name?.[0] || ''}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {payment.profiles?.first_name} {payment.profiles?.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-muted border px-1.5 py-0.5 rounded text-muted-foreground font-medium truncate max-w-[120px]">
                          {payment.payment_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80">
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <span className="text-xs font-bold text-foreground">Rs. {payment.amount?.toLocaleString()}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold shadow-sm",
                          payment.status === 'APPROVED'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : payment.status === 'REJECTED'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                        )}
                      >
                        {payment.status === 'APPROVED' ? (
                          <><CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> Approved</>
                        ) : payment.status === 'REJECTED' ? (
                          <><AlertCircle className="w-2.5 h-2.5 text-rose-500" /> Rejected</>
                        ) : (
                          <><Clock className="w-2.5 h-2.5 text-amber-500" /> Pending</>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Glassmorphic Class Enrollment Progress - 1/3 col */}
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <h2 className="font-bold text-sm tracking-wide">Class Enrollment Progress</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Top scheduling metrics</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 hover:bg-muted text-primary" asChild>
                <Link to="/admin/classes">
                  <span>View Classes</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {classStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <GraduationCap className="w-10 h-10 mb-2 opacity-30 text-primary" />
                  <p className="text-sm">No classes registered</p>
                </div>
              ) : (
                classStats.map((cls: any) => {
                  const maxStudents = cls.max_students || 100;
                  const pct = Math.min((cls.enrolledCount / maxStudents) * 100, 100);
                  return (
                    <div key={cls.id} className="space-y-2 group">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[170px] group-hover:text-primary transition-colors">
                          {cls.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 font-bold bg-muted px-1.5 py-0.5 rounded-lg border">
                          {cls.enrolledCount}{cls.max_students ? `/${cls.max_students}` : ''}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden border border-border/20 relative shadow-inner">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 shadow-md",
                            pct >= 90 ? 'bg-rose-500 shadow-rose-500/20' : pct >= 70 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
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

        {/* ─── High-fidelity Subject Breakdown Grid ─── */}
        {subjectStats.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <h2 className="font-bold text-sm tracking-wide">Subject Curriculum Distribution</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Classes and test papers hosted per stream</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1 hover:bg-muted text-primary" asChild>
                <Link to="/admin/subjects">
                  <span>Manage Subjects</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              {subjectStats.map((sub: any) => (
                <div 
                  key={sub.id} 
                  className="p-4 rounded-2xl border transition-all duration-300 hover:shadow-md bg-card/40 flex flex-col justify-between group cursor-pointer"
                  style={{ borderColor: `${sub.color}25` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: sub.color }} />
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{sub.name}</span>
                    </div>
                    <BookMarked className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:scale-110 transition-transform" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-muted/40 border border-border/20 rounded-xl p-2 text-center shadow-inner">
                      <p className="text-xs font-bold text-foreground">{sub.classCount}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Classes</p>
                    </div>
                    <div className="bg-muted/40 border border-border/20 rounded-xl p-2 text-center shadow-inner">
                      <p className="text-xs font-bold text-foreground">{sub.paperCount}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Papers</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Class Schedule Gantt Chart Widget ─── */}
        <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="font-bold text-sm tracking-wide">Weekly Lecture Schedule Timeline</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Visual representation of weekly lecture distributions</p>
          </div>
          <div className="p-4">
            <ClassScheduleGantt />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;