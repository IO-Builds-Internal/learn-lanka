import { useState } from 'react';
import { Plus, Trash2, Youtube, FileText, Loader2, GripVertical, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  rank_paper_id: string;
  attachment_type: 'VIDEO' | 'ANSWER_PDF';
  title: string | null;
  url: string;
  sort_order: number;
  created_at: string;
}

interface Props {
  rankPaperId: string;
  paperTitle: string;
}

const RankPaperAttachmentsManager = ({ rankPaperId, paperTitle }: Props) => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'VIDEO' | 'ANSWER_PDF'>('VIDEO');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['rank-paper-attachments', rankPaperId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rank_paper_attachments')
        .select('*')
        .eq('rank_paper_id', rankPaperId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Attachment[];
    },
  });

  // Add attachment mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(0, ...attachments.map(a => a.sort_order));
      const { error } = await (supabase as any)
        .from('rank_paper_attachments')
        .insert({
          rank_paper_id: rankPaperId,
          attachment_type: attachmentType,
          title: title || null,
          url,
          sort_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attachment added!');
      queryClient.invalidateQueries({ queryKey: ['rank-paper-attachments', rankPaperId] });
      setIsAddOpen(false);
      setTitle('');
      setUrl('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add attachment');
    },
  });

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('rank_paper_attachments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attachment deleted');
      queryClient.invalidateQueries({ queryKey: ['rank-paper-attachments', rankPaperId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete');
    },
  });

  // Handle PDF upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${rankPaperId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('rank-paper-answers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('rank-paper-answers')
        .getPublicUrl(fileName);

      setUrl(urlData.publicUrl);
      toast.success('PDF uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const videos = attachments.filter(a => a.attachment_type === 'VIDEO');
  const pdfs = attachments.filter(a => a.attachment_type === 'ANSWER_PDF');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Review Materials</CardTitle>
          <CardDescription>Videos and answer sheets shown after results are published</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Review Material</DialogTitle>
              <DialogDescription>Add a video or answer PDF for {paperTitle}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-4 h-4" />
                        Video (YouTube)
                      </div>
                    </SelectItem>
                    <SelectItem value="ANSWER_PDF">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Answer PDF
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={attachmentType === 'VIDEO' ? 'Part 1 - MCQ Review' : 'Answer Sheet'}
                />
              </div>

              {attachmentType === 'VIDEO' ? (
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use unlisted YouTube videos for privacy
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>PDF File</Label>
                  {url ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm truncate flex-1">PDF uploaded</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUrl('')}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Or paste a URL:
                  </p>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={uploading}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => addMutation.mutate()}
                disabled={!url || addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No review materials added yet</p>
            <p className="text-sm">Add videos and answer PDFs that students can view after results are published</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Videos */}
            {videos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-destructive" />
                  Review Videos ({videos.length})
                </h4>
                <div className="space-y-2">
                  {videos.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {att.title || 'Review Video'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{att.url}</p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(att.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDFs */}
            {pdfs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Answer PDFs ({pdfs.length})
                </h4>
                <div className="space-y-2">
                  {pdfs.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {att.title || 'Answer Sheet'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{att.url}</p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(att.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RankPaperAttachmentsManager;
