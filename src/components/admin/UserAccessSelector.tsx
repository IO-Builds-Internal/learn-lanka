import { useState } from 'react';
import { Search, UserPlus, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatPhoneDisplay } from '@/lib/utils';

interface UserAccessSelectorProps {
  attachmentId: string;
  attachmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const UserAccessSelector = ({ attachmentId, attachmentTitle, open, onOpenChange }: UserAccessSelectorProps) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch current access list
  const { data: currentAccess = [], isLoading: loadingAccess } = useQuery({
    queryKey: ['attachment-user-access', attachmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('paper_attachment_user_access')
        .select('user_id')
        .eq('attachment_id', attachmentId);
      if (error) throw error;
      return (data || []).map((d: any) => d.user_id);
    },
    enabled: open,
  });

  // Fetch all users for search
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['all-profiles-for-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .order('first_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: open,
  });

  // Filtered users based on search
  const filteredUsers = allUsers.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(search) ||
      user.last_name.toLowerCase().includes(search) ||
      formatPhoneDisplay(user.phone).includes(search)
    );
  });

  // Users with access
  const usersWithAccess = allUsers.filter(u => currentAccess.includes(u.id));

  // Add user access mutation
  const addAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('paper_attachment_user_access')
        .insert({
          attachment_id: attachmentId,
          user_id: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-user-access', attachmentId] });
      toast.success('User access granted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add access');
    },
  });

  // Remove user access mutation
  const removeAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('paper_attachment_user_access')
        .delete()
        .eq('attachment_id', attachmentId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachment-user-access', attachmentId] });
      toast.success('User access removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove access');
    },
  });

  const hasAccess = (userId: string) => currentAccess.includes(userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage User Access</DialogTitle>
          <DialogDescription>
            Select users who can access: {attachmentTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Access */}
          {usersWithAccess.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Users with access ({usersWithAccess.length})</p>
              <div className="flex flex-wrap gap-2">
                {usersWithAccess.map((user) => (
                  <Badge 
                    key={user.id} 
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {user.first_name} {user.last_name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => removeAccessMutation.mutate(user.id)}
                      disabled={removeAccessMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User List */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {loadingUsers || loadingAccess ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user) => {
                  const userHasAccess = hasAccess(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer ${
                        userHasAccess ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        if (userHasAccess) {
                          removeAccessMutation.mutate(user.id);
                        } else {
                          addAccessMutation.mutate(user.id);
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhoneDisplay(user.phone)}
                        </p>
                      </div>
                      {userHasAccess ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccessSelector;
