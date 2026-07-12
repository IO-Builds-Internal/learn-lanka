import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, BookOpen, Loader2, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const AdminClassApprovals = () => {
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['admin-class-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Fetch teacher profiles
      const teacherIds = [...new Set((data || []).filter(c => c.teacher_id).map(c => c.teacher_id!))];
      let teacherMap: Record<string, any> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', teacherIds);
        (profiles || []).forEach(p => { teacherMap[p.id] = p; });
      }
      return (data || []).map(c => ({ ...c, teacher: c.teacher_id ? teacherMap[c.teacher_id] : null }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('classes').update({ approval_status: status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Class ${status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-class-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-class-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = classes.filter(c => c.approval_status === 'PENDING');
  const approved = classes.filter(c => c.approval_status === 'APPROVED');
  const rejected = classes.filter(c => c.approval_status === 'REJECTED');

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'APPROVED') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
    if (status === 'REJECTED') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const ClassRow = ({ cls }: { cls: any }) => (
    <Card key={cls.id}>
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{cls.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {cls.teacher && <span>by {cls.teacher.first_name} {cls.teacher.last_name}</span>}
              {cls.subjects?.name && <span>• {cls.subjects.name}</span>}
              <span>• Grade {cls.grade_min === cls.grade_max ? cls.grade_min : `${cls.grade_min}-${cls.grade_max}`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={cls.approval_status} />
          {cls.approval_status === 'PENDING' && (
            <>
              <Button size="sm" className="gap-1" onClick={() => updateStatusMutation.mutate({ id: cls.id, status: 'APPROVED' })}>
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateStatusMutation.mutate({ id: cls.id, status: 'REJECTED' })}>
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </>
          )}
          {cls.approval_status === 'REJECTED' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: cls.id, status: 'APPROVED' })}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => deleteClassMutation.mutate(cls.id)}>
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>
          )}
          {cls.approval_status === 'APPROVED' && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: cls.id, status: 'REJECTED' })}>
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Class Approvals"
        description="Review and approve teacher-submitted classes"
        breadcrumbs={[{ label: 'Academics' }, { label: 'Class Approvals' }]}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? <p className="text-muted-foreground text-center py-8">No pending approvals</p> : pending.map(c => <ClassRow key={c.id} cls={c} />)}
          </TabsContent>
          <TabsContent value="approved" className="space-y-3 mt-4">
            {approved.length === 0 ? <p className="text-muted-foreground text-center py-8">No approved classes</p> : approved.map(c => <ClassRow key={c.id} cls={c} />)}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejected.length === 0 ? <p className="text-muted-foreground text-center py-8">No rejected classes</p> : rejected.map(c => <ClassRow key={c.id} cls={c} />)}
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
};

export default AdminClassApprovals;
