import { useState } from 'react';
import { Upload, CreditCard, CheckCircle, Clock, AlertCircle, X, Loader2, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  used_count: number;
}

interface PaymentUploadFormProps {
  paymentType: 'CLASS_MONTH' | 'RANK_PAPER' | 'SHOP_ORDER';
  refId: string;
  amount: number;
  title: string;
  currentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  onSuccess?: () => void;
}

const PaymentUploadForm = ({
  paymentType,
  refId,
  amount,
  title,
  currentStatus,
  onSuccess
}: PaymentUploadFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Calculate discounted amount
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    switch (appliedCoupon.discount_type) {
      case 'PERCENT':
        return Math.round(amount * (appliedCoupon.discount_value / 100));
      case 'FIXED':
        return Math.min(appliedCoupon.discount_value, amount);
      case 'FULL':
        return amount;
      default:
        return 0;
    }
  };

  const discountAmount = calculateDiscount();
  const finalAmount = Math.max(0, amount - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !user) return;
    
    setCouponLoading(true);
    setCouponError('');
    
    try {
      // Fetch coupon
      const { data: coupon, error: couponErr } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      
      if (couponErr) throw couponErr;
      
      if (!coupon) {
        setCouponError('Invalid coupon code');
        return;
      }

      // Check validity dates
      const now = new Date().toISOString();
      if (coupon.valid_from && coupon.valid_from > now) {
        setCouponError('Coupon is not yet active');
        return;
      }
      if (coupon.valid_until && coupon.valid_until < now) {
        setCouponError('Coupon has expired');
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        setCouponError('Coupon usage limit reached');
        return;
      }

      // Check if user already used this coupon
      const { count: usageCount } = await supabase
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id);
      
      if (usageCount && usageCount > 0) {
        setCouponError('You have already used this coupon');
        return;
      }

      setAppliedCoupon(coupon);
      toast({
        title: 'Coupon applied!',
        description: `Discount of ${coupon.discount_type === 'PERCENT' ? `${coupon.discount_value}%` : coupon.discount_type === 'FULL' ? '100%' : `Rs. ${coupon.discount_value}`} applied`,
      });
    } catch (error: any) {
      setCouponError(error.message || 'Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(selectedFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPG, PNG) or PDF',
        variant: 'destructive',
      });
      return;
    }

    let fileToUse = selectedFile;

    // Try to compress if image and exceeds size limit
    if (selectedFile.type.startsWith('image/') && selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'Compressing image...',
        description: 'Your image is larger than 5MB. Compressing to fit limit.',
      });
      
      fileToUse = await compressImage(
        selectedFile, 
        5 * 1024 * 1024,
        undefined,
        (compFile, savedBytes) => {
          if (savedBytes > 0) {
            toast({
              title: 'Image compressed successfully',
              description: `Reduced size by ${(savedBytes / (1024 * 1024)).toFixed(2)}MB`,
            });
          }
        }
      );

      // Check if compression failed to bring it under the limit
      if (fileToUse.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Failed to compress the image under the 5MB limit. Please upload a smaller image.',
          variant: 'destructive',
        });
        return;
      }
    } else if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB for PDF files.',
        variant: 'destructive',
      });
      return;
    }

    setFile(fileToUse);

    // Create preview for images
    if (fileToUse.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(fileToUse);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // If fully discounted (100% off), no file needed
    const needsSlip = finalAmount > 0;
    if (needsSlip && !file) return;

    setIsUploading(true);
    try {
      let slipUrl = null;
      
      if (file) {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${refId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-slips')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('payment-slips')
          .getPublicUrl(fileName);
        
        slipUrl = urlData.publicUrl;
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          payment_type: paymentType,
          ref_id: refId,
          amount: finalAmount,
          slip_url: slipUrl,
          status: finalAmount === 0 ? 'APPROVED' : 'PENDING', // Auto-approve if fully discounted
          note: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-Rs. ${discountAmount})` : null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Record coupon usage if applied
      if (appliedCoupon) {
        await supabase.from('coupon_usages').insert({
          coupon_id: appliedCoupon.id,
          user_id: user.id,
          payment_id: payment.id,
        });

        // Increment used_count
        await supabase
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
      }

      toast({
        title: finalAmount === 0 ? 'Payment complete!' : 'Payment submitted',
        description: finalAmount === 0 
          ? 'Your coupon covered the full amount. Access granted!'
          : 'Your payment slip has been uploaded. We will verify it within 24 hours.',
      });

      setFile(null);
      setPreview(null);
      setAppliedCoupon(null);
      setCouponCode('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Upload your bank transfer slip</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <span className="text-muted-foreground">Amount to Pay</span>
            <span className={cn(
              "text-xl font-bold",
              appliedCoupon && "line-through text-muted-foreground text-base"
            )}>
              Rs. {amount.toLocaleString()}
            </span>
          </div>
          
          {appliedCoupon && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 text-success">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">{appliedCoupon.code}</span>
                  <button 
                    onClick={removeCoupon}
                    className="ml-1 p-0.5 rounded-full hover:bg-success/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-medium">-Rs. {discountAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                <span className="font-medium text-primary">Final Amount</span>
                <span className="text-xl font-bold text-primary">
                  {finalAmount === 0 ? 'FREE' : `Rs. ${finalAmount.toLocaleString()}`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Coupon Input - only show if not approved/pending and no coupon applied */}
        {currentStatus !== 'APPROVED' && currentStatus !== 'PENDING' && !appliedCoupon && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Have a coupon code?
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError('');
                }}
                className="uppercase"
              />
              <Button 
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
              >
                {couponLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
            {couponError && (
              <p className="text-sm text-destructive">{couponError}</p>
            )}
          </div>
        )}

        {/* Current Status */}
        {currentStatus && (
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-lg",
            currentStatus === 'APPROVED' && "bg-success/10",
            currentStatus === 'PENDING' && "bg-warning/10",
            currentStatus === 'REJECTED' && "bg-destructive/10"
          )}>
            {currentStatus === 'APPROVED' && (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium text-success">Payment Verified</p>
                  <p className="text-sm text-muted-foreground">Access granted</p>
                </div>
              </>
            )}
            {currentStatus === 'PENDING' && (
              <>
                <Clock className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-medium text-warning">Verification Pending</p>
                  <p className="text-sm text-muted-foreground">We'll verify within 24 hours</p>
                </div>
              </>
            )}
            {currentStatus === 'REJECTED' && (
              <>
                <AlertCircle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Payment Rejected</p>
                  <p className="text-sm text-muted-foreground">Please upload a valid slip</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upload Form - only show if not approved and not pending */}
        {currentStatus !== 'APPROVED' && currentStatus !== 'PENDING' && (
          <div className="space-y-3">
            {/* Only show upload if payment needed */}
            {finalAmount > 0 ? (
              <>
                <Label>Upload Bank Slip</Label>
                
                {!file ? (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Click or drag to upload your bank slip
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or PDF up to 5MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg border p-4">
                    <button
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-1 rounded-full bg-muted hover:bg-muted/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {preview ? (
                      <img
                        src={preview}
                        alt="Slip preview"
                        className="max-h-48 mx-auto rounded"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  variant="hero"
                  disabled={!file || isUploading}
                  onClick={handleSubmit}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Submit Payment'
                  )}
                </Button>
              </>
            ) : (
              /* Fully discounted - no upload needed */
              <Button
                className="w-full"
                variant="hero"
                disabled={isUploading}
                onClick={handleSubmit}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Claim Free Access
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentUploadForm;
