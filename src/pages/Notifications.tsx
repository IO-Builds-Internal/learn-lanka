import { Bell, Clock, BookOpen, CreditCard, FileText, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StudentLayout from '@/components/layouts/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch read notification IDs for current user
  const { data: readNotificationIds = [] } = useQuery({
    queryKey: ['notification-reads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data?.map(r => r.notification_id) || [];
    },
    enabled: !!user,
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Get unread notification IDs
      const unreadIds = notifications
        .filter(n => !readNotificationIds.includes(n.id))
        .map(n => ({ user_id: user.id, notification_id: n.id }));
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('user_notification_reads')
        .upsert(unreadIds, { onConflict: 'user_id,notification_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-reads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count', user?.id] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark notifications as read');
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_notification_reads')
        .upsert({ user_id: user.id, notification_id: notificationId }, { onConflict: 'user_id,notification_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-reads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count', user?.id] });
    },
  });

  const getIcon = (title: string) => {
    if (title.toLowerCase().includes('rank') || title.toLowerCase().includes('paper')) {
      return FileText;
    }
    if (title.toLowerCase().includes('payment')) {
      return CreditCard;
    }
    if (title.toLowerCase().includes('class') || title.toLowerCase().includes('schedule')) {
      return BookOpen;
    }
    return Bell;
  };

  const unreadCount = notifications.filter(n => !readNotificationIds.includes(n.id)).length;

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
      <div className="section-spacing max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with class announcements
              {unreadCount > 0 && (
                <span className="ml-2 text-primary font-medium">({unreadCount} unread)</span>
              )}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Mark all as read
          </Button>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.title);
            const isRead = readNotificationIds.includes(notification.id);

            return (
              <Card 
                key={notification.id} 
                className={cn(
                  "card-elevated transition-colors cursor-pointer",
                  !isRead && "border-primary/50 bg-primary/5"
                )}
                onClick={() => !isRead && markAsReadMutation.mutate(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isRead ? "bg-muted" : "bg-primary/10"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isRead ? "text-muted-foreground" : "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn(
                          "font-medium",
                          isRead ? "text-foreground" : "text-primary"
                        )}>
                          {notification.title}
                        </h3>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {notifications.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No notifications</h3>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Notifications;
