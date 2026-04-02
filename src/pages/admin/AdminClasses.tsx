import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  BookOpen, 
  Users,
  Lock,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Upload,
  Image as ImageIcon,
  Calendar
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ClassDetailDialog from '@/components/admin/ClassDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_CLASS_IMAGE = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';

interface ClassData {
  id: string;
  title: string;
  description: string | null;
  grade_min: number;
  grade_max: number;
  monthly_fee_amount: number;
  is_private: boolean;
  private_code: string | null;
  max_students: number | null;
  image_url: string | null;
  created_at: string;
  profit_share_percent: number | null;
}

const AdminClasses = () => {
  const queryClient = useQueryClient();
  const { isTeacher, profile } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeMin, setGradeMin] = useState('');
  const [gradeMax, setGradeMax] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxStudents, setMaxStudents] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [profitSharePercent, setProfitSharePercent] = useState('');
  const [classStatus, setClassStatus] = useState('ACTIVE');

  // Load form data when editing
  const openEditDialog = (cls: ClassData) => {
    setEditingClass(cls);
    setTitle(cls.title);
    setDescription(cls.description || '');
    setGradeMin(cls.grade_min.toString());
    setGradeMax(cls.grade_max.toString());
    setMonthlyFee(cls.monthly_fee_amount.toString());
    setIsPrivate(cls.is_private);
    setMaxStudents(cls.max_students?.toString() || '');
    setImageUrl(cls.image_url || '');
    setProfitSharePercent(cls.profit_share_percent?.toString() || '0');
    setClassStatus((cls as any).status || 'ACTIVE');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClass(null);
    resetForm();
  };

  // Fetch classes from database
  // Fetch subjects for filter
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, slug, color').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ClassData[];
    },
  });

  // Fetch enrollment counts
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const cls of classes) {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'ACTIVE');
        counts[cls.id] = count || 0;
      }
      return counts;
    },
    enabled: classes.length > 0,
  });

  // Generate private code
  const generatePrivateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create class mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('classes')
        .insert({
          title,
          description: description || null,
          grade_min: parseInt(gradeMin),
          grade_max: parseInt(gradeMax),
          monthly_fee_amount: isPrivate ? 0 : parseInt(monthlyFee),
          is_private: isPrivate,
          private_code: isPrivate ? generatePrivateCode() : null,
          max_students: isPrivate && maxStudents ? parseInt(maxStudents) : null,
          image_url: imageUrl || null,
          profit_share_percent: profitSharePercent ? parseInt(profitSharePercent) : 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create class');
    },
  });

  // Update class mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingClass) return;
      const { error } = await supabase
        .from('classes')
        .update({
          title,
          description: description || null,
          grade_min: parseInt(gradeMin),
          grade_max: parseInt(gradeMax),
          monthly_fee_amount: isPrivate ? 0 : parseInt(monthlyFee),
          is_private: isPrivate,
          private_code: isPrivate ? (editingClass.private_code || generatePrivateCode()) : null,
          max_students: isPrivate && maxStudents ? parseInt(maxStudents) : null,
          image_url: imageUrl || null,
          profit_share_percent: profitSharePercent ? parseInt(profitSharePercent) : 0,
        })
        .eq('id', editingClass.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update class');
    },
  });

  // Delete class mutation
  const deleteMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setDeleteClassId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete class');
    },
  });

  const handleSubmit = () => {
    if (editingClass) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGradeMin('');
    setGradeMax('');
    setMonthlyFee('');
    setIsPrivate(false);
    setMaxStudents('');
    setImageUrl('');
    setProfitSharePercent('');
    setClassStatus('ACTIVE');
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || (cls as any).subject_id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <AdminPageHeader
        title="Classes"
        description="Manage all classes across subjects"
        breadcrumbs={[{ label: 'Academics' }, { label: 'Classes' }]}
        actions={
          <Button onClick={() => { setEditingClass(null); resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        }
      />
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (open) { setEditingClass(null); resetForm(); } else { closeDialog(); }
        setIsDialogOpen(open);
      }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Update class details' : 'Add a new class to your platform'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Class Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., A/L ICT 2026 Batch" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Class description..." 
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Cover Image URL (optional)
                    </div>
                  </Label>
                  <Input 
                    id="imageUrl" 
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for default image
                  </p>
                  {imageUrl && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted mt-2">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_CLASS_IMAGE;
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradeMin">Grade Range (Min)</Label>
                    <Select value={gradeMin} onValueChange={setGradeMin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeMax">Grade Range (Max)</Label>
                    <Select value={gradeMax} onValueChange={setGradeMax}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Monthly fee only for public classes */}
                {!isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="fee">Monthly Fee (Rs.)</Label>
                    <Input 
                      id="fee" 
                      type="number" 
                      placeholder="3500"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Private Class
                    </Label>
                    <p className="text-sm text-muted-foreground">Require invite code to enroll</p>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>

                {/* Private class settings */}
                {isPrivate && (
                  <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor="maxStudents">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Max Students (optional)
                        </div>
                      </Label>
                      <Input 
                        id="maxStudents" 
                        type="number" 
                        placeholder="Leave empty for unlimited"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        An invite code will be auto-generated
                      </p>
                    </div>
                  </div>
                )}

                {/* Profit Share */}
                <div className="space-y-2">
                  <Label htmlFor="profitShare">Teacher Profit Share (%)</Label>
                  <Input 
                    id="profitShare" 
                    type="number" 
                    placeholder="e.g. 70"
                    min="0"
                    max="100"
                    value={profitSharePercent}
                    onChange={(e) => setProfitSharePercent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of class revenue shared with the teacher
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={(editingClass ? updateMutation.isPending : createMutation.isPending) || !title || !gradeMin || !gradeMax || (!isPrivate && !monthlyFee)}
                >
                  {editingClass 
                    ? (updateMutation.isPending ? 'Updating...' : 'Update Class')
                    : (createMutation.isPending ? 'Creating...' : 'Create Class')
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Search & Subject Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classes Grid */}
        {filteredClasses.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No classes found</h3>
              <p className="text-sm text-muted-foreground">Create your first class to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls) => (
              <Card key={cls.id} className="card-elevated overflow-hidden">
                {/* Class Image */}
                <div className="aspect-video bg-muted relative">
                  <img 
                    src={cls.image_url || DEFAULT_CLASS_IMAGE} 
                    alt={cls.title}
                    className="w-full h-full object-cover"
                  />
                  {cls.is_private && (
                    <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cls.title}</CardTitle>
                        <CardDescription>
                          Grade {cls.grade_min === cls.grade_max ? cls.grade_min : `${cls.grade_min}-${cls.grade_max}`}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedClass(cls)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Class
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/classes/${cls.id}/content`}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Manage Content
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteClassId(cls.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {cls.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      Rs. {cls.monthly_fee_amount.toLocaleString()}/mo
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {enrollmentCounts[cls.id] || 0}
                        {cls.max_students && ` / ${cls.max_students}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <ClassDetailDialog
        classData={selectedClass}
        enrollmentCount={selectedClass ? enrollmentCounts[selectedClass.id] || 0 : 0}
        open={!!selectedClass}
        onOpenChange={(open) => !open && setSelectedClass(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClassId} onOpenChange={() => setDeleteClassId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this class? This will also remove all enrollments and related data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteClassId && deleteMutation.mutate(deleteClassId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminClasses;
