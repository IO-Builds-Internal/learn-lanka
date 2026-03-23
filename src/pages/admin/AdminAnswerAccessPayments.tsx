import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Loader2, KeyRound, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AccessPayment {
  id: string;
  user_id: string;
  payment_id: string | null;
  status: string;
  granted_at: string | null;
  created_at: string;
  profiles: { first_name: string; last_name: string; phone: string } | null;
  payments: { amount: number; slip_url: string | null; status: string } | null;
}

const statusConfig = {
  PENDING:  { label: 'Pending',  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

const AdminAnswerAccessPayments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('PENDING');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['answer-access-payments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('answer_access_payments')
        .select(`*, profiles:user_id(first_name, last_name, phone), payments:payment_id(amount, slip_url, status)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccessPayment[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (item: AccessPayment) => {
      const { error: e1 } = await (supabase as any)
        .from('answer_access_payments')
        .update({ status: 'APPROVED', granted_at: new Date().toISOString() })
        .eq('id', item.id);
      if (e1) throw e1;
      if (item.payment_id) {
        const { error: e2 } = await supabase
          .from('payments')
          .update({ status: 'APPROVED', verified_at: new Date().toISOString(), verified_by: user?.id })
          .eq('id', item.payment_id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['answer-access-payments'] }); toast.success('Access granted!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (item: AccessPayment) => {
      if (item.payment_id) {
        await supabase.from('payments').update({ status: 'REJECTED' }).eq('id', item.payment_id);
      }
      await (supabase as any).from('answer_access_payments').update({ status: 'REJECTED' }).eq('id', item.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['answer-access-payments'] }); toast.success('Payment rejected'); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleViewSlip = async (slipPath: string) => {
    const { data } = await supabase.storage.from('payment-slips').createSignedUrl(slipPath, 300);
    if (data?.signedUrl) setPreviewSlip(data.signedUrl);
    else toast.error('Could not load slip');
  };

  const grouped = {
    PENDING:  payments.filter(p => p.status === 'PENDING'),
    APPROVED: payments.filter(p => p.status === 'APPROVED'),
    REJECTED: payments.filter(p => p.status === 'REJECTED'),
  };

  const pendingCount = grouped.PENDING.length;

  const renderList = (items: AccessPayment[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <UserCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No requests in this category</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-border">
        {items.map(p => {
          const cfg = statusConfig[p.status as keyof typeof statusConfig] || statusConfig.PENDING;
          const StatusIcon = cfg.icon;
          return (
            <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                {p.profiles?.first_name?.[0]}{p.profiles?.last_name?.[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {p.profiles?.first_name} {p.profiles?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{p.profiles?.phone}</p>
                <div className="flex items-center gap-3 mt-1">
                  {p.payments?.amount && (
                    <span className="text-xs font-semibold text-foreground">Rs. {p.payments.amount.toLocaleString()}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  {p.granted_at && (
                    <span className="text-xs text-emerald-600">
                      Granted {new Date(p.granted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium', cfg.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>

                {p.payments?.slip_url && (
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => handleViewSlip(p.payments!.slip_url!)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Slip
                  </Button>
                )}

                {p.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approveMutation.mutate(p)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs px-2.5"
                      onClick={() => rejectMutation.mutate(p)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Answer Access Payments"
        description="Manage one-time lifetime access fee payments for paper answer viewing"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Answer Access' }]}
        actions={
          pendingCount > 0 ? (
            <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1.5 rounded-full font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} pending
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Summary row */}
          <div className="grid grid-cols-3 divide-x border-b">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
              const cfg = statusConfig[s];
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-4 text-sm transition-colors hover:bg-muted/30',
                    activeTab === s ? 'bg-muted/40' : '',
                  )}
                >
                  <span className={cn('flex items-center gap-1.5 font-semibold text-lg', cfg.color.split(' ')[1])}>
                    {grouped[s].length}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 pt-3 border-b">
              <TabsList className="h-8">
                <TabsTrigger value="PENDING" className="text-xs h-7">Pending {grouped.PENDING.length > 0 && `(${grouped.PENDING.length})`}</TabsTrigger>
                <TabsTrigger value="APPROVED" className="text-xs h-7">Approved</TabsTrigger>
                <TabsTrigger value="REJECTED" className="text-xs h-7">Rejected</TabsTrigger>
              </TabsList>
            </div>
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
              <TabsContent key={s} value={s} className="m-0">
                {renderList(grouped[s])}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Slip preview modal */}
      {previewSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div className="max-w-lg w-full bg-card rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-medium text-sm">Payment Slip</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewSlip(null)}>✕</Button>
            </div>
            <img src={previewSlip} alt="Payment slip" className="w-full max-h-[70vh] object-contain" />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnswerAccessPayments;
