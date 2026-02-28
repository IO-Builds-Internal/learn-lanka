import { useState } from 'react';
import { Plus, Trash2, Loader2, Video, FileText, ExternalLink, Users, BookOpen, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import UserAccessSelector from './UserAccessSelector';

interface Attachment {
  id: string;
  paper_id: string;
  attachment_type: string;
  title: string | null;
  url: string;
  sort_order: number;
  created_at: string;
  access_type: string;
  class_id: string | null;
}

interface PaperAttachmentsManagerProps {
  paperId: string;
  paperTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PaperAttachmentsManager = ({ paperId, paperTitle, open, onOpenChange }: PaperAttachmentsManagerProps) => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [manageUsersAttachment, setManageUsersAttachment] = useState<Attachment | null>(null);
  
  // Form state
  const [attachmentType, setAttachmentType] = useState<string>('VIDEO');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [accessType, setAccessType] = useState<string>('free');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['paper-attachments', paperId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('paper_attachments')
        .select('*')
        .eq('paper_id', paperId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Attachment[];
    },
    enabled: open,
  });

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Add attachment mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = attachments.length > 0 
        ? Math.max(...attachments.map(a => a.sort_order)) 
        : 0;
      
      const { data, error } = await (supabase as any)
        .from('paper_attachments')
        .insert({
          paper_id: paperId,
          attachment_type: attachmentType,
          title: title || null,
          url,
          sort_order: maxOrder + 1,
          access_type: accessType,
          class_id: accessType === 'class' ? selectedClassId : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Attachment;
    },
    onSuccess: (data) => {
      toast.success('Attachment added!');
      queryClient.invalidateQueries({ queryKey: ['paper-attachments', paperId] });
      // If access type is 'users', open user selector
      if (accessType === 'users') {
        setManageUsersAttachment(data);
      }
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add attachment');
    },
  });

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('paper_attachments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attachment deleted!');
      queryClient.invalidateQueries({ queryKey: ['paper-attachments', paperId] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete attachment');
    },
  });

  const resetForm = () => {
    setIsAdding(false);
    setAttachmentType('VIDEO');
    setTitle('');
    setUrl('');
    setAccessType('free');
    setSelectedClassId('');
  };

  const getAccessBadge = (attachment: Attachment) => {
    switch (attachment.access_type) {
      case 'free':
        return <Badge variant="secondary" className="gap-1"><Globe className="w-3 h-3" /> Free</Badge>;
      case 'class':
        const className = classes.find(c => c.id === attachment.class_id)?.title;
        return <Badge variant="outline" className="gap-1"><BookOpen className="w-3 h-3" /> {className || 'Class'}</Badge>;
      case 'users':
        return <Badge className="gap-1"><Users className="w-3 h-3" /> Selected Users</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Review Materials</DialogTitle>
            <DialogDescription>
              Add review videos and PDFs for: {paperTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Existing Attachments */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No review materials added yet
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {attachment.attachment_type === 'VIDEO' ? (
                        <Video className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {attachment.title || (attachment.attachment_type === 'VIDEO' ? 'Review Video' : 'Review PDF')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getAccessBadge(attachment)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {attachment.access_type === 'users' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setManageUsersAttachment(attachment)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => window.open(attachment.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(attachment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Attachment Form */}
            {isAdding ? (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={attachmentType} onValueChange={setAttachmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIDEO">
                          <span className="flex items-center gap-2">
                            <Video className="w-4 h-4" /> Review Video
                          </span>
                        </SelectItem>
                        <SelectItem value="PDF">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> PDF Document
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input 
                      placeholder={attachmentType === 'VIDEO' ? 'e.g., Answer Explanation' : 'e.g., Marking Scheme'}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    {attachmentType === 'VIDEO' ? 'YouTube URL' : 'PDF URL'} *
                  </Label>
                  <Input 
                    placeholder={attachmentType === 'VIDEO' 
                      ? 'https://youtube.com/watch?v=...' 
                      : 'https://...pdf'
                    }
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  {attachmentType === 'VIDEO' && (
                    <p className="text-xs text-muted-foreground">
                      Paste a YouTube video URL (download/share disabled)
                    </p>
                  )}
                </div>

                {/* Access Control */}
                <div className="space-y-2">
                  <Label>Access Control *</Label>
                  <Select value={accessType} onValueChange={setAccessType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4" /> Free (Everyone)
                        </span>
                      </SelectItem>
                      <SelectItem value="class">
                        <span className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" /> Class Enrollees Only
                        </span>
                      </SelectItem>
                      <SelectItem value="users">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4" /> Selected Users Only
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {accessType === 'class' && (
                  <div className="space-y-2">
                    <Label>Select Class *</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {accessType === 'users' && (
                  <p className="text-xs text-muted-foreground">
                    After adding, you'll be able to select specific users who can access this material.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => addMutation.mutate()}
                    disabled={!url || (accessType === 'class' && !selectedClassId) || addMutation.isPending}
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Review Material
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Access Manager Dialog */}
      {manageUsersAttachment && (
        <UserAccessSelector
          attachmentId={manageUsersAttachment.id}
          attachmentTitle={manageUsersAttachment.title || 'Review Material'}
          open={!!manageUsersAttachment}
          onOpenChange={(open) => !open && setManageUsersAttachment(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment?
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
    </>
  );
};

export default PaperAttachmentsManager;
