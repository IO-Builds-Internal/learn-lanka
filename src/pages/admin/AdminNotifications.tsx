import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { 
  Bell, 
  Plus, 
  Send,
  Users,
  BookOpen,
  User,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminNotifications = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'CLASS' | 'USER'>('ALL');
  const [targetRef, setTargetRef] = useState('');

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Create notification mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          target_type: targetType,
          target_ref: targetType !== 'ALL' ? targetRef : null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send notification');
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete notification');
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTargetType('ALL');
    setTargetRef('');
  };

  const getTargetLabel = (type: string, ref: string | null) => {
    if (type === 'ALL') return 'All Users';
    if (type === 'CLASS') {
      const cls = classes.find(c => c.id === ref);
      return cls?.title || 'Class';
    }
    if (type === 'USER') {
      const user = users.find(u => u.id === ref);
      return user ? `${user.first_name} ${user.last_name}` : 'User';
    }
    return type;
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'ALL': return <Users className="w-4 h-4" />;
      case 'CLASS': return <BookOpen className="w-4 h-4" />;
      case 'USER': return <User className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Notifications"
          description="Send notifications to users"
          breadcrumbs={[{ label: 'Communication' }, { label: 'Notifications' }]}
          actions={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          }
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogDescription>
                  Create and send a notification to users
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Send To</Label>
                  <Select value={targetType} onValueChange={(v: 'ALL' | 'CLASS' | 'USER') => setTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Users</SelectItem>
                      <SelectItem value="CLASS">Specific Class</SelectItem>
                      <SelectItem value="USER">Individual User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetType === 'CLASS' && (
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select value={targetRef} onValueChange={setTargetRef}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === 'USER' && (
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={targetRef} onValueChange={setTargetRef}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({formatPhoneDisplay(user.phone)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Notification title" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Notification message..." 
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !title || !message || (targetType !== 'ALL' && !targetRef)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Notifications Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Sent Notifications</CardTitle>
            <CardDescription>History of all notifications</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell className="font-medium">{notif.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{notif.message}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getTargetIcon(notif.target_type)}
                        {getTargetLabel(notif.target_type, notif.target_ref)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(notif.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(notif.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No notifications sent</h3>
                <p className="text-sm text-muted-foreground">Send your first notification</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
