import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

type SyllabusLesson = {
  id: string;
  title: string;
  grade: number | null;
  medium: string | null;
  subject: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
};

const GRADES: { value: number; label: string }[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ value: i + 6, label: `Grade ${i + 6}` })), // 6–11
  { value: 12, label: 'G.C.E A/L' }, // 12 & 13 combined
];
const MEDIUMS = ['sinhala', 'english', 'tamil'];

const defaultForm = {
  title: '',
  grade: '',
  medium: '',
  subject: '',
  sort_order: 0,
  parent_id: '',
};

const AdminSyllabus = () => {
  const { toast } = useToast();
  const { profile, isTeacher } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SyllabusLesson | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterMedium, setFilterMedium] = useState<string>('all');

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['syllabus_lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syllabus_lessons')
        .select('*')
        .order('grade', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as SyllabusLesson[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload: any = {
        title: values.title,
        grade: values.grade ? Number(values.grade) : null,
        medium: values.medium || null,
        subject: values.subject,
        sort_order: Number(values.sort_order),
        parent_id: values.parent_id || null,
        subject_id: teacherSubjectId || null,
      };
      if (values.id) {
        const { error } = await supabase
          .from('syllabus_lessons')
          .update(payload)
          .eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('syllabus_lessons').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus_lessons'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
      toast({ title: editing ? 'Lesson updated' : 'Lesson added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('syllabus_lessons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus_lessons'] });
      toast({ title: 'Lesson deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openAdd = (parentId?: string) => {
    setEditing(null);
    setForm({ ...defaultForm, parent_id: parentId || '' });
    setDialogOpen(true);
  };

  const openEdit = (lesson: SyllabusLesson) => {
    setEditing(lesson);
    setForm({
      title: lesson.title,
      grade: lesson.grade?.toString() || '',
      medium: lesson.medium || '',
      subject: lesson.subject,
      sort_order: lesson.sort_order,
      parent_id: lesson.parent_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...form, id: editing?.id });
  };

  // Filter top-level lessons
  const topLevel = lessons.filter(l => {
    if (l.parent_id) return false;
    if (filterGrade !== 'all' && l.grade?.toString() !== filterGrade) return false;
    if (filterMedium !== 'all' && l.medium !== filterMedium) return false;
    return true;
  });

  const getSubtopics = (parentId: string) =>
    lessons.filter(l => l.parent_id === parentId);

  const parentOptions = lessons.filter(l => !l.parent_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Syllabus</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage lessons and subtopics for the question bank
            </p>
          </div>
          <Button onClick={() => openAdd()}>
            <Plus className="w-4 h-4 mr-2" /> Add Lesson
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADES.map(g => (
                <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMedium} onValueChange={setFilterMedium}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Mediums" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mediums</SelectItem>
              {MEDIUMS.map(m => (
                <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : topLevel.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No lessons yet. Add your first lesson.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {topLevel.map(lesson => {
              const subtopics = getSubtopics(lesson.id);
              return (
                <Card key={lesson.id}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{lesson.title}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {lesson.grade && (
                            <Badge variant="secondary" className="text-xs">
                              {lesson.grade >= 12 ? 'G.C.E A/L' : `Grade ${lesson.grade}`}
                            </Badge>
                          )}
                          {lesson.medium && (
                            <Badge variant="outline" className="text-xs capitalize">{lesson.medium}</Badge>
                          )}
                          {subtopics.length > 0 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {subtopics.length} subtopic{subtopics.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openAdd(lesson.id)} title="Add subtopic">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(lesson)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete "{lesson.title}" and all its subtopics. Questions linked to it will have their lesson unset.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(lesson.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {subtopics.length > 0 && (
                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="ml-4 space-y-1.5 border-l pl-3">
                        {subtopics.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-muted/50">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate">{sub.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(sub)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Subtopic?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will delete "{sub.title}". Questions linked to it will have their lesson unset.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Introduction to Databases"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={form.grade || '__none__'} onValueChange={v => setForm(f => ({ ...f, grade: v === '__none__' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any grade</SelectItem>
                    {GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Medium</Label>
                <Select value={form.medium || '__none__'} onValueChange={v => setForm(f => ({ ...f, medium: v === '__none__' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any medium</SelectItem>
                    {MEDIUMS.map(m => (
                      <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Lesson (optional — makes this a subtopic)</Label>
              <Select value={form.parent_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level lesson)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {parentOptions
                    .filter(l => l.id !== editing?.id)
                    .map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSyllabus;
