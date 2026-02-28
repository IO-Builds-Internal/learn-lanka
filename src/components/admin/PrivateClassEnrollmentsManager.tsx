import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, Loader2, User, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface EnrollmentPayment {
  id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

interface EnrollmentWithProfile {
  id: string;
  user_id: string;
  class_id: string;
  status: string;
  enrolled_at: string;
  admin_note: string | null;
  profile: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  payments: EnrollmentPayment[];
}

interface Props {
  classId: string;
  className: string;
}

const PrivateClassEnrollmentsManager = ({ classId, className }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithProfile | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [expandedEnrollments, setExpandedEnrollments] = useState<Set<string>>(new Set());

  // Fetch enrollments with profiles and payments
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['private-class-enrollments', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('id, user_id, class_id, status, enrolled_at, admin_note')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE')
        .order('enrolled_at', { ascending: false });
      
      if (error) throw error;

      // Fetch profiles and payments for each enrollment
      const enrollmentsWithData: EnrollmentWithProfile[] = [];
      for (const enrollment of data || []) {
        const [profileResult, paymentsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('id', enrollment.user_id)
            .single(),
          (supabase as any)
            .from('enrollment_payments')
            .select('*')
            .eq('enrollment_id', enrollment.id)
            .order('payment_date', { ascending: false })
        ]);
        
        enrollmentsWithData.push({
          ...enrollment,
          profile: profileResult.data || null,
          payments: paymentsResult.data || [],
        });
      }

      return enrollmentsWithData;
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollment || !paymentDate || !paymentAmount) return;
      const { error } = await (supabase as any)
        .from('enrollment_payments')
        .insert({
          enrollment_id: selectedEnrollment.id,
          amount: parseInt(paymentAmount),
          payment_date: paymentDate,
          note: paymentNote || null,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment added!');
      queryClient.invalidateQueries({ queryKey: ['private-class-enrollments', classId] });
      closeAddPaymentDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add payment');
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await (supabase as any)
        .from('enrollment_payments')
        .delete()
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment deleted');
      queryClient.invalidateQueries({ queryKey: ['private-class-enrollments', classId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete payment');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEnrollment) return;
      const { error } = await supabase
        .from('class_enrollments')
        .update({ admin_note: adminNote || null })
        .eq('id', selectedEnrollment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note updated!');
      queryClient.invalidateQueries({ queryKey: ['private-class-enrollments', classId] });
      setSelectedEnrollment(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update note');
    },
  });

  const openAddPaymentDialog = (enrollment: EnrollmentWithProfile) => {
    setSelectedEnrollment(enrollment);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentAmount('');
    setPaymentNote('');
    setShowAddPayment(true);
  };

  const closeAddPaymentDialog = () => {
    setShowAddPayment(false);
    setPaymentDate('');
    setPaymentAmount('');
    setPaymentNote('');
  };

  const openNoteDialog = (enrollment: EnrollmentWithProfile) => {
    setSelectedEnrollment(enrollment);
    setAdminNote(enrollment.admin_note || '');
  };

  const toggleExpanded = (enrollmentId: string) => {
    setExpandedEnrollments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(enrollmentId)) {
        newSet.delete(enrollmentId);
      } else {
        newSet.add(enrollmentId);
      }
      return newSet;
    });
  };

  const getTotalPaid = (payments: EnrollmentPayment[]) => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Enrollments</h3>
          <p className="text-sm text-muted-foreground">{className} - {enrollments.length} students</p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No students enrolled yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {enrollments.map((enrollment) => (
            <Collapsible 
              key={enrollment.id} 
              open={expandedEnrollments.has(enrollment.id)}
              onOpenChange={() => toggleExpanded(enrollment.id)}
            >
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {enrollment.profile?.first_name} {enrollment.profile?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {formatPhoneDisplay(enrollment.profile?.phone)}
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {enrollment.payments.length > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                            <Check className="w-3 h-3" />
                            {enrollment.payments.length} payment{enrollment.payments.length > 1 ? 's' : ''}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Rs. {getTotalPaid(enrollment.payments).toLocaleString()} total
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-muted gap-1">
                          <Clock className="w-3 h-3" />
                          No payments
                        </Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddPaymentDialog(enrollment);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Payment
                      </Button>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="mt-4 pt-4 border-t">
                    {/* Payments List */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Payment History</Label>
                      </div>
                      {enrollment.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payments recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {enrollment.payments.map((payment) => (
                            <div 
                              key={payment.id} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Rs. {payment.amount.toLocaleString()}</span>
                                  <span className="text-sm text-muted-foreground">
                                    • {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                {payment.note && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{payment.note}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deletePaymentMutation.mutate(payment.id)}
                                disabled={deletePaymentMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Admin Note */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Admin Note</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add internal note..."
                          value={enrollment.admin_note || ''}
                          readOnly
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openNoteDialog(enrollment)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={(open) => !open && closeAddPaymentDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedEnrollment?.profile?.first_name} {selectedEnrollment?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Amount (Rs.)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNote">Note (optional)</Label>
              <Textarea
                id="paymentNote"
                placeholder="e.g., January 2026 fee"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddPaymentDialog}>Cancel</Button>
            <Button 
              onClick={() => addPaymentMutation.mutate()}
              disabled={addPaymentMutation.isPending || !paymentDate || !paymentAmount}
            >
              {addPaymentMutation.isPending ? 'Saving...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!selectedEnrollment && !showAddPayment} onOpenChange={(open) => !open && setSelectedEnrollment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Note</DialogTitle>
            <DialogDescription>
              Internal note for {selectedEnrollment?.profile?.first_name} {selectedEnrollment?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Internal notes about this enrollment..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEnrollment(null)}>Cancel</Button>
            <Button 
              onClick={() => updateNoteMutation.mutate()}
              disabled={updateNoteMutation.isPending}
            >
              {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivateClassEnrollmentsManager;
