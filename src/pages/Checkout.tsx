import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  FileText, 
  Loader2,
  ShoppingBag,
  MapPin,
  Phone,
  CreditCard,
  CheckCircle2,
  Tag,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import StudentLayout from '@/components/layouts/StudentLayout';
import BankAccountsList from '@/components/payments/BankAccountsList';
import PaymentUploadForm from '@/components/payments/PaymentUploadForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatPhoneDisplay } from '@/lib/utils';

type ProductType = 'SOFT' | 'PRINTED' | 'BOTH';

interface CartItem {
  productId: string;
  selectedType: ProductType;
  quantity: number;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price_soft: number | null;
  price_printed: number | null;
  price_both: number | null;
}

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Form fields
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // Coupon fields
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Load cart from location state or localStorage
  useEffect(() => {
    const loadCart = async () => {
      const cartData = location.state?.cart || JSON.parse(localStorage.getItem('shopCart') || '[]');
      setCart(cartData);

      if (cartData.length > 0) {
        const productIds = cartData.map((item: CartItem) => item.productId);
        const uniqueIds = [...new Set(productIds)] as string[];
        const { data } = await supabase
          .from('shop_products')
          .select('*')
          .in('id', uniqueIds);
        setProducts(data || []);
      }
      setIsLoading(false);
    };

    loadCart();
  }, [location.state]);

  // Load user profile for phone
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('phone, address')
        .eq('id', user.id)
        .single();
      if (data) {
        setPhone(formatPhoneDisplay(data.phone) || '');
        setDeliveryAddress(data.address || '');
      }
    };
    loadProfile();
  }, [user]);

  const getPrice = (product: Product, type: ProductType) => {
    switch (type) {
      case 'SOFT': return product.price_soft || 0;
      case 'PRINTED': return product.price_printed || 0;
      case 'BOTH': return product.price_both || 0;
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return sum;
    return sum + getPrice(product, item.selectedType) * item.quantity;
  }, 0);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    let discountAmount = 0;
    switch (appliedCoupon.discount_type) {
      case 'PERCENT':
        discountAmount = Math.round(cartSubtotal * (appliedCoupon.discount_value / 100));
        break;
      case 'FIXED':
        discountAmount = appliedCoupon.discount_value;
        break;
      case 'FULL':
        discountAmount = cartSubtotal;
        break;
    }
    // Always cap discount at cart subtotal - no refunds for excess
    return Math.min(discountAmount, cartSubtotal);
  };

  const discount = calculateDiscount();
  const cartTotal = cartSubtotal - discount;

  const needsDelivery = cart.some(item => 
    item.selectedType === 'PRINTED' || item.selectedType === 'BOTH'
  );

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!user) {
      toast.error('Please login to apply coupon');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      // Find the coupon
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        toast.error('Invalid coupon code');
        return;
      }

      // Check expiry
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        toast.error('This coupon has expired');
        return;
      }

      // Check if not yet valid
      if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
        toast.error('This coupon is not yet valid');
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error('This coupon has reached its usage limit');
        return;
      }

      // Check if user already used this coupon
      const { data: existingUsage } = await supabase
        .from('coupon_usages')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id);

      if (existingUsage && existingUsage.length > 0) {
        toast.error('You have already used this coupon');
        return;
      }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      });
      setCouponCode('');
      toast.success('Coupon applied successfully!');
    } catch (error: any) {
      toast.error('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed');
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (needsDelivery && !deliveryAddress.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create order
      const { data: order, error: orderError } = await (supabase as any)
        .from('shop_orders')
        .insert({
          user_id: user.id,
          total_amount: cartTotal,
          delivery_address: needsDelivery ? deliveryAddress : null,
          phone: phone,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          order_id: order.id,
          product_id: item.productId,
          product_type: item.selectedType,
          quantity: item.quantity,
          unit_price: product ? getPrice(product, item.selectedType) : 0
        };
      });

      const { error: itemsError } = await (supabase as any)
        .from('shop_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Record coupon usage if applied
      if (appliedCoupon) {
        await supabase.from('coupon_usages').insert({
          coupon_id: appliedCoupon.id,
          user_id: user.id
        });
        
        // Increment coupon used_count
        await supabase.from('coupons')
          .update({ used_count: (await supabase.from('coupons').select('used_count').eq('id', appliedCoupon.id).single()).data?.used_count + 1 || 1 })
          .eq('id', appliedCoupon.id);
      }

      setOrderId(order.id);
      setStep('payment');
      
      // Clear cart
      localStorage.removeItem('shopCart');

    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Update order status to PAYMENT_UPLOADED
    if (orderId) {
      await supabase
        .from('shop_orders')
        .update({ status: 'PAYMENT_UPLOADED' })
        .eq('id', orderId);
    }
    setStep('success');
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (cart.length === 0 && step === 'details') {
    return (
      <StudentLayout>
        <div className="section-spacing">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">Add some products to checkout</p>
              <Button onClick={() => navigate('/shop')}>
                Browse Shop
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  if (step === 'success') {
    return (
      <StudentLayout>
        <div className="section-spacing">
          <Card className="card-elevated max-w-lg mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Order Placed Successfully!</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Your order has been placed and payment slip uploaded. 
                We'll verify your payment and process your order soon.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/shop')}>
                  Continue Shopping
                </Button>
                <Button onClick={() => navigate('/my-orders')}>
                  View Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="section-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => step === 'payment' ? setStep('details') : navigate('/shop')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {step === 'details' ? 'Checkout' : 'Payment'}
            </h1>
            <p className="text-muted-foreground">
              {step === 'details' ? 'Review your order and enter delivery details' : 'Upload payment slip to complete order'}
            </p>
          </div>
        </div>

        {step === 'details' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>{cart.reduce((sum, i) => sum + i.quantity, 0)} items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    const price = getPrice(product, item.selectedType);
                    
                    return (
                      <div key={`${item.productId}-${item.selectedType}`} className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {item.selectedType === 'SOFT' ? (
                            <FileText className="w-6 h-6 text-primary" />
                          ) : (
                            <Package className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.selectedType === 'BOTH' ? 'Soft + Printed' : item.selectedType === 'SOFT' ? 'Soft Copy' : 'Printed Copy'}
                            {' × '}{item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">
                          Rs. {(price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="07X XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {needsDelivery && (
                    <div className="space-y-2">
                      <Label htmlFor="address">Delivery Address *</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter your full delivery address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <div className="space-y-6">
              <Card className="card-elevated sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Section */}
                  {!appliedCoupon ? (
                    <div className="space-y-2">
                      <Label>Coupon Code</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon}
                        >
                          {isApplyingCoupon ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg border border-success/20">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">{appliedCoupon.code}</span>
                        <span className="text-xs text-muted-foreground">
                          ({appliedCoupon.discount_type === 'PERCENT' 
                            ? `${appliedCoupon.discount_value}% off` 
                            : appliedCoupon.discount_type === 'FULL' 
                              ? 'Free' 
                              : `Rs. ${appliedCoupon.discount_value} off`})
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={handleRemoveCoupon}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>Rs. {cartSubtotal.toLocaleString()}</span>
                    </div>
                    {appliedCoupon && discount > 0 && (
                      <div className="flex justify-between text-sm text-success">
                        <span>Discount</span>
                        <span>- Rs. {discount.toLocaleString()}</span>
                      </div>
                    )}
                    {needsDelivery && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="text-success">Free</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>Rs. {cartTotal.toLocaleString()}</span>
                  </div>

                  <Button 
                    className="w-full" 
                    variant="hero"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    You'll upload a bank slip in the next step
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'payment' && orderId && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Bank Transfer Details</CardTitle>
                <CardDescription>
                  Transfer Rs. {cartTotal.toLocaleString()} to one of these accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BankAccountsList />
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Upload Payment Slip</CardTitle>
                <CardDescription>
                  Upload a screenshot or photo of your bank transfer receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentUploadForm
                  paymentType="SHOP_ORDER"
                  refId={orderId}
                  amount={cartTotal}
                  title="Shop Order Payment"
                  onSuccess={handlePaymentSuccess}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default Checkout;
