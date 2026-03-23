import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/utils';
import { 
  Search, 
  MoreVertical, 
  User, 
  Ban,
  CheckCircle,
  Shield,
  ShieldOff,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';
import { 
  useAdminUsers, 
  useUpdateUserStatus, 
  useAddModeratorRole, 
  useRemoveModeratorRole,
  UserWithDetails 
} from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'add_mod' | 'remove_mod' | 'delete';
    user: UserWithDetails;
  } | null>(null);

  const { isAdmin, loading: authLoading } = useAuth();
  const { data: users = [], isLoading, error } = useAdminUsers();
  const updateStatus = useUpdateUserStatus();
  const addModerator = useAddModeratorRole();
  const removeModerator = useRemoveModeratorRole();

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesGrade = gradeFilter === 'all' || user.grade?.toString() === gradeFilter;
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'moderator' && user.roles.includes('moderator')) ||
      (roleFilter === 'student' && !user.roles.includes('moderator') && !user.roles.includes('admin'));
    return matchesSearch && matchesStatus && matchesGrade && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    const { type, user } = confirmAction;
    
    switch (type) {
      case 'suspend':
        await updateStatus.mutateAsync({ userId: user.id, status: 'SUSPENDED' });
        break;
      case 'activate':
        await updateStatus.mutateAsync({ userId: user.id, status: 'ACTIVE' });
        break;
      case 'add_mod':
        await addModerator.mutateAsync(user.id);
        break;
      case 'remove_mod':
        await removeModerator.mutateAsync(user.id);
        break;
    }
    
    setConfirmAction(null);
  };

  const getConfirmationText = () => {
    if (!confirmAction) return { title: '', description: '' };
    const { type, user } = confirmAction;
    const name = `${user.first_name} ${user.last_name}`;
    
    switch (type) {
      case 'suspend':
        return {
          title: 'Suspend User',
          description: `Are you sure you want to suspend ${name}? They will not be able to access the platform.`
        };
      case 'activate':
        return {
          title: 'Activate User',
          description: `Are you sure you want to activate ${name}? They will regain access to the platform.`
        };
      case 'add_mod':
        return {
          title: 'Add Moderator Role',
          description: `Are you sure you want to make ${name} a moderator? They will be able to manage content and verify payments.`
        };
      case 'remove_mod':
        return {
          title: 'Remove Moderator Role',
          description: `Are you sure you want to remove moderator role from ${name}?`
        };
      case 'delete':
        return {
          title: 'Delete User',
          description: `Are you sure you want to permanently delete ${name}? This action cannot be undone and will remove all their data.`
        };
    }
  };

  if (isLoading || authLoading) {
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
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Manage student and moderator accounts</p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {users.length} total users
          </Badge>
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
              <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={handleFilterChange(setRoleFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="moderator">Moderators</SelectItem>
                  <SelectItem value="student">Students Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={handleFilterChange(setGradeFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {[6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">School</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="hidden lg:table-cell">Classes</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            user.roles.includes('admin') 
                              ? "bg-destructive/10" 
                              : user.roles.includes('moderator')
                              ? "bg-warning/10"
                              : "bg-primary/10"
                          )}>
                            {user.roles.includes('admin') || user.roles.includes('moderator') ? (
                              <Shield className={cn("w-4 h-4", user.roles.includes('admin') ? "text-destructive" : "text-warning")} />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="font-medium text-sm">{user.first_name} {user.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatPhoneDisplay(user.phone)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{user.school_name || '-'}</TableCell>
                      <TableCell className="text-sm">{user.grade ? `G${user.grade}` : '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{user.enrolled_classes}</TableCell>
                      <TableCell>
                        {user.roles.includes('admin') ? (
                          <Badge variant="destructive" className="text-xs">Admin</Badge>
                        ) : user.roles.includes('moderator') ? (
                          <Badge className="bg-warning text-warning-foreground text-xs">Mod</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Student</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", user.status === 'ACTIVE' ? 'badge-paid' : 'badge-unpaid')}>
                          {user.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdmin && !user.roles.includes('admin') && (
                              <>
                                {user.roles.includes('moderator') ? (
                                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'remove_mod', user })}>
                                    <ShieldOff className="w-4 h-4 mr-2" />Remove Moderator
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'add_mod', user })}>
                                    <Shield className="w-4 h-4 mr-2" />Make Moderator
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!user.roles.includes('admin') && (
                              <>
                                <DropdownMenuItem 
                                  className={user.status === 'ACTIVE' ? 'text-destructive' : 'text-success'}
                                  onClick={() => setConfirmAction({ type: user.status === 'ACTIVE' ? 'suspend' : 'activate', user })}
                                >
                                  {user.status === 'ACTIVE' ? <><Ban className="w-4 h-4 mr-2" />Suspend</> : <><CheckCircle className="w-4 h-4 mr-2" />Activate</>}
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ type: 'delete', user })}>
                                      <Trash2 className="w-4 h-4 mr-2" />Delete User
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
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
            <div className="md:hidden divide-y divide-border">
              {paginatedUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        user.roles.includes('admin') ? "bg-destructive/10" : user.roles.includes('moderator') ? "bg-warning/10" : "bg-primary/10"
                      )}>
                        {user.roles.includes('admin') || user.roles.includes('moderator') 
                          ? <Shield className={cn("w-4 h-4", user.roles.includes('admin') ? "text-destructive" : "text-warning")} />
                          : <User className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatPhoneDisplay(user.phone)}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAdmin && !user.roles.includes('admin') && (
                          <>
                            {user.roles.includes('moderator') ? (
                              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'remove_mod', user })}>
                                <ShieldOff className="w-4 h-4 mr-2" />Remove Moderator
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'add_mod', user })}>
                                <Shield className="w-4 h-4 mr-2" />Make Moderator
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {!user.roles.includes('admin') && (
                          <>
                            <DropdownMenuItem 
                              className={user.status === 'ACTIVE' ? 'text-destructive' : 'text-success'}
                              onClick={() => setConfirmAction({ type: user.status === 'ACTIVE' ? 'suspend' : 'activate', user })}
                            >
                              {user.status === 'ACTIVE' ? <><Ban className="w-4 h-4 mr-2" />Suspend</> : <><CheckCircle className="w-4 h-4 mr-2" />Activate</>}
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ type: 'delete', user })}>
                                  <Trash2 className="w-4 h-4 mr-2" />Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.roles.includes('admin') ? <Badge variant="destructive" className="text-xs">Admin</Badge>
                      : user.roles.includes('moderator') ? <Badge className="bg-warning text-warning-foreground text-xs">Moderator</Badge>
                      : <Badge variant="secondary" className="text-xs">Student</Badge>}
                    <Badge variant="outline" className={cn("text-xs", user.status === 'ACTIVE' ? 'badge-paid' : 'badge-unpaid')}>
                      {user.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </Badge>
                    {user.grade && <span className="text-xs text-muted-foreground">Grade {user.grade}</span>}
                    {user.school_name && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user.school_name}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No users found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmationText().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationText().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsers;
