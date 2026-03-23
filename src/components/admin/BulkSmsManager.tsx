import { useState } from 'react';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { invokeFunction } from '@/lib/functions';

interface SmsTemplate {
  id: string;
  template_key: string;
  template_name: string;
  template_body: string;
  is_active: boolean;
}

interface SmsLog {
  id: string;
  recipient_phone: string;
  message: string;
  status: string;
  sent_at: string;
  class_id: string | null;
  error_message: string | null;
}

const BulkSmsManager = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [targetGroup, setTargetGroup] = useState<string>('custom');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates-active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sms_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name');
      if (error) throw error;
      return (data || []) as SmsTemplate[];
    },
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-sms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user counts for targeting
  const { data: userStats } = useQuery({
    queryKey: ['user-stats-for-sms'],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('user_id')
        .eq('status', 'ACTIVE');
      
      const enrolledUsers = new Set(enrollments?.map(e => e.user_id) || []);
      
      return {
        total: totalUsers || 0,
        enrolled: enrolledUsers.size,
      };
    },
  });

  // Fetch SMS logs
  const { data: smsLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sms_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as SmsLog[];
    },
  });

  // Fetch class enrollment count
  const { data: classEnrollmentCount } = useQuery({
    queryKey: ['class-enrollment-count', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return 0;
      const { count } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', selectedClass)
        .eq('status', 'ACTIVE');
      return count || 0;
    },
    enabled: !!selectedClass,
  });

  // Fetch phone numbers based on target group
  const fetchRecipients = async (group: string, classId?: string): Promise<string[]> => {
    if (group === 'custom') return [];

    if (group === 'class' && classId) {
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('user_id')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE');
      
      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('phone')
          .in('id', userIds);
        return profiles?.map(p => p.phone).filter(Boolean) as string[] || [];
      }
      return [];
    }

    let query = supabase.from('profiles').select('phone');

    if (group === 'enrolled') {
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('user_id')
        .eq('status', 'ACTIVE');
      
      if (enrollments && enrollments.length > 0) {
        const userIds = [...new Set(enrollments.map(e => e.user_id))];
        query = supabase.from('profiles').select('phone').in('id', userIds);
      }
    }

    const { data } = await query;
    return data?.map(p => p.phone).filter(Boolean) as string[] || [];
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId && templateId !== 'none') {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setMessage(template.template_body);
      }
    }
  };

  const handleTargetGroupChange = async (group: string) => {
    setTargetGroup(group);
    setSelectedClass('');
    if (group !== 'custom' && group !== 'class') {
      const phones = await fetchRecipients(group);
      setRecipients(phones.join('\n'));
    } else if (group === 'custom') {
      setRecipients('');
    }
  };

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId);
    if (classId) {
      const phones = await fetchRecipients('class', classId);
      setRecipients(phones.join('\n'));
    }
  };

  const parseRecipients = (): string[] => {
    return recipients
      .split(/[\n,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0);
  };

  const handleSend = async () => {
    const recipientList = parseRecipients();
    
    if (recipientList.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      let schedule_time: string | undefined;
      if (isScheduled && scheduleDate && scheduleTime) {
        schedule_time = `${scheduleDate} ${scheduleTime}`;
      }

      const { data, error } = await invokeFunction('send-bulk-sms', {
        body: {
          recipients: recipientList,
          message: message,
          schedule_time,
          class_id: selectedClass || null,
          sent_by: user?.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(
        isScheduled 
          ? `SMS scheduled for ${recipientList.length} recipients` 
          : `SMS sent to ${recipientList.length} recipients`
      );

      // Refresh logs
      refetchLogs();

      // Clear form
      setRecipients('');
      setMessage('');
      setSelectedTemplate('');
      setIsScheduled(false);
      setScheduleDate('');
      setScheduleTime('');
      setTargetGroup('custom');
      setSelectedClass('');

    } catch (error: any) {
      console.error('SMS send error:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setIsSending(false);
    }
  };

  const recipientCount = parseRecipients().length;
  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Group logs by date for display
  const groupedLogs = smsLogs.reduce((acc, log) => {
    const date = format(new Date(log.sent_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, SmsLog[]>);

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5" />
            Bulk SMS
          </CardTitle>
          <CardDescription>
            Send SMS notifications to multiple recipients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Selection */}
          <div className="space-y-3">
            <Label>Recipients</Label>
            <Tabs value={targetGroup} onValueChange={handleTargetGroupChange}>
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="custom">Custom List</TabsTrigger>
                <TabsTrigger value="all">
                  All Users ({userStats?.total || 0})
                </TabsTrigger>
                <TabsTrigger value="enrolled">
                  Enrolled ({userStats?.enrolled || 0})
                </TabsTrigger>
                <TabsTrigger value="class">
                  <GraduationCap className="w-4 h-4 mr-1" />
                  By Class
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Class Selection */}
            {targetGroup === 'class' && (
              <div className="space-y-2">
                <Label>Select Class</Label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass && classEnrollmentCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {classEnrollmentCount} enrolled student{classEnrollmentCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="Enter phone numbers (one per line, or comma/semicolon separated)&#10;e.g., 0771234567&#10;0772345678"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                </span>
                {targetGroup !== 'custom' && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-loaded from {
                      targetGroup === 'all' ? 'all users' : 
                      targetGroup === 'enrolled' ? 'enrolled students' :
                      targetGroup === 'class' ? 'class students' : ''
                    }
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Use Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {charCount} characters
              </span>
              <span>
                {smsSegments} SMS segment{smsSegments !== 1 ? 's' : ''} per recipient
              </span>
            </div>
          </div>

          {/* Schedule Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Schedule for Later</Label>
                <p className="text-xs text-muted-foreground">Send at a specific date and time</p>
              </div>
              <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cost Estimate */}
          {recipientCount > 0 && (
            <div className="p-3 rounded-lg bg-muted flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estimated Cost</p>
                <p className="text-xs text-muted-foreground">
                  {recipientCount} × {smsSegments} segment{smsSegments !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-lg font-bold">
                {recipientCount * smsSegments} SMS
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button 
            className="w-full" 
            variant="hero"
            onClick={handleSend}
            disabled={isSending || recipientCount === 0 || !message.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : isScheduled ? (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule SMS
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {recipientCount} Recipient{recipientCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* SMS History */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <Card className="card-elevated">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <CardTitle className="text-lg">SMS History</CardTitle>
                </div>
                {showHistory ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription>
                {smsLogs.length} messages sent recently
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {smsLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No SMS messages sent yet
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedLogs).slice(0, 5).map(([date, logs]) => (
                    <div key={date}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.slice(0, 10).map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(log.sent_at), 'HH:mm')}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.recipient_phone}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="text-xs truncate">{log.message}</p>
                              </TableCell>
                              <TableCell>
                                {log.status === 'sent' ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Sent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default BulkSmsManager;
