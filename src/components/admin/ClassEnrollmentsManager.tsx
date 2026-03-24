import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { format } from 'date-fns';
import { Search, Loader2, User, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EnrollmentWithProfile {
  id: string;
  user_id: string;
  class_id: string;
  status: string;
  enrolled_at: string;
  admin_note: string | null;
  profile: {
    first_name: string;
    last_name: string;
    phone: string;
    grade: number | null;
    school_name: string | null;
  } | null;
}

interface UserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  grade: number | null;
  school_name: string | null;
}

interface Props {
  classId: string;
  className: string;
}

const ClassEnrollmentsManager = ({ classId, className }: Props) => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeEnrollmentId, setRemoveEnrollmentId] = useState<string | null>(null);

  // Fetch enrollments with profiles
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['class-enrollments-admin', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('id, user_id, class_id, status, enrolled_at, admin_note')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const enrollmentsWithData: EnrollmentWithProfile[] = [];
      for (const enrollment of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, grade, school_name')
          .eq('id', enrollment.user_id)
          .single();

        enrollmentsWithData.push({
          ...enrollment,
          profile: profile || null,
        });
      }
      return enrollmentsWithData;
    },
  });

  // Search users to add
  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ['user-search-enroll', searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, grade, school_name')
        .or(`phone.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      // Filter out already enrolled users
      const enrolledIds = new Set(enrollments.map(e => e.user_id));
      return (data || []).filter((u: UserSearchResult) => !enrolledIds.has(u.id));
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const addEnrollmentMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Check if already enrolled (any status)
      const { data: existing } = await supabase
        .from('class_enrollments')
        .select('id, status')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'ACTIVE') throw new Error('User is already enrolled in this class');
        // Re-activate if previously removed
        const { error } = await supabase
          .from('class_enrollments')
          .update({ status: 'ACTIVE', enrolled_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_enrollments')
          .insert({ class_id: classId, user_id: userId, status: 'ACTIVE' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Student enrolled successfully');
      queryClient.invalidateQueries({ queryKey: ['class-enrollments-admin', classId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      setSearchQuery('');
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll student');
    },
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ status: 'REMOVED' })
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Student removed from class');
      queryClient.invalidateQueries({ queryKey: ['class-enrollments-admin', classId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      setRemoveEnrollmentId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove student');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enrolled Students</h3>
          <p className="text-sm text-muted-foreground">{className} — {enrollments.length} active students</p>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No students enrolled yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {enrollment.profile?.first_name} {enrollment.profile?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatPhoneDisplay(enrollment.profile?.phone)}
                    {enrollment.profile?.grade ? ` • Grade ${enrollment.profile.grade}` : ''}
                    {enrollment.profile?.school_name ? ` • ${enrollment.profile.school_name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setRemoveEnrollmentId(enrollment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Student
              </div>
            </DialogTitle>
            <DialogDescription>
              Search by name or phone number to enroll a student in {className}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatPhoneDisplay(user.phone)}
                          {user.grade ? ` • Grade ${user.grade}` : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addEnrollmentMutation.mutate(user.id)}
                      disabled={addEnrollmentMutation.isPending}
                      className="ml-2 flex-shrink-0"
                    >
                      {addEnrollmentMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Enroll
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Type at least 2 characters to search
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setSearchQuery(''); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeEnrollmentId} onOpenChange={(open) => !open && setRemoveEnrollmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the student from {className}. They can be re-enrolled later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeEnrollmentId && removeEnrollmentMutation.mutate(removeEnrollmentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeEnrollmentMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassEnrollmentsManager;
