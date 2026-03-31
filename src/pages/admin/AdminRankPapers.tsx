import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  MoreVertical, 
  Edit,
  Trash2,
  Eye,
  Loader2,
  Clock,
  Users,
  CheckCircle,
  PlayCircle,
  Youtube,
  ListOrdered,
  Calendar,
  Lock,
  Unlock,
  Search,
  Copy,
  CheckSquare,
  Square,
  XCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { invokeFunction } from '@/lib/functions';
import { useAuth } from '@/hooks/useAuth';

interface RankPaper {
  id: string;
  title: string;
  grade: number;
  medium: string | null;
  time_limit_minutes: number;
  has_mcq: boolean;
  has_short_essay: boolean;
  has_essay: boolean;
  publish_status: string;
  fee_amount: number | null;
  essay_pdf_url: string | null;
  review_video_url: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  class_id: string | null;
  created_at: string;
}

interface ClassOption {
  id: string;
  title: string;
}

const AdminRankPapers = () => {
  const { profile, isTeacher } = useAuth();
  const teacherSubjectId = (profile as any)?.subject_id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewDialog, setReviewDialog] = useState<RankPaper | null>(null);
  const [reviewVideoUrl, setReviewVideoUrl] = useState('');
  const [editingPaper, setEditingPaper] = useState<RankPaper | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('');
  const [medium, setMedium] = useState('sinhala');
  const [timeLimit, setTimeLimit] = useState('180');
  const [hasMcq, setHasMcq] = useState(true);
  const [hasShortEssay, setHasShortEssay] = useState(false);
  const [hasEssay, setHasEssay] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [lockAt, setLockAt] = useState('');
  const [classId, setClassId] = useState<string>('');

  // Fetch rank papers (teachers see only their subject)
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['admin-rank-papers', isTeacher ? teacherSubjectId : 'all'],
    queryFn: async () => {
      let query = supabase
        .from('rank_papers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (isTeacher && teacherSubjectId) {
        query = query.eq('subject_id', teacherSubjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RankPaper[];
    },
  });

  // Fetch classes for assignment dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-rank-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title')
        .order('title', { ascending: true });
      if (error) throw error;
      return data as ClassOption[];
    },
  });

  // Fetch attempt counts
  const { data: attemptCounts = {} } = useQuery({
    queryKey: ['rank-paper-attempts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const paper of papers) {
        const { count } = await supabase
          .from('rank_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('rank_paper_id', paper.id);
        counts[paper.id] = count || 0;
      }
      return counts;
    },
    enabled: papers.length > 0,
  });

  // Create/Update paper mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const paperData = {
        title,
        grade: parseInt(grade),
        medium: medium || 'sinhala',
        time_limit_minutes: parseInt(timeLimit),
        has_mcq: hasMcq,
        has_short_essay: hasShortEssay,
        has_essay: hasEssay,
        fee_amount: feeAmount ? parseInt(feeAmount) : null,
        unlock_at: unlockAt ? new Date(unlockAt).toISOString() : null,
        lock_at: lockAt ? new Date(lockAt).toISOString() : null,
        class_id: classId || null,
      };

      if (editingPaper) {
        const { error } = await supabase
          .from('rank_papers')
          .update(paperData)
          .eq('id', editingPaper.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rank_papers')
          .insert({ ...paperData, publish_status: 'DRAFT' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPaper ? 'Rank paper updated!' : 'Rank paper created!');
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
      setIsDialogOpen(false);
      setEditingPaper(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save paper');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paper }: { id: string; status: string; paper?: RankPaper }) => {
      const { error } = await supabase
        .from('rank_papers')
        .update({ publish_status: status })
        .eq('id', id);
      if (error) throw error;

      // If publishing, create notification and send SMS
      if (status === 'PUBLISHED' && paper) {
        // Create in-app notification
        await supabase.from('notifications').insert({
          title: '📝 New Rank Paper Available!',
          message: `${paper.title} is now available. Grade ${paper.grade}. Time: ${paper.time_limit_minutes} minutes.`,
          target_type: paper.class_id ? 'CLASS' : 'ALL',
          target_ref: paper.class_id || null,
        });

        // Send SMS notification
        try {
          await invokeFunction('send-sms-notification', {
            body: {
              type: 'rank_paper_published',
              classId: paper.class_id || undefined,
              data: {
                title: paper.title,
                grade: paper.grade,
                timeLimit: paper.time_limit_minutes,
              },
            },
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }
    },
    onSuccess: () => {
      toast.success('Status updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  // Update review video mutation
  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase
        .from('rank_papers')
        .update({ review_video_url: url || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review video updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
      setReviewDialog(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update review video');
    },
  });

  // Delete paper mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rank_papers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paper deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete paper');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('rank_papers')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} paper(s) deleted!`);
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete papers');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPapers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPapers.map(p => p.id)));
    }
  };

  // Duplicate paper mutation - copies paper, questions, options, and attachments
  const duplicateMutation = useMutation({
    mutationFn: async (paper: RankPaper) => {
      // Create new paper
      const { data: newPaper, error: paperError } = await supabase
        .from('rank_papers')
        .insert({
          title: `${paper.title} (Copy)`,
          grade: paper.grade,
          time_limit_minutes: paper.time_limit_minutes,
          has_mcq: paper.has_mcq,
          has_short_essay: paper.has_short_essay,
          has_essay: paper.has_essay,
          fee_amount: paper.fee_amount,
          class_id: paper.class_id,
          medium: paper.medium || 'sinhala',
          essay_pdf_url: paper.essay_pdf_url,
          publish_status: 'DRAFT',
        })
        .select()
        .single();
      if (paperError) throw paperError;

      // Copy MCQ questions and options
      const { data: questions } = await supabase
        .from('rank_mcq_questions')
        .select('*, rank_mcq_options(*)')
        .eq('rank_paper_id', paper.id)
        .order('q_no');

      if (questions && questions.length > 0) {
        for (const q of questions) {
          const { data: newQuestion, error: qError } = await supabase
            .from('rank_mcq_questions')
            .insert({
              rank_paper_id: newPaper.id,
              q_no: q.q_no,
              question_text: q.question_text,
              question_image_url: q.question_image_url,
            })
            .select()
            .single();
          if (qError) throw qError;

          // Copy options for this question
          if (q.rank_mcq_options && q.rank_mcq_options.length > 0) {
            const optionsToInsert = q.rank_mcq_options.map((opt: any) => ({
              question_id: newQuestion.id,
              option_no: opt.option_no,
              option_text: opt.option_text,
              option_image_url: opt.option_image_url,
              is_correct: opt.is_correct,
            }));
            const { error: optError } = await supabase
              .from('rank_mcq_options')
              .insert(optionsToInsert);
            if (optError) throw optError;
          }
        }
      }

      // Copy attachments
      const { data: attachments } = await supabase
        .from('rank_paper_attachments')
        .select('*')
        .eq('rank_paper_id', paper.id)
        .order('sort_order');

      if (attachments && attachments.length > 0) {
        const attachmentsToInsert = attachments.map((att) => ({
          rank_paper_id: newPaper.id,
          attachment_type: att.attachment_type,
          title: att.title,
          url: att.url,
          sort_order: att.sort_order,
        }));
        const { error: attError } = await supabase
          .from('rank_paper_attachments')
          .insert(attachmentsToInsert);
        if (attError) throw attError;
      }

      return newPaper;
    },
    onSuccess: () => {
      toast.success('Paper duplicated with all content!');
      queryClient.invalidateQueries({ queryKey: ['admin-rank-papers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate paper');
    },
  });

  const resetForm = () => {
    setTitle('');
    setGrade('');
    setMedium('sinhala');
    setTimeLimit('180');
    setHasMcq(true);
    setHasShortEssay(false);
    setHasEssay(false);
    setFeeAmount('');
    setUnlockAt('');
    setLockAt('');
    setClassId('');
    setEditingPaper(null);
  };

  // Helper to format datetime-local value
  const formatDateTimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  };

  const openEditDialog = (paper: RankPaper) => {
    setEditingPaper(paper);
    setTitle(paper.title);
    setGrade(paper.grade.toString());
    setMedium(paper.medium || 'sinhala');
    setTimeLimit(paper.time_limit_minutes.toString());
    setHasMcq(paper.has_mcq);
    setHasShortEssay(paper.has_short_essay);
    setHasEssay(paper.has_essay);
    setFeeAmount(paper.fee_amount?.toString() || '');
    setUnlockAt(formatDateTimeLocal(paper.unlock_at));
    setLockAt(formatDateTimeLocal(paper.lock_at));
    setClassId(paper.class_id || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge className="bg-success text-success-foreground">Published</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  // Filter papers
  const filteredPapers = papers.filter(paper => {
    if (searchQuery.trim() && !paper.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterGrade !== 'all' && paper.grade.toString() !== filterGrade) return false;
    if (filterStatus !== 'all' && paper.publish_status !== filterStatus) return false;
    return true;
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
        title="Rank Papers"
        description="Manage timed exams and quizzes"
        breadcrumbs={[{ label: 'Academics' }, { label: 'Rank Papers' }]}
        actions={
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Paper
          </Button>
        }
      />
      {/* Search + Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search papers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48" />
        </div>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[6,7,8,9,10,11,12,13].map(g => (<SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
            }
          }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPaper ? 'Edit Rank Paper' : 'Create Rank Paper'}</DialogTitle>
                <DialogDescription>
                  {editingPaper ? 'Update paper details' : 'Create a new timed exam or quiz'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Paper Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., A/L Physics Model Paper 2025" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={grade} onValueChange={setGrade}>
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
                    <Label htmlFor="timeLimit">Time Limit (mins)</Label>
                    <Input 
                      id="timeLimit" 
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Medium</Label>
                  <Select value={medium} onValueChange={setMedium}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sinhala">Sinhala</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Class Assignment */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assign to Class (optional)
                  </Label>
                  <Select value={classId || "none"} onValueChange={(val) => setClassId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No class - available to all" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No class (public)</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If assigned, only enrolled students can access this paper.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fee">Fee Amount (optional)</Label>
                  <Input 
                    id="fee" 
                    type="number"
                    placeholder="Free if empty"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                  />
                </div>

                {/* Unlock/Lock Time Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Access Time Window (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set when students can access this paper. Leave empty for no restrictions.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unlockAt" className="text-xs flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> Unlock At
                      </Label>
                      <Input 
                        id="unlockAt" 
                        type="datetime-local"
                        value={unlockAt}
                        onChange={(e) => setUnlockAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lockAt" className="text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Lock At
                      </Label>
                      <Input 
                        id="lockAt" 
                        type="datetime-local"
                        value={lockAt}
                        onChange={(e) => setLockAt(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Paper Sections</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">MCQ Section (Auto-marked)</span>
                      <Switch checked={hasMcq} onCheckedChange={setHasMcq} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Short Essay Section</span>
                      <Switch checked={hasShortEssay} onCheckedChange={setHasShortEssay} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Essay Section (Upload)</span>
                      <Switch checked={hasEssay} onCheckedChange={setHasEssay} />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !title || !grade}
                >
                  {saveMutation.isPending ? (editingPaper ? 'Saving...' : 'Creating...') : (editingPaper ? 'Save Changes' : 'Create Paper')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-muted/60 border-border">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Papers Table */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredPapers.length > 0 && selectedIds.size === filteredPapers.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Paper</TableHead>
                   <TableHead>Grade</TableHead>
                   <TableHead>Medium</TableHead>
                   <TableHead>Time</TableHead>
                   <TableHead>Sections</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper) => (
                  <TableRow
                    key={paper.id}
                    className={selectedIds.has(paper.id) ? 'bg-muted/40' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(paper.id)}
                        onCheckedChange={() => toggleSelect(paper.id)}
                        aria-label={`Select ${paper.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">{paper.title}</p>
                          {paper.review_video_url && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Youtube className="w-3 h-3" />
                              Review video added
                            </div>
                          )}
                          {(paper.unlock_at || paper.lock_at) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {paper.unlock_at && format(new Date(paper.unlock_at), 'MMM d, HH:mm')}
                              {paper.unlock_at && paper.lock_at && ' - '}
                              {paper.lock_at && format(new Date(paper.lock_at), 'MMM d, HH:mm')}
                            </div>
                          )}
                          {paper.class_id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              {classes.find(c => c.id === paper.class_id)?.title || 'Assigned class'}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>Grade {paper.grade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{paper.medium || 'Sinhala'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {paper.time_limit_minutes} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {paper.has_mcq && <Badge variant="outline" className="text-xs">MCQ</Badge>}
                        {paper.has_short_essay && <Badge variant="outline" className="text-xs">Short</Badge>}
                        {paper.has_essay && <Badge variant="outline" className="text-xs">Essay</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {paper.fee_amount ? `Rs. ${paper.fee_amount}` : 'Free'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {attemptCounts[paper.id] || 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(paper.publish_status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {paper.publish_status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: paper.id, status: 'PUBLISHED', paper })}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {paper.publish_status === 'PUBLISHED' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: paper.id, status: 'CLOSED' })}>
                              <Lock className="w-4 h-4 mr-2" />
                              Close Paper
                            </DropdownMenuItem>
                          )}
                          {paper.publish_status === 'CLOSED' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: paper.id, status: 'PUBLISHED', paper })}>
                              <Unlock className="w-4 h-4 mr-2" />
                              Reopen Paper
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/admin/rank-papers/${paper.id}/attempts`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Attempts & Marks
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/rank-papers/${paper.id}/questions`)}>
                            <ListOrdered className="w-4 h-4 mr-2" />
                            Manage Questions/Content
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setReviewDialog(paper);
                            setReviewVideoUrl(paper.review_video_url || '');
                          }}>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            {paper.review_video_url ? 'Edit Review Video' : 'Add Review Video'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(paper)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Paper
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(paper)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Paper
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteId(paper.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredPapers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  {searchQuery ? 'No papers found' : 'No rank papers'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Create your first exam paper'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Video Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Video</DialogTitle>
            <DialogDescription>
              Add a YouTube video link for paper review (visible after exam closes)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewUrl">YouTube URL</Label>
              <Input 
                id="reviewUrl" 
                placeholder="https://youtube.com/watch?v=..."
                value={reviewVideoUrl}
                onChange={(e) => setReviewVideoUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button onClick={() => reviewDialog && updateReviewMutation.mutate({ id: reviewDialog.id, url: reviewVideoUrl })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rank Paper</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the paper and all related attempts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Papers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected paper(s) and all their related attempts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                `Delete ${selectedIds.size} Papers`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminRankPapers;
