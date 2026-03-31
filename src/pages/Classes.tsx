import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen, Users, Lock, ChevronRight, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import StudentLayout from '@/components/layouts/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const Classes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [privateCodeDialogOpen, setPrivateCodeDialogOpen] = useState(false);
  const [privateCode, setPrivateCode] = useState('');

  // Fetch enabled subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, slug').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch only PUBLIC classes (exclude private ones)
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['public-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Join private class by code
  const joinPrivateClassMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Please log in to join a class');

      // Find the class with this code
      const { data: classData, error: findError } = await supabase
        .from('classes')
        .select('*')
        .eq('private_code', code.toUpperCase().trim())
        .eq('is_private', true)
        .single();

      if (findError || !classData) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id', classData.id)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error('You are already enrolled in this class');
      }

      // Check max students limit
      if (classData.max_students) {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classData.id)
          .eq('status', 'ACTIVE');

        if (count && count >= classData.max_students) {
          throw new Error('This class is full');
        }
      }

      // Enroll the user
      const { error: enrollError } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          status: 'ACTIVE',
        });

      if (enrollError) throw enrollError;

      return classData;
    },
    onSuccess: (classData) => {
      toast.success(`Enrolled in ${classData.title}!`);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setPrivateCodeDialogOpen(false);
      setPrivateCode('');
      navigate(`/classes/${classData.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join class');
    },
  });

  const enrolledClassIds = enrollments.map(e => e.class_id);

  const filteredClasses = classes.filter((cls: any) => {
    const matchesSearch = cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesGrade = gradeFilter === 'all' || 
      (parseInt(gradeFilter) >= cls.grade_min && parseInt(gradeFilter) <= cls.grade_max);

    const matchesSubject = subjectFilter === 'all' || cls.subject_id === subjectFilter;
    
    return matchesSearch && matchesGrade && matchesSubject;
  });

  if (classesLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="section-spacing">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Classes</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Browse and enroll in ICT classes
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setPrivateCodeDialogOpen(true)}
            className="gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Join Private Class</span>
            <span className="sm:hidden">Join</span>
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-10">
              <Filter className="w-4 h-4 mr-2" />
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

        {/* Classes Grid */}
        {filteredClasses.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="font-medium text-foreground mb-2 text-sm sm:text-base">No classes found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                Try adjusting your search or use an invite code to join a private class
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls) => {
              const isEnrolled = enrolledClassIds.includes(cls.id);
              return (
                <Card key={cls.id} className="card-elevated hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-lg line-clamp-2">{cls.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2 text-xs sm:text-sm">
                      {cls.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end p-3 sm:p-4 pt-0 sm:pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Price Display - Prominent */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          Rs. {cls.monthly_fee_amount.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>

                      {/* Class Info */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          Grade {cls.grade_min === cls.grade_max ? cls.grade_min : `${cls.grade_min}-${cls.grade_max}`}
                        </Badge>
                        {isEnrolled && (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">
                            Enrolled
                          </Badge>
                        )}
                      </div>

                      {/* Action */}
                      <Link to={`/classes/${cls.id}`} className="block">
                        <Button 
                          variant={isEnrolled ? "outline" : "default"} 
                          className="w-full"
                          size="sm"
                        >
                          {isEnrolled ? 'View Class' : 'View Details'}
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Private Class Dialog */}
      <Dialog open={privateCodeDialogOpen} onOpenChange={setPrivateCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Join Private Class
            </DialogTitle>
            <DialogDescription>
              Enter the invite code to join a private class
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="privateCode">Invite Code</Label>
              <Input
                id="privateCode"
                placeholder="Enter 8-character code"
                value={privateCode}
                onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono text-lg tracking-wider text-center uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Ask your teacher for the invite code
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrivateCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => joinPrivateClassMutation.mutate(privateCode)}
              disabled={privateCode.length < 4 || joinPrivateClassMutation.isPending}
            >
              {joinPrivateClassMutation.isPending ? 'Joining...' : 'Join Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default Classes;
