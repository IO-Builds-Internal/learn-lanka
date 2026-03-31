import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, BookOpen, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherClasses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeMin, setGradeMin] = useState('12');
  const [gradeMax, setGradeMax] = useState('13');
  const [subjectId, setSubjectId] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['teacher-classes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('classes')
        .select('*, subjects(name, slug, color)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createClass = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('classes').insert({
        title,
        description,
        grade_min: parseInt(gradeMin),
        grade_max: parseInt(gradeMax),
        subject_id: subjectId || null,
        teacher_id: user.id,
        created_by: user.id,
        approval_status: 'PENDING',
        monthly_fee_amount: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class submitted for admin approval');
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setSubjectId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
            <p className="text-muted-foreground">Create and manage your classes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />New Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Class Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Combined Maths - 2026 Batch" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your class..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Grade Min</label>
                    <Input type="number" value={gradeMin} onChange={e => setGradeMin(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Grade Max</label>
                    <Input type="number" value={gradeMax} onChange={e => setGradeMax(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⓘ Your class will be submitted for admin approval. The admin will set the pricing.
                </p>
                <Button
                  onClick={() => createClass.mutate()}
                  disabled={!title || createClass.isPending}
                  className="w-full"
                >
                  {createClass.isPending ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-1">No classes yet</h3>
              <p className="text-muted-foreground text-sm">Create your first class to start teaching</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls: any) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{cls.title}</CardTitle>
                    {getStatusBadge(cls.approval_status)}
                  </div>
                  {cls.subjects && (
                    <span className="text-xs font-medium" style={{ color: cls.subjects.color }}>
                      {cls.subjects.name}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cls.description || 'No description'}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Grade {cls.grade_min}–{cls.grade_max}</span>
                    {cls.monthly_fee_amount > 0 && (
                      <span className="font-medium text-foreground">Rs. {cls.monthly_fee_amount}/mo</span>
                    )}
                  </div>
                  {cls.approval_status === 'APPROVED' && (
                    <Link to={`/teacher/classes/${cls.id}/content`}>
                      <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                        Manage Content
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherClasses;
