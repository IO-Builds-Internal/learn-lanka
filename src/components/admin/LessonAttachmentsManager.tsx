import { useState, useRef } from 'react';
import { Plus, Trash2, Youtube, FileText, Image as ImageIcon, Loader2, GripVertical, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  lesson_id: string;
  attachment_type: 'youtube' | 'pdf' | 'image';
  title: string | null;
  url: string;
  sort_order: number;
}

interface Props {
  lessonId: string;
}

const LessonAttachmentsManager = ({ lessonId }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [attachmentType, setAttachmentType] = useState<'youtube' | 'pdf' | 'image'>('youtube');
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['lesson-attachments', lessonId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('lesson_attachments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Attachment[];
    },
  });

  // Add attachment mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = attachments.length > 0 
        ? Math.max(...attachments.map(a => a.sort_order)) + 1 
        : 0;
      
      const { error } = await (supabase as any)
        .from('lesson_attachments')
        .insert({
          lesson_id: lessonId,
          attachment_type: attachmentType,
          title: attachmentTitle || null,
          url: attachmentUrl,
          sort_order: maxOrder,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-attachments', lessonId] });
      resetForm();
      toast.success('Attachment added!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add attachment');
    },
  });

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await (supabase as any)
        .from('lesson_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-attachments', lessonId] });
      toast.success('Attachment removed!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove attachment');
    },
  });

  // Upload file
  const uploadFile = async (file: File, bucket: string) => {
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    try {
      const url = await uploadFile(file, 'lesson-materials');
      setAttachmentUrl(url);
      setAttachmentType('pdf');
      if (!attachmentTitle) setAttachmentTitle(file.name.replace('.pdf', ''));
      toast.success('PDF uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload PDF');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const url = await uploadFile(file, 'lesson-materials');
      setAttachmentUrl(url);
      setAttachmentType('image');
      if (!attachmentTitle) setAttachmentTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    }
  };

  const resetForm = () => {
    setAttachmentType('youtube');
    setAttachmentTitle('');
    setAttachmentUrl('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Youtube className="w-4 h-4 text-destructive" />;
      case 'pdf': return <FileText className="w-4 h-4 text-primary" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-accent" />;
      default: return <LinkIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Label>Attachments</Label>
      
      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getIcon(attachment.attachment_type)}
                  <span className="text-sm font-medium truncate">
                    {attachment.title || attachment.url.split('/').pop()}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {attachment.attachment_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new attachment */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Title (optional)"
              value={attachmentTitle}
              onChange={(e) => setAttachmentTitle(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            {attachmentType === 'youtube' ? (
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="flex-1"
              />
            ) : attachmentType === 'pdf' ? (
              <>
                <Input
                  placeholder="PDF URL or upload"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  placeholder="Image URL or upload"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="flex-1"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                </Button>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={!attachmentUrl || addMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Attachment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonAttachmentsManager;
