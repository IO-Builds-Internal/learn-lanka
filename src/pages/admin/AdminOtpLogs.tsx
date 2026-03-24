import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, KeyRound, Clock, Phone, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PURPOSE_LABELS: Record<string, { label: string; color: string }> = {
  REGISTER:      { label: 'Register',       color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  LOGIN:         { label: 'Login',          color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  RECOVERY:      { label: 'Password Reset', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  PRIVATE_ENROLL:{ label: 'Private Enroll', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
};

const AdminOtpLogs = () => {
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-otp-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otp_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const filtered = logs.filter(log =>
    !search ||
    log.phone.includes(search) ||
    log.purpose.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <AdminPageHeader
          title="OTP Logs"
          description="Real-time log of sent OTP verification codes"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or purpose..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            Auto-refreshes every 15s · Showing last 200
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(PURPOSE_LABELS).map(([key, { label, color }]) => {
            const count = logs.filter(l => l.purpose === key).length;
            return (
              <div key={key} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                <span className="text-lg font-bold ml-auto">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Phone className="w-3.5 h-3.5 inline mr-1.5" />Phone</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead><Clock className="w-3.5 h-3.5 inline mr-1.5" />Sent At</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading OTP logs...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No OTP logs found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => {
                  const expired = isExpired(log.expires_at);
                  const purposeMeta = PURPOSE_LABELS[log.purpose] ?? { label: log.purpose, color: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono font-medium">
                        {log.phone}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${purposeMeta.color}`}>
                          {purposeMeta.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-sm ${log.attempts > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                          {log.attempts > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                          {log.attempts} / 3
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span title={format(new Date(log.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.expires_at), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300 dark:border-green-700">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOtpLogs;
