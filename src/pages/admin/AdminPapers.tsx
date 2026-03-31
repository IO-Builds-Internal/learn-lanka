import { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  MoreVertical, 
  Edit,
  Trash2,
  Loader2,
  Download,
  Lock,
  Unlock,
  Upload,
  Video,
  Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import PaperAttachmentsManager from '@/components/admin/PaperAttachmentsManager';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Paper {
  id: string;
  title: string;
  description: string | null;
  paper_type: string;
  grade: number | null;
  year: number | null;
  term: number | null;
  school_or_zone: string | null;
  medium: string | null;
  subject: string | null;
  pdf_url: string;
  is_free: boolean;
  download_count: number;
  created_at: string;
}

const AdminPapers = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentsPaperId, setAttachmentsPaperId] = useState<string | null>(null);
  const [attachmentsPaperTitle, setAttachmentsPaperTitle] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [paperType, setPaperType] = useState<string>('PAST_PAPER');
  const [grade, setGrade] = useState('');
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [schoolOrZone, setSchoolOrZone] = useState('');
  const [medium, setMedium] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Fetch papers
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['admin-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Paper[];
    },
  });

  // Create paper mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!pdfFile && !editingPaper) throw new Error('Please upload a PDF file');

      setIsUploading(true);
      
      let pdfUrl = editingPaper?.pdf_url || '';
      
      // Upload new PDF if provided
      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('papers')
          .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('papers')
          .getPublicUrl(fileName);
        
        pdfUrl = urlData.publicUrl;
      }

      if (editingPaper) {
        // Update existing paper
        const { error } = await supabase
          .from('papers')
          .update({
            title,
            paper_type: paperType,
            grade: grade ? parseInt(grade) : null,
            year: year ? parseInt(year) : null,
            term: term ? parseInt(term) : null,
            school_or_zone: schoolOrZone || null,
            medium: medium || null,
            pdf_url: pdfUrl,
            is_free: isFree,
          })
          .eq('id', editingPaper.id);
        
        if (error) throw error;
      } else {
        // Create new paper
        const { error } = await supabase
          .from('papers')
          .insert({
            title,
            paper_type: paperType,
            grade: grade ? parseInt(grade) : null,
            year: year ? parseInt(year) : null,
            term: term ? parseInt(term) : null,
            school_or_zone: schoolOrZone || null,
            medium: medium || null,
            pdf_url: pdfUrl,
            is_free: isFree,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPaper ? 'Paper updated!' : 'Paper added!');
      queryClient.invalidateQueries({ queryKey: ['admin-papers'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save paper');
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Toggle free status
  const toggleFreeMutation = useMutation({
    mutationFn: async ({ id, is_free }: { id: string; is_free: boolean }) => {
      const { error } = await supabase
        .from('papers')
        .update({ is_free })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paper updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-papers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update paper');
    },
  });

  // Delete paper mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paper deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-papers'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete paper');
    },
  });

  const resetForm = () => {
    setTitle('');
    setPaperType('PAST_PAPER');
    setGrade('');
    setYear('');
    setTerm('');
    setSchoolOrZone('');
    setMedium('');
    setIsFree(false);
    setPdfFile(null);
    setEditingPaper(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditDialog = (paper: Paper) => {
    setEditingPaper(paper);
    setTitle(paper.title);
    setPaperType(paper.paper_type);
    setGrade(paper.grade?.toString() || '');
    setYear(paper.year?.toString() || '');
    setTerm(paper.term?.toString() || '');
    setSchoolOrZone(paper.school_or_zone || '');
    setMedium(paper.medium || '');
    setIsFree(paper.is_free);
    setPdfFile(null);
    setIsDialogOpen(true);
  };

  const getPaperTypeLabel = (type: string) => {
    switch (type) {
      case 'PAST_PAPER': return 'Past Paper';
      case 'SCHOOL_EXAM': return 'School Exam';
      case 'MODEL_PAPER': return 'Model Paper';
      default: return 'Other';
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Downloadable Papers</h1>
            <p className="text-muted-foreground">Past papers and exam resources for download</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Paper
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPaper ? 'Edit Paper' : 'Add Paper'}</DialogTitle>
                <DialogDescription>
                  {editingPaper ? 'Update paper details' : 'Upload a past paper or exam for students to download'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Paper Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., A/L 2023 Past Paper" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paper Type</Label>
                  <Select value={paperType} onValueChange={(val) => {
                    setPaperType(val);
                    if (val === 'PAST_PAPER') {
                      setGrade('');
                      setTerm('');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAST_PAPER">Past Paper</SelectItem>
                      <SelectItem value="SCHOOL_EXAM">School Exam</SelectItem>
                      <SelectItem value="MODEL_PAPER">Model Paper</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Only show Grade, Term, School/Zone, Medium for School Exam */}
                {paperType === 'SCHOOL_EXAM' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Grade *</Label>
                        <Select value={grade} onValueChange={setGrade}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {[6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                              <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Term *</Label>
                        <Select value={term} onValueChange={setTerm}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Term 1</SelectItem>
                            <SelectItem value="2">Term 2</SelectItem>
                            <SelectItem value="3">Term 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>School / Zone</Label>
                        <Input 
                          placeholder="e.g., Royal College or Colombo Zone" 
                          value={schoolOrZone}
                          onChange={(e) => setSchoolOrZone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Medium *</Label>
                        <Select value={medium} onValueChange={setMedium}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select medium" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SINHALA">Sinhala Medium</SelectItem>
                            <SelectItem value="ENGLISH">English Medium</SelectItem>
                            <SelectItem value="TAMIL">Tamil Medium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Year (optional)</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PDF File {!editingPaper && '*'}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                  </div>
                  {pdfFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {pdfFile.name}
                    </p>
                  )}
                  {editingPaper && !pdfFile && (
                    <p className="text-sm text-muted-foreground">
                      Current file will be kept if no new file is selected
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {isFree ? <Unlock className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4" />}
                      Free Download
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isFree ? 'Anyone can download' : 'Only paid users can download'}
                    </p>
                  </div>
                  <Switch checked={isFree} onCheckedChange={setIsFree} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || isUploading || !title || (!pdfFile && !editingPaper) || (paperType === 'SCHOOL_EXAM' && (!grade || !term || !medium))}
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {editingPaper ? 'Updating...' : 'Uploading...'}</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> {editingPaper ? 'Update Paper' : 'Add Paper'}</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Papers Table */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Term/Year</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{paper.title}</p>
                          {paper.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{paper.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPaperTypeLabel(paper.paper_type)}</Badge>
                    </TableCell>
                    <TableCell>{paper.grade ? `Grade ${paper.grade}` : '-'}</TableCell>
                    <TableCell>
                      {paper.paper_type === 'SCHOOL_EXAM' && paper.term ? `Term ${paper.term}` : (paper.year || '-')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3 text-muted-foreground" />
                        {paper.download_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={paper.is_free ? 'text-success' : 'text-warning'}
                        onClick={() => toggleFreeMutation.mutate({ id: paper.id, is_free: !paper.is_free })}
                      >
                        {paper.is_free ? (
                          <><Unlock className="w-4 h-4 mr-1" /> Free</>
                        ) : (
                          <><Lock className="w-4 h-4 mr-1" /> Paid Only</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(paper.pdf_url, '_blank')}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setAttachmentsPaperId(paper.id);
                            setAttachmentsPaperTitle(paper.title);
                          }}>
                            <Video className="w-4 h-4 mr-2" />
                            Review Materials
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(paper)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
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

            {papers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No papers uploaded</h3>
                <p className="text-sm text-muted-foreground">Upload past papers or exam resources</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this paper? This action cannot be undone.
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

      {/* Paper Attachments Manager */}
      {attachmentsPaperId && (
        <PaperAttachmentsManager
          paperId={attachmentsPaperId}
          paperTitle={attachmentsPaperTitle}
          open={!!attachmentsPaperId}
          onOpenChange={(open) => {
            if (!open) {
              setAttachmentsPaperId(null);
              setAttachmentsPaperTitle('');
            }
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminPapers;
