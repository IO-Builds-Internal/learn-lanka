import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Loader2,
  Eye,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StudentLayout from '@/components/layouts/StudentLayout';
import BankAccountsList from '@/components/payments/BankAccountsList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_id: string;
  product_type: string;
  quantity: number;
  unit_price: number;
  shop_products: {
    title: string;
    type: string;
  } | null;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  address: string | null;
  note: string | null;
  slip_url: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending Payment', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  PAYMENT_UPLOADED: { label: 'Slip Uploaded', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Upload },
  PAYMENT_VERIFIED: { label: 'Payment Verified', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'bg-primary/10 text-primary border-primary/20', icon: Package },
  COMPLETED: { label: 'Completed', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  REJECTED: { label: 'Payment Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

const MyOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          *,
          items:shop_order_items(
            *,
            shop_products(title, type)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: !!user,
  });

  const pendingOrders = orders.filter(o => ['PENDING', 'REJECTED'].includes(o.status));
  const activeOrders = orders.filter(o => ['PAYMENT_UPLOADED', 'PAYMENT_VERIFIED', 'PROCESSING'].includes(o.status));
  const completedOrders = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG) or PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB');
      return;
    }
    setSlipFile(file);
  };

  const handleUploadSlip = async (orderId: string) => {
    if (!slipFile || !user) return;
    setIsUploading(true);
    try {
      const fileExt = slipFile.name.split('.').pop();
      const fileName = `${user.id}/order-${orderId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(fileName, slipFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('shop_orders')
        .update({ slip_url: urlData.publicUrl, status: 'PAYMENT_UPLOADED' })
        .eq('id', orderId);
      if (updateError) throw updateError;

      toast.success('Payment slip uploaded! We\'ll verify within 24 hours.');
      setUploadingOrderId(null);
      setSlipFile(null);
      queryClient.invalidateQueries({ queryKey: ['my-orders', user.id] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const OrderCard = ({ order }: { order: Order }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    const needsSlip = ['PENDING', 'REJECTED'].includes(order.status);

    return (
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <Badge variant="outline" className={cn('text-xs shrink-0', cfg.color)}>
              <Icon className="w-3 h-3 mr-1" />
              {cfg.label}
            </Badge>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-3">
            {order.items?.slice(0, 2).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.product_type === 'SOFT' ? (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{item.shop_products?.title}</span>
                <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                <span className="ml-auto shrink-0 font-medium">Rs. {(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            {(order.items?.length || 0) > 2 && (
              <p className="text-xs text-muted-foreground">+{(order.items.length - 2)} more items</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <span className="text-sm text-muted-foreground">Total: </span>
              <span className="font-bold">Rs. {order.total_amount.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
              {needsSlip && (
                <Button size="sm" onClick={() => { setUploadingOrderId(order.id); setSlipFile(null); }}>
                  <Upload className="w-4 h-4 mr-1" />
                  Pay
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <Card className="card-elevated">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">{message}</p>
        <Link to="/shop">
          <Button variant="outline" size="sm" className="mt-4">Browse Shop</Button>
        </Link>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="section-spacing">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track your shop orders and payment status</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
            <TabsTrigger value="pending">
              Pending {pendingOrders.length > 0 && <span className="ml-1.5 w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">{pendingOrders.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="active">Active {activeOrders.length > 0 && `(${activeOrders.length})`}</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingOrders.length === 0
              ? <EmptyState message="No pending orders" />
              : pendingOrders.map(o => <OrderCard key={o.id} order={o} />)
            }
          </TabsContent>

          <TabsContent value="active" className="space-y-3">
            {activeOrders.length === 0
              ? <EmptyState message="No active orders" />
              : activeOrders.map(o => <OrderCard key={o.id} order={o} />)
            }
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedOrders.length === 0
              ? <EmptyState message="No completed orders yet" />
              : completedOrders.map(o => <OrderCard key={o.id} order={o} />)
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                <Badge variant="outline" className={cn(STATUS_CONFIG[selectedOrder.status]?.color)}>
                  {STATUS_CONFIG[selectedOrder.status]?.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Items</p>
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p>{item.shop_products?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.product_type === 'SOFT' ? 'Soft Copy' : item.product_type === 'PRINTED' ? 'Printed' : 'Soft + Printed'}
                        {' × '}{item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">Rs. {(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {selectedOrder.address && (
                <div>
                  <p className="text-sm font-medium mb-1">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.address}</p>
                </div>
              )}

              {selectedOrder.note && (
                <div>
                  <p className="text-sm font-medium mb-1">Note</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.note}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t font-bold">
                <span>Total</span>
                <span>Rs. {selectedOrder.total_amount.toLocaleString()}</span>
              </div>

              {['PENDING', 'REJECTED'].includes(selectedOrder.status) && (
                <Button className="w-full" onClick={() => {
                  setSelectedOrder(null);
                  setUploadingOrderId(selectedOrder.id);
                  setSlipFile(null);
                }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Payment Slip
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Slip Dialog */}
      <Dialog open={!!uploadingOrderId} onOpenChange={() => { setUploadingOrderId(null); setSlipFile(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Payment Slip</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <BankAccountsList />

            <div className="space-y-3">
              <p className="text-sm font-medium">Upload Transfer Slip</p>
              {!slipFile ? (
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload bank slip</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF up to 5MB</p>
                  </div>
                </label>
              ) : (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{slipFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(slipFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSlipFile(null)}>Change</Button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!slipFile || isUploading}
              onClick={() => uploadingOrderId && handleUploadSlip(uploadingOrderId)}
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                'Submit Payment Slip'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default MyOrders;
