import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus, Trash2, BookOpen } from 'lucide-react';

const AdminTeachers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');

  // Fetch teachers (users with teacher role)
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      if (!teacherRoles?.length) return [];
      const ids = teacherRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      // Get class counts per teacher
      const { data: classes } = await supabase
        .from('classes')
        .select('id, teacher_id, approval_status')
        .in('teacher_id', ids);
      return (profiles || []).map((p: any) => ({
        ...p,
        classCount: (classes || []).filter(c => c.teacher_id === p.id).length,
        pendingClasses: (classes || []).filter(c => c.teacher_id === p.id && c.approval_status === 'PENDING').length,
      }));
    },
  });

  // Search students to promote
  const { data: searchResults = [] } = useQuery({
    queryKey: ['teacher-promote-search', promoteSearch],
    queryFn: async () => {
      if (!promoteSearch || promoteSearch.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${promoteSearch}%,last_name.ilike.%${promoteSearch}%,phone.ilike.%${promoteSearch}%`)
        .limit(10);
      // Filter out existing teachers
      const teacherIds = teachers.map((t: any) => t.id);
      return (data || []).filter((p: any) => !teacherIds.includes(p.id));
    },
    enabled: promoteSearch.length >= 2,
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'teacher' as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User promoted to teacher');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      setPromoteOpen(false);
      setPromoteSearch('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'teacher' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teacher role removed');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredTeachers = teachers.filter((t: any) =>
    `${t.first_name} ${t.last_name} ${t.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <AdminPageHeader title="Teachers" description="Manage teacher accounts and class permissions" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setPromoteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Promote to Teacher
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredTeachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium">No teachers yet</h3>
            <p className="text-sm text-muted-foreground">Promote a user to teacher role to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTeachers.map((teacher: any) => (
            <Card key={teacher.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{teacher.first_name} {teacher.last_name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{teacher.classCount} classes</span>
                    </div>
                    {teacher.pendingClasses > 0 && (
                      <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                        {teacher.pendingClasses} pending
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => {
                      if (confirm('Remove teacher role from this user?')) {
                        removeMutation.mutate(teacher.id);
                      }
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote User to Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name or phone..."
              value={promoteSearch}
              onChange={e => setPromoteSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {searchResults.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => promoteMutation.mutate(user.id)}
                    disabled={promoteMutation.isPending}
                  >
                    Promote
                  </Button>
                </div>
              ))}
              {promoteSearch.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeachers;
