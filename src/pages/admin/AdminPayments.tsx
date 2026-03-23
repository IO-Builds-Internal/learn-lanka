import { useState, useEffect } from 'react';
import { 
  Search, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  MoreVertical,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AdminLayout from '@/components/layouts/AdminLayout';
import PaymentVerificationDialog from '@/components/admin/PaymentVerificationDialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Payment {
  id: string;
  user_id: string;
  payment_type: string;
  ref_id: string;
  amount: number;
  slip_url: string | null;
  status: string;
  note: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const paymentsWithProfiles = data.map(payment => ({
        ...payment,
        profiles: profileMap.get(payment.user_id) || { first_name: 'Unknown', last_name: '', phone: '' }
      }));
      setPayments(paymentsWithProfiles as Payment[]);

    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const userName = `${payment.profiles?.first_name || ''} ${payment.profiles?.last_name || ''}`.toLowerCase();
    const phone = payment.profiles?.phone || '';
    const matchesSearch = 
      userName.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = payments.filter(p => p.status === 'PENDING').length;
  const approvedCount = payments.filter(p => p.status === 'APPROVED').length;
  const rejectedCount = payments.filter(p => p.status === 'REJECTED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="outline" className="badge-paid"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="badge-pending"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="badge-unpaid"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CLASS_MONTH':
        return <Badge variant="secondary">Class Payment</Badge>;
      case 'RANK_PAPER':
        return <Badge variant="secondary">Rank Paper</Badge>;
      case 'SHOP_ORDER':
        return <Badge variant="secondary">Shop Order</Badge>;
      default:
        return null;
    }
  };

  const handleViewSlip = (payment: Payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleDownloadSlip = async (payment: Payment) => {
    if (!payment.slip_url) return;
    
    try {
      // Extract path from the full URL
      const url = new URL(payment.slip_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/payment-slips\/(.+)/);
      
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const { data, error } = await supabase.storage
          .from('payment-slips')
          .createSignedUrl(filePath, 300); // 5 min expiry

        if (error) throw error;
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading slip:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Payments"
          description="Verify and manage all payment submissions"
          breadcrumbs={[{ label: 'Finance' }, { label: 'Payments' }]}
          actions={
            <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10 flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{approvedCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{rejectedCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CLASS_MONTH">Class Payment</SelectItem>
                  <SelectItem value="RANK_PAPER">Rank Paper</SelectItem>
                  <SelectItem value="SHOP_ORDER">Shop Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No payments found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {payment.profiles?.first_name} {payment.profiles?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{payment.profiles?.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(payment.payment_type)}</TableCell>
                          <TableCell className="font-semibold">Rs. {payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewSlip(payment)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View & Verify
                                </DropdownMenuItem>
                                {payment.slip_url && (
                                  <DropdownMenuItem onClick={() => handleDownloadSlip(payment)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Slip
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-border">
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{payment.profiles?.first_name} {payment.profiles?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.profiles?.phone}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSlip(payment)}>
                              <Eye className="w-4 h-4 mr-2" />View & Verify
                            </DropdownMenuItem>
                            {payment.slip_url && (
                              <DropdownMenuItem onClick={() => handleDownloadSlip(payment)}>
                                <Download className="w-4 h-4 mr-2" />Download Slip
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(payment.payment_type)}
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">Rs. {payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Dialog */}
      <PaymentVerificationDialog
        payment={selectedPayment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchPayments}
      />
    </AdminLayout>
  );
};

export default AdminPayments;
