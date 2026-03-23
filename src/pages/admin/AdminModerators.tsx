import { useState } from 'react';
import { 
  Search, 
  MoreVertical, 
  Shield,
  ShieldOff,
  CheckCircle,
  Ban,
  Loader2,
  UserPlus,
  BookOpen,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';
import { 
  useAdminUsers, 
  useAddModeratorRole, 
  useRemoveModeratorRole,
  UserWithDetails 
} from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const AdminModerators = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [addModeratorOpen, setAddModeratorOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [userToRemove, setUserToRemove] = useState<UserWithDetails | null>(null);
  const [assignClassesUser, setAssignClassesUser] = useState<UserWithDetails | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const { isAdmin } = useAuth();
  const { data: users = [], isLoading, error } = useAdminUsers();
  const addModerator = useAddModeratorRole();
  const removeModerator = useRemoveModeratorRole();

  // Fetch all classes
  const { data: classes = [] } = useQuery({
    queryKey: ['all-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title, grade_min, grade_max')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch moderator assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['moderator-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderator_class_assignments')
        .select('moderator_id, class_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Get assigned classes for a moderator
  const getAssignedClasses = (userId: string) => {
    return assignments
      .filter(a => a.moderator_id === userId)
      .map(a => a.class_id);
  };

  // Update assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async ({ userId, classIds }: { userId: string; classIds: string[] }) => {
      // First delete all existing assignments for this moderator
      const { error: deleteError } = await supabase
        .from('moderator_class_assignments')
        .delete()
        .eq('moderator_id', userId);
      if (deleteError) throw deleteError;

      // Then insert new assignments
      if (classIds.length > 0) {
        const { error: insertError } = await supabase
          .from('moderator_class_assignments')
          .insert(classIds.map(classId => ({
            moderator_id: userId,
            class_id: classId,
          })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success('Class assignments updated!');
      queryClient.invalidateQueries({ queryKey: ['moderator-assignments'] });
      setAssignClassesUser(null);
      setSelectedClasses([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update assignments');
    },
  });

  const openAssignDialog = (user: UserWithDetails) => {
    setAssignClassesUser(user);
    setSelectedClasses(getAssignedClasses(user.id));
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const saveAssignments = () => {
    if (assignClassesUser) {
      updateAssignmentsMutation.mutate({
        userId: assignClassesUser.id,
        classIds: selectedClasses,
      });
    }
  };

  // Filter to show only moderators
  const moderators = users.filter(user => 
    user.roles.includes('moderator') || user.roles.includes('admin')
  );

  const filteredModerators = moderators.filter((user) => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    return matchesSearch;
  });

  // Users who are not yet moderators (for adding)
  const nonModerators = users.filter(user => 
    !user.roles.includes('moderator') && !user.roles.includes('admin')
  );

  const filteredNonModerators = nonModerators.filter((user) => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      user.phone.includes(addSearchQuery);
    return matchesSearch;
  });

  const handleAddModerator = async (user: UserWithDetails) => {
    await addModerator.mutateAsync(user.id);
    setAddModeratorOpen(false);
    setAddSearchQuery('');
  };

  const handleRemoveModerator = async () => {
    if (userToRemove) {
      await removeModerator.mutateAsync(userToRemove.id);
      setUserToRemove(null);
    }
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground mb-2">Access Denied</h3>
          <p className="text-sm text-muted-foreground">Only admins can manage moderators</p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">Failed to load users</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Moderators</h1>
            <p className="text-muted-foreground">Manage platform moderators</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="w-fit">
              {moderators.length} moderators
            </Badge>
            <Dialog open={addModeratorOpen} onOpenChange={setAddModeratorOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Moderator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Moderator</DialogTitle>
                  <DialogDescription>
                    Search for a user to make them a moderator
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={addSearchQuery}
                      onChange={(e) => setAddSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredNonModerators.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {addSearchQuery ? 'No users found' : 'All users are already moderators'}
                      </p>
                    ) : (
                      filteredNonModerators.slice(0, 10).map(user => (
                        <div 
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-muted-foreground">{user.phone}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAddModerator(user)}
                            disabled={addModerator.isPending}
                          >
                            {addModerator.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search moderators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Moderators Table */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Assigned Classes</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModerators.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            user.roles.includes('admin') 
                              ? "bg-destructive/10" 
                              : "bg-warning/10"
                          )}>
                            <Shield className={cn(
                              "w-4 h-4",
                              user.roles.includes('admin') ? "text-destructive" : "text-warning"
                            )} />
                          </div>
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.phone}</TableCell>
                      <TableCell>
                        {user.roles.includes('admin') ? (
                          <span className="text-muted-foreground text-sm">All classes</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const assignedCount = getAssignedClasses(user.id).length;
                              return assignedCount > 0 ? (
                                <Badge variant="outline" className="gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {assignedCount} class{assignedCount !== 1 ? 'es' : ''}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">None assigned</span>
                              );
                            })()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.roles.includes('admin') ? (
                          <Badge variant="destructive">Admin</Badge>
                        ) : (
                          <Badge className="bg-warning text-warning-foreground">Moderator</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            user.status === 'ACTIVE' ? 'badge-paid' : 'badge-unpaid'
                          )}
                        >
                          {user.status === 'ACTIVE' ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><Ban className="w-3 h-3 mr-1" /> Suspended</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!user.roles.includes('admin') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAssignDialog(user)}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                Assign Classes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setUserToRemove(user)}
                              >
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Remove Moderator
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredModerators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No moderators found</h3>
                <p className="text-sm text-muted-foreground">Add moderators using the button above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Moderator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.first_name} {userToRemove?.last_name} as a moderator?
              They will no longer be able to manage content or verify payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveModerator}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Classes Dialog */}
      <Dialog open={!!assignClassesUser} onOpenChange={(open) => !open && setAssignClassesUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Assign Classes
            </DialogTitle>
            <DialogDescription>
              Select classes for {assignClassesUser?.first_name} {assignClassesUser?.last_name} to manage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {classes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No classes available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedClasses.includes(cls.id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleClassSelection(cls.id)}
                  >
                    <Checkbox
                      checked={selectedClasses.includes(cls.id)}
                      onCheckedChange={() => toggleClassSelection(cls.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{cls.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Grade {cls.grade_min === cls.grade_max ? cls.grade_min : `${cls.grade_min}-${cls.grade_max}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignClassesUser(null)}>
              Cancel
            </Button>
            <Button 
              onClick={saveAssignments}
              disabled={updateAssignmentsMutation.isPending}
            >
              {updateAssignmentsMutation.isPending ? 'Saving...' : 'Save Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminModerators;
