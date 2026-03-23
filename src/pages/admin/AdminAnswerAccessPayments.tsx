import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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

const AdminAnswerAccessPayments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['answer-access-payments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('answer_access_payments')
        .select(`
          *,
          profiles:user_id(first_name, last_name, phone),
          payments:payment_id(amount, slip_url, status)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccessPayment[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (item: AccessPayment) => {
      // Approve the answer access payment
      const { error: e1 } = await (supabase as any)
        .from('answer_access_payments')
        .update({ status: 'APPROVED', granted_at: new Date().toISOString() })
        .eq('id', item.id);
      if (e1) throw e1;

      // Approve the underlying payment if exists
      if (item.payment_id) {
        const { error: e2 } = await supabase
          .from('payments')
          .update({ status: 'APPROVED', verified_at: new Date().toISOString(), verified_by: user?.id })
          .eq('id', item.payment_id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-access-payments'] });
      toast.success('Access granted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (item: AccessPayment) => {
      if (item.payment_id) {
        await supabase.from('payments').update({ status: 'REJECTED' }).eq('id', item.payment_id);
      }
      await (supabase as any)
        .from('answer_access_payments')
        .update({ status: 'REJECTED' })
        .eq('id', item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-access-payments'] });
      toast.success('Payment rejected');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getSlipUrl = async (slipPath: string) => {
    const { data } = await supabase.storage
      .from('payment-slips')
      .createSignedUrl(slipPath, 300);
    return data?.signedUrl || null;
  };

  const handleViewSlip = async (slipPath: string) => {
    const url = await getSlipUrl(slipPath);
    if (url) setPreviewSlip(url);
    else toast.error('Could not load slip');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Answer Access Payments</h1>
          <p className="text-muted-foreground">Approve or reject one-time answer access fee payments</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mb-3 opacity-40" />
              <p>No answer access payment requests yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map(p => (
              <Card key={p.id} className="card-elevated">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {p.profiles?.first_name} {p.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{p.profiles?.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {new Date(p.created_at).toLocaleString()}
                    </p>
                    {p.payments?.amount && (
                      <p className="text-sm font-medium mt-1">Rs. {p.payments.amount.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={p.status === 'APPROVED' ? 'default' : p.status === 'REJECTED' ? 'destructive' : 'secondary'}
                    >
                      {p.status}
                    </Badge>
                    {p.payments?.slip_url && (
                      <Button size="sm" variant="outline" onClick={() => handleViewSlip(p.payments!.slip_url!)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Slip
                      </Button>
                    )}
                    {p.status === 'PENDING' && (
                      <>
                        <Button size="sm" onClick={() => approveMutation.mutate(p)} disabled={approveMutation.isPending}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(p)} disabled={rejectMutation.isPending}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Slip preview modal */}
      {previewSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div className="max-w-xl w-full bg-card rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewSlip} alt="Payment slip" className="w-full" />
            <div className="p-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewSlip(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnswerAccessPayments;
