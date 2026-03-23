import { useState, useEffect } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { CheckCircle, XCircle, Loader2, Download, ExternalLink, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { invokeFunction } from '@/lib/functions';

interface Payment {
  id: string;
  user_id: string;
  payment_type: string;
  ref_id: string;
  amount: number;
  slip_url: string | null;
  status: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface PaymentVerificationDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PaymentVerificationDialog = ({
  payment,
  open,
  onOpenChange,
  onSuccess
}: PaymentVerificationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [signedSlipUrl, setSignedSlipUrl] = useState<string | null>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  // Generate signed URL for private bucket when dialog opens
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!payment?.slip_url || !open) {
        setSignedSlipUrl(null);
        return;
      }

      setLoadingSlip(true);
      try {
        let filePath: string | null = null;

        // Check if it's a full URL or a raw storage path
        if (payment.slip_url.startsWith('http')) {
          const url = new URL(payment.slip_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/payment-slips\/(.+)/);
          if (pathMatch) filePath = decodeURIComponent(pathMatch[1]);
        } else {
          // Raw path stored directly (e.g. "userId/folder/filename.jpg")
          filePath = payment.slip_url;
        }

        if (filePath) {
          const { data, error } = await supabase.storage
            .from('payment-slips')
            .createSignedUrl(filePath, 3600);
          if (error) throw error;
          setSignedSlipUrl(data.signedUrl);
        } else {
          setSignedSlipUrl(null);
        }
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedSlipUrl(null);
      } finally {
        setLoadingSlip(false);
      }
    };

    generateSignedUrl();
  }, [payment?.slip_url, open]);

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'CLASS_MONTH': return 'Class Monthly Fee';
      case 'RANK_PAPER': return 'Rank Paper';
      case 'SHOP_ORDER': return 'Shop Order';
      default: return type;
    }
  };

  const handleVerify = async (approved: boolean) => {
    if (!payment || !user) return;

    if (approved) {
      setIsApproving(true);
    } else {
      setIsRejecting(true);
    }

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: approved ? 'APPROVED' : 'REJECTED',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          note: note || null,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Create notification for the user
      const notificationTitle = approved 
        ? 'Payment Approved ✅' 
        : 'Payment Rejected ❌';
      
      const notificationMessage = approved
        ? `Your payment of Rs. ${payment.amount.toLocaleString()} for ${getPaymentTypeLabel(payment.payment_type)} has been approved. You now have access to the content.`
        : `Your payment of Rs. ${payment.amount.toLocaleString()} for ${getPaymentTypeLabel(payment.payment_type)} was rejected.${note ? ` Reason: ${note}` : ' Please contact support for more information.'}`;

      await supabase
        .from('notifications')
        .insert({
          title: notificationTitle,
          message: notificationMessage,
          target_type: 'USER',
          target_ref: payment.user_id,
          created_by: user.id,
        });

      // Send SMS notification (fire-and-forget, non-critical)
      try {
        const templateKey = approved ? 'payment_approved' : 'payment_rejected';
        await invokeFunction('send-sms-notification', {
          body: {
            template_key: templateKey,
            targetUsers: [payment.user_id],
            variables: {
              amount: payment.amount.toLocaleString(),
              reason: !approved && note ? note : 'Please contact support',
            },
          },
        });
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }

      toast({
        title: approved ? 'Payment Approved' : 'Payment Rejected',
        description: `The payment has been ${approved ? 'approved' : 'rejected'} and the user has been notified.`,
      });

      setNote('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
      setIsRejecting(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review the payment slip and approve or reject
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="font-medium">
                {payment.profiles?.first_name} {payment.profiles?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{formatPhoneDisplay(payment.profiles?.phone)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-xl font-bold text-primary">Rs. {payment.amount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Payment Type</p>
              <p className="font-medium">{getPaymentTypeLabel(payment.payment_type)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Slip Preview */}
          {payment.slip_url && (
            <div className="space-y-2">
              <Label>Bank Slip</Label>
              <div className="relative rounded-lg border overflow-hidden bg-muted">
                {loadingSlip ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !signedSlipUrl ? (
                  <div className="p-8 text-center">
                    <ImageOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Unable to load slip</p>
                  </div>
                ) : (signedSlipUrl.toLowerCase().includes('.pdf') || payment.slip_url.toLowerCase().endsWith('.pdf')) ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">PDF Document</p>
                    <div className="flex justify-center gap-2">
                      <a href={signedSlipUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View PDF
                        </Button>
                      </a>
                      <a href={signedSlipUrl} download>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <img
                    src={signedSlipUrl}
                    alt="Payment slip"
                    className="max-h-[400px] w-full object-contain"
                    onError={() => setSignedSlipUrl(null)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note for rejection reason or approval comment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleVerify(false)}
            disabled={isApproving || isRejecting}
            className="text-destructive hover:bg-destructive/10"
          >
            {isRejecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Reject
          </Button>
          <Button
            onClick={() => handleVerify(true)}
            disabled={isApproving || isRejecting}
            className="bg-success hover:bg-success/90"
          >
            {isApproving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentVerificationDialog;
