import { useState } from 'react';
import { 
  MessageSquare, 
  Edit, 
  Save, 
  X, 
  Loader2,
  ToggleLeft,
  ToggleRight,
  Info,
  Variable,
  Send,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { invokeFunction } from '@/lib/functions';

interface SmsTemplate {
  id: string;
  template_key: string;
  template_name: string;
  template_body: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

const SmsTemplatesManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('template_name');
      if (error) throw error;
      return (data as unknown) as SmsTemplate[];
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, template_body }: { id: string; template_body: string }) => {
      const { error } = await supabase
        .from('sms_templates')
        .update({ 
          template_body,
          updated_by: user?.id 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template updated!');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sms_templates')
        .update({ is_active, updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template status updated!');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  const openEditDialog = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setEditedBody(template.template_body);
  };

  const openPreviewDialog = (template: SmsTemplate) => {
    setPreviewTemplate(template);
    // Initialize variables with sample data
    const sampleData: Record<string, string> = {
      amount: '2,500',
      item: 'January 2026 Class Fee',
      student_name: 'Kasun Perera',
      reason: 'Invalid slip image',
      paper_title: 'Data Communication Practice Paper',
      grade: '11',
      link: 'https://app.example.com',
      class_name: 'A/L ICT Theory 2026',
      month: 'February 2026',
      date: 'Mon, Feb 10',
      time: '9:00 AM - 10:30 AM',
      old_date: 'Mon, Feb 10',
      new_date: 'Wed, Feb 12',
      new_time: '2:00 PM - 3:30 PM',
      order_id: 'ORD-1234',
      tracking_info: 'Delivered to Colombo hub',
    };
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = sampleData[v] || `[${v}]`;
    });
    setPreviewVariables(vars);
    setTestPhone('');
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    updateMutation.mutate({ id: editingTemplate.id, template_body: editedBody });
  };

  const insertVariable = (variable: string) => {
    setEditedBody(prev => prev + `{${variable}}`);
  };

  // Replace variables in template body for preview
  const getPreviewMessage = () => {
    if (!previewTemplate) return '';
    let message = previewTemplate.template_body;
    for (const [key, value] of Object.entries(previewVariables)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return message;
  };

  const handleSendTest = async () => {
    if (!previewTemplate || !testPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await invokeFunction('send-bulk-sms', {
        body: {
          recipients: [testPhone],
          message: getPreviewMessage(),
        },
      });

      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error);

      toast.success('Test SMS sent!');
    } catch (error: any) {
      console.error('Test SMS error:', error);
      toast.error(error.message || 'Failed to send test SMS');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Templates
          </CardTitle>
          <CardDescription>
            Customize SMS notification messages. Use {'{variable}'} syntax for dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((template) => (
            <div 
              key={template.id} 
              className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.template_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {template.template_key}
                    </Badge>
                    {!template.is_active && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                  )}
                  <p className="text-sm bg-muted p-2 rounded font-mono">
                    {template.template_body}
                  </p>
                  {template.variables.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Variables:</span>
                      {template.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs font-mono">
                          {'{' + v + '}'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openPreviewDialog(template)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview & Test</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className={template.is_active ? 'text-green-600' : 'text-muted-foreground'}
                        onClick={() => toggleMutation.mutate({ id: template.id, is_active: !template.is_active })}
                      >
                        {template.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {template.is_active ? 'Disable template' : 'Enable template'}
                    </TooltipContent>
                  </Tooltip>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No SMS templates found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit SMS Template</DialogTitle>
            <DialogDescription>
              {editingTemplate?.template_name} - {editingTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={4}
                className="font-mono text-sm"
                placeholder="Enter your SMS template..."
              />
              <p className="text-xs text-muted-foreground">
                Character count: {editedBody.length} (SMS limit: ~160 chars per segment)
              </p>
            </div>

            {editingTemplate?.variables && editingTemplate.variables.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Variable className="w-4 h-4" />
                  Available Variables
                </Label>
                <div className="flex flex-wrap gap-2">
                  {editingTemplate.variables.map((variable) => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs"
                      onClick={() => insertVariable(variable)}
                    >
                      {'{' + variable + '}'}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Click a variable to insert it at the end
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <p className="text-sm mt-1">{editedBody || 'No content'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending || !editedBody.trim()}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview & Test Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview & Test SMS</DialogTitle>
            <DialogDescription>
              {previewTemplate?.template_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Variable Inputs */}
            {previewTemplate?.variables && previewTemplate.variables.length > 0 && (
              <div className="space-y-3">
                <Label>Sample Variables</Label>
                <div className="grid gap-3">
                  {previewTemplate.variables.map((variable) => (
                    <div key={variable} className="flex items-center gap-2">
                      <Label className="w-32 text-xs font-mono text-muted-foreground">
                        {'{' + variable + '}'}
                      </Label>
                      <Input
                        value={previewVariables[variable] || ''}
                        onChange={(e) => setPreviewVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        className="flex-1"
                        placeholder={`Value for ${variable}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>Message Preview</Label>
              <div className="p-4 rounded-lg bg-muted border-2 border-dashed">
                <p className="text-sm whitespace-pre-wrap">{getPreviewMessage()}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {getPreviewMessage().length} characters
              </p>
            </div>

            {/* Test Send */}
            <div className="space-y-2">
              <Label>Send Test SMS</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Phone number (e.g., 0771234567)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testPhone.trim()}
                >
                  {isSendingTest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                This will send a real SMS to the entered number
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SmsTemplatesManager;
