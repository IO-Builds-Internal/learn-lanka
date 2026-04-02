import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, BookOpen, Clock, CheckCircle, XCircle, MoreVertical, Edit, Users, Lock, Calendar, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherClasses = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeMin, setGradeMin] = useState('12');
  const [gradeMax, setGradeMax] = useState('13');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxStudents, setMaxStudents] = useState('');

  const teacherSubjectId = (profile as any)?.subject_id;

  const { data: teacherSubject } = useQuery({
    queryKey: ['teacher-subject', teacherSubjectId],
    queryFn: async () => {
      if (!teacherSubjectId) return null;
      const { data } = await supabase.from('subjects').select('*').eq('id', teacherSubjectId).single();
      return data;
    },
    enabled: !!teacherSubjectId,
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

  // Enrollment counts
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ['teacher-enrollment-counts', classes.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const cls of classes) {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', (cls as any).id)
          .eq('status', 'ACTIVE');
        counts[(cls as any).id] = count || 0;
      }
      return counts;
    },
    enabled: classes.length > 0,
  });

  const generatePrivateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGradeMin('12');
    setGradeMax('13');
    setIsPrivate(false);
    setMaxStudents('');
    setEditingClass(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cls: any) => {
    setEditingClass(cls);
    setTitle(cls.title);
    setDescription(cls.description || '');
    setGradeMin(cls.grade_min.toString());
    setGradeMax(cls.grade_max.toString());
    setIsPrivate(cls.is_private);
    setMaxStudents(cls.max_students?.toString() || '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const createClass = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!teacherSubjectId) throw new Error('No subject assigned. Contact admin.');
      const { error } = await supabase.from('classes').insert({
        title,
        description: description || null,
        grade_min: parseInt(gradeMin),
        grade_max: parseInt(gradeMax),
        subject_id: teacherSubjectId,
        teacher_id: user.id,
        created_by: user.id,
        approval_status: 'PENDING',
        monthly_fee_amount: 0,
        is_private: isPrivate,
        private_code: isPrivate ? generatePrivateCode() : null,
        max_students: isPrivate && maxStudents ? parseInt(maxStudents) : null,
        status: 'DRAFT',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class submitted for admin approval');
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateClass = useMutation({
    mutationFn: async () => {
      if (!editingClass) return;
      const { error } = await supabase.from('classes').update({
        title,
        description: description || null,
        grade_min: parseInt(gradeMin),
        grade_max: parseInt(gradeMax),
        is_private: isPrivate,
        private_code: isPrivate ? (editingClass.private_code || generatePrivateCode()) : null,
        max_students: isPrivate && maxStudents ? parseInt(maxStudents) : null,
      }).eq('id', editingClass.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class updated');
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (editingClass) {
      updateClass.mutate();
    } else {
      createClass.mutate();
    }
  };

  const getStatusBadge = (cls: any) => {
    const status = cls.status || 'ACTIVE';
    const approval = cls.approval_status;

    if (approval === 'PENDING') return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
    if (approval === 'REJECTED') return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;

    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><XCircle className="w-3 h-3 mr-1" />Reg. Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isPending = editingClass ? updateClass.isPending : createClass.isPending;

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
            <p className="text-muted-foreground">Create and manage your classes</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />New Class
          </Button>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
              <DialogDescription>
                {editingClass ? 'Update your class details' : 'Submit a new class for admin approval'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {teacherSubject && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="text-xs text-muted-foreground">Subject (assigned by admin)</p>
                  <p className="font-medium" style={{ color: teacherSubject.color }}>{teacherSubject.name}</p>
                </div>
              )}
              {!teacherSubjectId && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-sm text-destructive">No subject assigned. Contact admin to assign your subject.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Class Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Combined Maths - 2026 Batch" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your class..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Grade Min</Label>
                  <Select value={gradeMin} onValueChange={setGradeMin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[6,7,8,9,10,11,12,13].map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grade Max</Label>
                  <Select value={gradeMax} onValueChange={setGradeMax}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[6,7,8,9,10,11,12,13].map(g => (
                        <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Private class toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Private Class
                  </Label>
                  <p className="text-xs text-muted-foreground">Require invite code to enroll</p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>

              {isPrivate && (
                <div className="p-3 border rounded-lg space-y-3 bg-muted/50">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Max Students (optional)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Leave empty for unlimited"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                    />
                  </div>
                  {editingClass?.private_code && (
                    <div>
                      <p className="text-xs text-muted-foreground">Invite Code</p>
                      <p className="font-mono text-sm font-bold tracking-wider">{editingClass.private_code}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">An invite code will be auto-generated</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                ⓘ {editingClass ? 'Pricing and status are managed by admin.' : 'Your class will be submitted for admin approval. The admin will set the pricing.'}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!title || !teacherSubjectId || isPending}
              >
                {isPending ? 'Saving...' : editingClass ? 'Update Class' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{cls.title}</CardTitle>
                      {cls.subjects && (
                        <span className="text-xs font-medium" style={{ color: cls.subjects.color }}>
                          {cls.subjects.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusBadge(cls)}
                      {cls.approval_status === 'APPROVED' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(cls)}>
                              <Edit className="w-4 h-4 mr-2" />Edit Class
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/teacher/classes/${cls.id}/content`}>
                                <Calendar className="w-4 h-4 mr-2" />Manage Content
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cls.description || 'No description'}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Grade {cls.grade_min}–{cls.grade_max}</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{enrollmentCounts[cls.id] || 0}{cls.max_students ? ` / ${cls.max_students}` : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {cls.monthly_fee_amount > 0 && (
                      <span className="font-medium text-foreground">Rs. {cls.monthly_fee_amount}/mo</span>
                    )}
                    {cls.is_private && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="w-3 h-3" />
                        {cls.private_code}
                      </Badge>
                    )}
                  </div>

                  {cls.profit_share_percent != null && cls.profit_share_percent > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Profit Share: {cls.profit_share_percent}%
                    </p>
                  )}

                  {cls.approval_status === 'APPROVED' && (
                    <Link to={`/teacher/classes/${cls.id}/content`}>
                      <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                        <Calendar className="w-3 h-3" />
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
