import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { formatPhoneDisplay } from '@/lib/utils';

const TeacherPayments = () => {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('classes')
        .select('id, title, monthly_fee_amount, profit_share_percent')
        .eq('teacher_id', user.id)
        .eq('approval_status', 'APPROVED')
        .order('title');
      return data || [];
    },
    enabled: !!user,
  });

  const classIds = classes.map((c: any) => c.id);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['teacher-class-payments', classIds, selectedClassId],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      
      let query = supabase
        .from('payments')
        .select('*')
        .eq('payment_type', 'CLASS_MONTH')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      if (selectedClassId !== 'all') {
        query = query.like('ref_id', `${selectedClassId}-%`);
      }

      const { data } = await query;
      
      // Filter to only teacher's classes
      const filtered = (data || []).filter((p: any) => {
        const refClassId = p.ref_id.split('-')[0];
        return classIds.includes(refClassId);
      });

      // Fetch profiles for users
      const userIds = [...new Set(filtered.map((p: any) => p.user_id))];
      const profiles: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);
        (profileData || []).forEach((p: any) => { profiles[p.id] = p; });
      }

      return filtered.map((p: any) => ({
        ...p,
        profile: profiles[p.user_id] || null,
        className: classes.find((c: any) => p.ref_id.startsWith(c.id))?.title || 'Unknown',
        yearMonth: p.ref_id.split('-').slice(-1)[0] || '',
      }));
    },
    enabled: classIds.length > 0,
  });

  // Calculate totals
  const totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const avgShare = classes.length > 0
    ? classes.reduce((s: number, c: any) => s + (c.profit_share_percent || 0), 0) / classes.length
    : 0;
  const estimatedShare = Math.round(totalRevenue * avgShare / 100);

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Class Payments</h1>
          <p className="text-muted-foreground">View approved payments for your classes</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Share (est.)</CardTitle>
              <CreditCard className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Rs. {estimatedShare.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Avg {avgShare.toFixed(0)}% share</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-xs">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No approved payments yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {payment.profile?.first_name} {payment.profile?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPhoneDisplay(payment.profile?.phone)} • {payment.className} • {payment.yearMonth}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    Rs. {payment.amount.toLocaleString()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherPayments;
