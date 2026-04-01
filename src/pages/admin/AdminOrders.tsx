import { useState } from 'react';
import {
  ShoppingBag,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  Loader2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layouts/AdminLayout';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

interface OrderItem {
  id: string;
  product_id: string;
  product_type: string;
  quantity: number;
  unit_price: number;
  shop_products: { title: string; type: string } | null;
}

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  address: string | null;
  note: string | null;
  slip_url: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  profiles: { first_name: string; last_name: string; phone: string } | null;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending Payment' },
  { value: 'PAYMENT_UPLOADED', label: 'Slip Uploaded' },
  { value: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Payment Rejected' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PAYMENT_UPLOADED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PAYMENT_VERIFIED: 'bg-success/10 text-success border-success/20',
  PROCESSING: 'bg-primary/10 text-primary border-primary/20',
  COMPLETED: 'bg-success/10 text-success border-success/20',
  CANCELLED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const { isTeacher, isAdmin, isModerator, profile } = useAuth();
  const location = useLocation();
  const isTeacherRoute = location.pathname.startsWith('/teacher');
  const teacherSubjectId = isTeacher && !isAdmin && !isModerator ? profile?.subject_id : null;
  const Layout = isTeacherRoute ? TeacherLayout : AdminLayout;

  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', teacherSubjectId],
    queryFn: async () => {
      let query = supabase
        .from('shop_orders')
        .select(`
          *,
          items:shop_order_items(*, shop_products(title, type))
        `)
        .order('created_at', { ascending: false });
      if (teacherSubjectId) {
        query = query.eq('subject_id', teacherSubjectId);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Enrich with profiles
      const orders = data || [];
      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      return orders.map(o => ({
        ...o,
        profiles: profileMap[o.user_id] || null,
      })) as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Order marked as ${STATUS_OPTIONS.find(s => s.value === status)?.label}`);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  const getSignedUrl = async (url: string) => {
    try {
      // Extract path from URL
      const pathMatch = url.match(/payment-slips\/(.+)/);
      if (!pathMatch) { setSlipPreviewUrl(url); return; }
      const { data } = await supabase.storage
        .from('payment-slips')
        .createSignedUrl(pathMatch[1], 3600);
      setSlipPreviewUrl(data?.signedUrl || url);
    } catch {
      setSlipPreviewUrl(url);
    }
  };

  const filteredOrders = orders.filter(o => {
    const name = `${o.profiles?.first_name} ${o.profiles?.last_name}`.toLowerCase();
    const id = o.id.toLowerCase();
    return name.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
  });

  const byStatus = (statuses: string[]) => filteredOrders.filter(o => statuses.includes(o.status));

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const OrderRow = ({ order }: { order: Order }) => (
    <TableRow className="cursor-pointer" onClick={() => setSelectedOrder(order)}>
      <TableCell>
        <p className="font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</p>
        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
      </TableCell>
      <TableCell>
        <p className="font-medium text-sm">{order.profiles?.first_name} {order.profiles?.last_name}</p>
        <p className="text-xs text-muted-foreground">{order.profiles?.phone}</p>
      </TableCell>
      <TableCell>
        <p className="text-sm">{order.items?.length} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
        <p className="text-xs text-muted-foreground">{order.items?.map(i => i.shop_products?.title).filter(Boolean).join(', ').slice(0, 40)}</p>
      </TableCell>
      <TableCell>
        <p className="font-semibold text-sm">Rs. {order.total_amount.toLocaleString()}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-xs', STATUS_BADGE[order.status])}>
          {STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status}
        </Badge>
      </TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        <div className="flex gap-1">
          {!teacherSubjectId && order.status === 'PAYMENT_UPLOADED' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-success h-7 px-2"
                onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'PAYMENT_VERIFIED' })}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-7 px-2"
                onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'REJECTED' })}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {teacherSubjectId && order.status === 'PAYMENT_VERIFIED' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-7 px-2"
              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'PROCESSING' })}
            >
              <Package className="w-4 h-4" />
            </Button>
          )}
          {teacherSubjectId && order.status === 'PROCESSING' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-success h-7 px-2"
              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'COMPLETED' })}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedOrder(order)}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const TableView = ({ orders: list }: { orders: Order[] }) => (
    <Card className="card-elevated">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              list.map(o => <OrderRow key={o.id} order={o} />)
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const needsAttention = byStatus(['PAYMENT_UPLOADED']);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Shop Orders"
          description="Review payments, verify slips, and manage order fulfillment"
          breadcrumbs={[{ label: 'Finance' }, { label: 'Shop Orders' }]}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-primary bg-primary/10' },
            { label: 'Needs Review', value: needsAttention.length, icon: Clock, color: 'text-warning bg-warning/10' },
            { label: 'Processing', value: byStatus(['PAYMENT_VERIFIED', 'PROCESSING']).length, icon: Package, color: 'text-blue-500 bg-blue-500/10' },
            { label: 'Completed', value: byStatus(['COMPLETED']).length, icon: CheckCircle, color: 'text-success bg-success/10' },
          ].map(stat => (
            <Card key={stat.label} className="card-elevated">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="review">
          <TabsList>
            <TabsTrigger value="review">
              Needs Review
              {needsAttention.length > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                  {needsAttention.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="mt-4">
            <TableView orders={byStatus(['PAYMENT_UPLOADED'])} />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <TableView orders={byStatus(['PAYMENT_VERIFIED', 'PROCESSING', 'PENDING', 'REJECTED'])} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <TableView orders={filteredOrders} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-5">
              {/* Customer */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.phone}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {item.product_type === 'SOFT' ? <FileText className="w-4 h-4 text-muted-foreground" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <p>{item.shop_products?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product_type === 'SOFT' ? 'Soft Copy' : item.product_type === 'PRINTED' ? 'Printed' : 'Soft + Printed'} × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">Rs. {(item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2 font-bold">
                  <span>Total</span>
                  <span>Rs. {selectedOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.address && (
                <div>
                  <p className="text-sm font-medium mb-1">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.address}</p>
                </div>
              )}

              {/* Slip */}
              {selectedOrder.slip_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Payment Slip</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getSignedUrl(selectedOrder.slip_url!)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Slip
                  </Button>
                </div>
              )}

              {/* Status Update */}
              <div>
                <p className="text-sm font-medium mb-2">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {/* Admin-only: verify/reject payments */}
                  {!teacherSubjectId && selectedOrder.status === 'PAYMENT_UPLOADED' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'PAYMENT_VERIFIED' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'REJECTED' })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {/* Teacher info: waiting for admin verification */}
                  {teacherSubjectId && selectedOrder.status === 'PAYMENT_UPLOADED' && (
                    <p className="text-sm text-muted-foreground italic">Waiting for admin to verify payment</p>
                  )}
                  {selectedOrder.status === 'PAYMENT_VERIFIED' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'PROCESSING' })}
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Mark Processing
                    </Button>
                  )}
                  {selectedOrder.status === 'PROCESSING' && (
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'COMPLETED' })}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Completed
                    </Button>
                  )}
                  {/* Admin-only: full status dropdown */}
                  {!teacherSubjectId && (
                    <Select
                      value={selectedOrder.status}
                      onValueChange={status => updateStatusMutation.mutate({ id: selectedOrder.id, status })}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Slip Preview Dialog */}
      <Dialog open={!!slipPreviewUrl} onOpenChange={() => setSlipPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payment Slip</DialogTitle></DialogHeader>
          {slipPreviewUrl && (
            slipPreviewUrl.includes('.pdf') ? (
              <iframe src={slipPreviewUrl} className="w-full h-96 rounded" />
            ) : (
              <img src={slipPreviewUrl} alt="Payment slip" className="w-full rounded max-h-[70vh] object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
