import { 
  Users, 
  BookOpen, 
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layouts/AdminLayout';
import ClassScheduleGantt from '@/components/admin/ClassScheduleGantt';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const AdminDashboard = () => {
  // Fetch stats from database
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: activeClasses },
        { count: pendingPayments },
        { data: approvedPayments }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('payments').select('amount').eq('status', 'APPROVED')
      ]);

      const monthlyRevenue = approvedPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        activeClasses: activeClasses || 0,
        pendingPayments: pendingPayments || 0,
        monthlyRevenue,
      };
    },
  });

  // Fetch recent payments
  const { data: recentPayments = [] } = useQuery({
    queryKey: ['admin-recent-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:user_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch classes with enrollment counts
  const { data: classStats = [] } = useQuery({
    queryKey: ['admin-class-stats'],
    queryFn: async () => {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get enrollment counts for each class
      const stats = await Promise.all((classes || []).map(async (cls) => {
        const { count: enrolled } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'ACTIVE');
        
        return {
          ...cls,
          enrolledCount: enrolled || 0,
        };
      }));

      return stats;
    },
  });

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats?.activeClasses || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10 flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats?.pendingPayments || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10 flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">Rs. {((stats?.monthlyRevenue || 0) / 1000).toFixed(0)}k</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class Schedule - Gantt Chart */}
        <ClassScheduleGantt />

        {/* Recent Payments */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
            <CardDescription>Latest payment submissions requiring verification</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {payment.profiles?.first_name} {payment.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{payment.payment_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <span className="font-semibold text-sm">Rs. {payment.amount?.toLocaleString()}</span>
                      <Badge 
                        variant="outline"
                        className={payment.status === 'APPROVED' ? 'badge-paid' : 'badge-pending'}
                      >
                        {payment.status === 'APPROVED' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /><span className="hidden sm:inline">Approved</span></>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /><span className="hidden sm:inline">Pending</span></>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Statistics */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Class Statistics</CardTitle>
            <CardDescription>Enrollment summary by class</CardDescription>
          </CardHeader>
          <CardContent>
            {classStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No classes yet</p>
            ) : (
              <div className="space-y-3">
                {classStats.map((cls: any) => (
                  <div key={cls.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{cls.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Grade {cls.grade_min === cls.grade_max ? cls.grade_min : `${cls.grade_min}-${cls.grade_max}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <p className="font-semibold text-foreground text-sm">{cls.enrolledCount}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
