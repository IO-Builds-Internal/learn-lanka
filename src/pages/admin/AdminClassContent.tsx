import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  Youtube,
  FileText,
  Upload as UploadIcon,
  X,
  ClipboardList,
  Send,
  Bell,
  CheckCircle,
  Circle,
  Users,
  Link2,
  Video,
  Wand2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layouts/AdminLayout';
import ClassPapersManager from '@/components/admin/ClassPapersManager';
import LessonAttachmentsManager from '@/components/admin/LessonAttachmentsManager';
import PrivateClassEnrollmentsManager from '@/components/admin/PrivateClassEnrollmentsManager';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { invokeFunction } from '@/lib/functions';

// Day-of-week options
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface TemplateRow {
  dayOfWeek: number;
  titlePrefix: string; // e.g. "Theory Session" → will become "Theory Session 1", "Theory Session 2"...
  startTime: string;
  endTime: string;
  isExtra: boolean;
}

const AdminClassContent = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Day dialog state
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<any>(null);
  const [dayTitle, setDayTitle] = useState('');
  const [dayDate, setDayDate] = useState('');
  const [dayStartTime, setDayStartTime] = useState('');
  const [dayEndTime, setDayEndTime] = useState('');
  const [dayIsExtra, setDayIsExtra] = useState(false);
  const [dayMeetingLink, setDayMeetingLink] = useState('');
  const [notifyMeetingLink, setNotifyMeetingLink] = useState(false);
  const [createZoomMeeting, setCreateZoomMeeting] = useState(false);
  const [creatingZoomMeeting, setCreatingZoomMeeting] = useState(false);
  
  // Template generator state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>([
    { dayOfWeek: 5, titlePrefix: 'Theory Session', startTime: '09:00', endTime: '11:30', isExtra: false },
  ]);
  
  // Lesson dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonDayId, setLessonDayId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonPdfUrl, setLessonPdfUrl] = useState('');
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  // Delete state
  const [deleteDay, setDeleteDay] = useState<any>(null);
  const [deleteLesson, setDeleteLesson] = useState<any>(null);

  // Fetch class details
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch or create class month
  const { data: classMonth } = useQuery({
    queryKey: ['class-month', id, selectedMonth],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('class_months')
        .select('*')
        .eq('class_id', id)
        .eq('year_month', selectedMonth)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch class days
  const { data: classDays = [] } = useQuery({
    queryKey: ['class-days', classMonth?.id],
    queryFn: async () => {
      if (!classMonth) return [];
      const { data, error } = await supabase
        .from('class_days')
        .select('*')
        .eq('class_month_id', classMonth.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!classMonth,
  });

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', classDays.map(d => d.id)],
    queryFn: async () => {
      if (classDays.length === 0) return [];
      const dayIds = classDays.map(d => d.id);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .in('class_day_id', dayIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: classDays.length > 0,
  });

  // Create class month mutation
  const createMonthMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No class ID');
      const { data, error } = await supabase
        .from('class_months')
        .insert({ class_id: id, year_month: selectedMonth })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-month', id, selectedMonth] });
      toast.success('Month created!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create month');
    },
  });

  // Template generator mutation - creates class days from a weekly pattern
  const generateFromTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!classMonth) throw new Error('No class month');
      
      // Get all dates in the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Build list of dates to create, grouped by titlePrefix for numbering
      const toInsert: any[] = [];
      const counters: Record<string, number> = {};
      
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay(); // 0=Sun, 6=Sat
        
        const matchingRows = templateRows.filter(r => r.dayOfWeek === dow);
        for (const row of matchingRows) {
          const prefix = row.titlePrefix.trim() || 'Class';
          counters[prefix] = (counters[prefix] || 0) + 1;
          const title = `${prefix} ${counters[prefix]}`;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          toInsert.push({
            class_month_id: classMonth.id,
            title,
            date: dateStr,
            start_time: row.startTime || null,
            end_time: row.endTime || null,
            is_extra: row.isExtra,
          });
        }
      }
      
      if (toInsert.length === 0) throw new Error('No matching dates found for the selected pattern');
      
      const { error } = await supabase.from('class_days').insert(toInsert as any);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['class-days'] });
      setTemplateDialogOpen(false);
      toast.success(`Generated ${count} class days!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate schedule');
    },
  });

  // Day mutations
  const saveDayMutation = useMutation({
    mutationFn: async () => {
      if (!classMonth) throw new Error('No class month');
      const originalDate = editingDay?.date;
      const isReschedule = editingDay && originalDate !== dayDate;
      
      if (editingDay) {
        const { error } = await supabase
          .from('class_days')
          .update({ 
            title: dayTitle, 
            date: dayDate, 
            start_time: dayStartTime || null,
            end_time: dayEndTime || null,
            is_extra: dayIsExtra,
            meeting_link: dayMeetingLink || null,
          } as any)
          .eq('id', editingDay.id);
        if (error) throw error;
        
        // Send reschedule notification if date changed
        if (isReschedule && classData) {
          await supabase.from('notifications').insert({
            title: '🔄 Class Rescheduled',
            message: `${classData.title} on ${new Date(originalDate).toLocaleDateString()} has been rescheduled to ${new Date(dayDate).toLocaleDateString()}.`,
            target_type: 'CLASS',
            target_ref: id,
          });
          
          // Send SMS notification
          try {
            await invokeFunction('send-sms-notification', {
              body: {
                type: 'schedule_rescheduled',
                classId: id,
                data: {
                  className: classData.title,
                  originalDate: new Date(originalDate).toLocaleDateString(),
                  newDate: new Date(dayDate).toLocaleDateString(),
                },
              },
            });
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
        }

        // Notify students about meeting link if requested
        if (notifyMeetingLink && dayMeetingLink && classData) {
          // Create in-app notification
          await supabase.from('notifications').insert({
            title: '🔗 Class Link Available',
            message: `Join link for ${classData.title} (${dayTitle}) on ${new Date(dayDate).toLocaleDateString()}: ${dayMeetingLink}`,
            target_type: 'CLASS',
            target_ref: id,
          });

          // Update meeting_link_notified_at
          await (supabase as any)
            .from('class_days')
            .update({ meeting_link_notified_at: new Date().toISOString() })
            .eq('id', editingDay.id);
          
          // Send SMS notification
          try {
            await invokeFunction('send-sms-notification', {
              body: {
                type: 'meeting_link',
                classId: id,
                data: {
                  className: classData.title,
                  dayTitle: dayTitle,
                  date: new Date(dayDate).toLocaleDateString(),
                  meetingLink: dayMeetingLink,
                },
              },
            });
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
        }
      } else {
        const { data: newDay, error } = await supabase
          .from('class_days')
          .insert({ 
            class_month_id: classMonth.id, 
            title: dayTitle, 
            date: dayDate, 
            start_time: dayStartTime || null,
            end_time: dayEndTime || null,
            is_extra: dayIsExtra,
            meeting_link: dayMeetingLink || null,
          } as any)
          .select()
          .single();
        if (error) throw error;

        // Notify students about meeting link if requested
        if (notifyMeetingLink && dayMeetingLink && classData && newDay) {
          await supabase.from('notifications').insert({
            title: '🔗 Class Link Available',
            message: `Join link for ${classData.title} (${dayTitle}) on ${new Date(dayDate).toLocaleDateString()}: ${dayMeetingLink}`,
            target_type: 'CLASS',
            target_ref: id,
          });

          await (supabase as any)
            .from('class_days')
            .update({ meeting_link_notified_at: new Date().toISOString() })
            .eq('id', newDay.id);
          
          try {
            await invokeFunction('send-sms-notification', {
              body: {
                type: 'meeting_link',
                classId: id,
                data: {
                  className: classData.title,
                  dayTitle: dayTitle,
                  date: new Date(dayDate).toLocaleDateString(),
                  meetingLink: dayMeetingLink,
                },
              },
            });
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-days'] });
      setDayDialogOpen(false);
      resetDayForm();
      toast.success(editingDay ? 'Day updated!' : 'Day added!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save day');
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await supabase.from('class_days').delete().eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-days'] });
      setDeleteDay(null);
      toast.success('Day deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete day');
    },
  });

  // Publish schedule mutation - notifies all enrolled students
  const publishScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!classData || !classMonth || classDays.length === 0) {
        throw new Error('No schedule to publish');
      }
      
      const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
        month: 'long', year: 'numeric' 
      });

      // Build schedule details with times
      const scheduleDetails = classDays
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => {
          const dateStr = new Date(day.date).toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric' 
          });
          const timeStr = day.start_time 
            ? ` at ${day.start_time.slice(0, 5)}${day.end_time ? ` - ${day.end_time.slice(0, 5)}` : ''}`
            : '';
          return `📅 ${dateStr}${timeStr}`;
        })
        .join('\n');
      
      // Create in-app notification
      await supabase.from('notifications').insert({
        title: `📅 ${classData.title} - ${monthName} Schedule`,
        message: `Class schedule for ${monthName} has been published!\n\n${scheduleDetails}\n\n${classDays.length} classes scheduled.`,
        target_type: 'CLASS',
        target_ref: id,
      });

      // Update class_month to mark as notified
      await supabase
        .from('class_months')
        .update({ schedule_notified_at: new Date().toISOString() })
        .eq('id', classMonth.id);
      
      // Send SMS notification
      try {
        await invokeFunction('send-sms-notification', {
          body: {
            type: 'schedule_published',
            classId: id,
            previousMonthOnly: true,
            previousMonth: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7),
            data: {
              className: classData.title,
              month: monthName,
              classCount: classDays.length,
            },
          },
        });
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-month', id, selectedMonth] });
      toast.success('Schedule published and students notified!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish schedule');
    },
  });

  // Mark class day as conducted
  const markConductedMutation = useMutation({
    mutationFn: async ({ dayId, isConducted }: { dayId: string; isConducted: boolean }) => {
      const { error } = await supabase
        .from('class_days')
        .update({ 
          is_conducted: isConducted,
          conducted_at: isConducted ? new Date().toISOString() : null,
        })
        .eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-days'] });
      toast.success(variables.isConducted ? 'Marked as conducted!' : 'Unmarked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update');
    },
  });

  // Upload PDF mutation
  const uploadPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingPdf(true);
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('lesson-materials')
          .upload(fileName, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('lesson-materials')
          .getPublicUrl(fileName);
        
        return publicUrl;
      } finally {
        setUploadingPdf(false);
      }
    },
    onSuccess: (url) => {
      setLessonPdfUrl(url);
      toast.success('PDF uploaded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload PDF');
    },
  });

  // Lesson mutations
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({ 
            title: lessonTitle, 
            description: lessonDescription,
            notes_text: lessonNotes || null,
            pdf_url: lessonPdfUrl || null,
            youtube_url: lessonYoutubeUrl || null,
          })
          .eq('id', editingLesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert({ 
            class_day_id: lessonDayId,
            title: lessonTitle, 
            description: lessonDescription,
            notes_text: lessonNotes || null,
            pdf_url: lessonPdfUrl || null,
            youtube_url: lessonYoutubeUrl || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setLessonDialogOpen(false);
      resetLessonForm();
      toast.success(editingLesson ? 'Lesson updated!' : 'Lesson added!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save lesson');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setDeleteLesson(null);
      toast.success('Lesson deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete lesson');
    },
  });

  const resetDayForm = () => {
    setEditingDay(null);
    setDayTitle('');
    setDayDate('');
    setDayStartTime('');
    setDayEndTime('');
    setDayIsExtra(false);
    setDayMeetingLink('');
    setNotifyMeetingLink(false);
    setCreateZoomMeeting(false);
    setCreatingZoomMeeting(false);
  };

  const resetLessonForm = () => {
    setEditingLesson(null);
    setLessonDayId('');
    setLessonTitle('');
    setLessonDescription('');
    setLessonNotes('');
    setLessonPdfUrl('');
    setLessonYoutubeUrl('');
  };

  const openEditDay = (day: any) => {
    setEditingDay(day);
    setDayTitle(day.title);
    setDayDate(day.date);
    setDayStartTime(day.start_time || '');
    setDayEndTime(day.end_time || '');
    setDayIsExtra(day.is_extra);
    setDayMeetingLink(day.meeting_link || '');
    setNotifyMeetingLink(false);
    setCreateZoomMeeting(false);
    setDayDialogOpen(true);
  };

  // Create Zoom meeting handler
  const handleCreateZoomMeeting = async (classDayId: string) => {
    if (!dayStartTime || !dayDate) {
      toast.error('Please set date and start time first');
      return;
    }
    
    setCreatingZoomMeeting(true);
    try {
      // Calculate meeting duration (default 60 if no end time)
      let duration = 60;
      if (dayEndTime) {
        const [startH, startM] = dayStartTime.split(':').map(Number);
        const [endH, endM] = dayEndTime.split(':').map(Number);
        duration = (endH * 60 + endM) - (startH * 60 + startM);
      }

      // Convert to ISO 8601 format for Zoom
      const startTime = `${dayDate}T${dayStartTime}:00`;

      const { data, error } = await invokeFunction('create-zoom-meeting', {
        body: {
          classDayId,
          topic: `${classData?.title} - ${dayTitle}`,
          startTime,
          duration,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setDayMeetingLink((data as any).joinUrl);
      
      // Show different success message based on license status
      if ((data as any)?.isLicensed) {
        toast.success('Zoom meeting created with unique student links!');
      } else {
        toast.success('Zoom meeting created (upgrade to Pro for unique links)');
      }
    } catch (error: any) {
      console.error('Zoom meeting creation error:', error);
      toast.error(error.message || 'Failed to create Zoom meeting');
    } finally {
      setCreatingZoomMeeting(false);
    }
  };

  const openAddLesson = (dayId: string) => {
    resetLessonForm();
    setLessonDayId(dayId);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setLessonDayId(lesson.class_day_id);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || '');
    setLessonNotes(lesson.notes_text || '');
    setLessonPdfUrl(lesson.pdf_url || '');
    setLessonYoutubeUrl(lesson.youtube_url || '');
    setLessonDialogOpen(true);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      uploadPdfMutation.mutate(file);
    }
  };

  const getLessonsForDay = (dayId: string) => lessons.filter(l => l.class_day_id === dayId);

  if (classLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!classData) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-4">Class not found</h2>
          <Link to="/admin/classes">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link to="/admin/classes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{classData.title}</h1>
              <p className="text-muted-foreground">Manage schedule and lessons</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </div>

        {/* Month Status */}
        {!classMonth ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No schedule for this month</h3>
              <p className="text-sm text-muted-foreground mb-4">Create a month to start adding class days</p>
              <Button onClick={() => createMonthMutation.mutate()} disabled={createMonthMutation.isPending}>
                {createMonthMutation.isPending ? 'Creating...' : 'Create Month'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList className="w-full">
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="lessons" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Lessons
              </TabsTrigger>
              <TabsTrigger value="papers" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Papers
              </TabsTrigger>
              {classData.is_private && (
                <TabsTrigger value="enrollments" className="gap-2">
                  <Users className="w-4 h-4" />
                  Enrollments
                </TabsTrigger>
              )}
            </TabsList>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold">Class Days</h2>
                <div className="flex items-center gap-2">
                  {classDays.length > 0 && (
                    <Button 
                      variant={classMonth?.schedule_notified_at ? "secondary" : "outline"}
                      onClick={() => publishScheduleMutation.mutate()}
                      disabled={publishScheduleMutation.isPending}
                      className={classMonth?.schedule_notified_at ? "text-success border-success/30" : ""}
                    >
                      {publishScheduleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : classMonth?.schedule_notified_at ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <Bell className="w-4 h-4 mr-2" />
                      )}
                      {classMonth?.schedule_notified_at ? 'Notified' : 'Notify Students'}
                    </Button>
                  )}
                  <Button onClick={() => { resetDayForm(); setDayDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Day
                  </Button>
                </div>
              </div>

              {classDays.length === 0 ? (
                <Card className="card-elevated">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No class days yet</h3>
                    <p className="text-sm text-muted-foreground">Add your first class day to get started</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {classDays.map((day, index) => (
                    <Card key={day.id} className={cn(
                      "card-elevated", 
                      day.is_extra && "border-accent/50",
                      day.is_conducted && "border-success/50 bg-success/5"
                    )}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Conducted toggle button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "w-10 h-10 rounded-lg",
                              day.is_conducted 
                                ? "bg-success/20 text-success hover:bg-success/30" 
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                            onClick={() => markConductedMutation.mutate({ 
                              dayId: day.id, 
                              isConducted: !day.is_conducted 
                            })}
                            disabled={markConductedMutation.isPending}
                          >
                            {day.is_conducted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </Button>
                          <div>
                            <p className="font-medium text-foreground">{day.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(day.date).toLocaleDateString('en-US', { 
                                weekday: 'long', month: 'short', day: 'numeric' 
                              })}
                              {day.start_time && (
                                <span className="ml-2 text-primary">
                                  {day.start_time.slice(0, 5)}
                                  {day.end_time && ` - ${day.end_time.slice(0, 5)}`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {day.is_conducted && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              Conducted
                            </Badge>
                          )}
                          {day.is_extra && (
                            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                              Extra
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {getLessonsForDay(day.id).length} lessons
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAddLesson(day.id)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Lesson
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDay(day)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Day
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => markConductedMutation.mutate({ 
                                  dayId: day.id, 
                                  isConducted: !day.is_conducted 
                                })}
                              >
                                {day.is_conducted ? (
                                  <>
                                    <Circle className="w-4 h-4 mr-2" />
                                    Mark Not Conducted
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark Conducted
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDay(day)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Day
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="space-y-4">
              <h2 className="text-lg font-semibold">All Lessons</h2>

              {lessons.length === 0 ? (
                <Card className="card-elevated">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No lessons yet</h3>
                    <p className="text-sm text-muted-foreground">Add class days first, then add lessons</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {classDays.map((day) => {
                    const dayLessons = getLessonsForDay(day.id);
                    if (dayLessons.length === 0) return null;
                    return (
                      <div key={day.id}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">{day.title}</h3>
                        <div className="grid gap-3">
                          {dayLessons.map((lesson) => (
                            <Card key={lesson.id} className="card-elevated">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-foreground">{lesson.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      {lesson.pdf_url && (
                                        <Badge variant="outline" className="gap-1">
                                          <FileText className="w-3 h-3" />
                                          PDF
                                        </Badge>
                                      )}
                                      {lesson.youtube_url && (
                                        <Badge variant="outline" className="gap-1">
                                          <Youtube className="w-3 h-3" />
                                          Video
                                        </Badge>
                                      )}
                                      {lesson.notes_text && (
                                        <Badge variant="outline">Notes</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditLesson(lesson)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Lesson
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => setDeleteLesson(lesson)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Lesson
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Papers Tab */}
            <TabsContent value="papers" className="space-y-4">
              <ClassPapersManager classId={id!} classTitle={classData.title} />
            </TabsContent>

            {/* Enrollments Tab - only for private classes */}
            {classData.is_private && (
              <TabsContent value="enrollments" className="space-y-4">
                <PrivateClassEnrollmentsManager 
                  classId={id!} 
                  className={classData.title}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Add/Edit Day Dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDay ? 'Edit Class Day' : 'Add Class Day'}</DialogTitle>
            <DialogDescription>
              {editingDay ? 'Update class day details' : 'Add a new class day to the schedule'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dayTitle">Title</Label>
              <Input 
                id="dayTitle" 
                placeholder="e.g., Week 1 - Introduction"
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayDate">Date</Label>
              <Input 
                id="dayDate" 
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dayStartTime">Start Time</Label>
                <Input 
                  id="dayStartTime" 
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayEndTime">End Time</Label>
                <Input 
                  id="dayEndTime" 
                  type="time"
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Extra Session</Label>
                <p className="text-sm text-muted-foreground">Mark as bonus/extra class</p>
              </div>
              <Switch checked={dayIsExtra} onCheckedChange={setDayIsExtra} />
            </div>

            {/* Zoom Meeting Integration */}
            <div className="space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                <Label className="text-foreground font-medium">Zoom Meeting</Label>
              </div>
              
              {!dayMeetingLink ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Create a Zoom meeting with unique student links (prevents link sharing)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      if (editingDay) {
                        handleCreateZoomMeeting(editingDay.id);
                      } else {
                        toast.error('Please save the class day first, then edit to add Zoom');
                      }
                    }}
                    disabled={creatingZoomMeeting || !dayDate || !dayStartTime || !editingDay}
                  >
                    {creatingZoomMeeting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Zoom Meeting...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        Create Zoom Meeting
                      </>
                    )}
                  </Button>
                  {!editingDay && (
                    <p className="text-xs text-warning">
                      Save this day first, then edit it to create a Zoom meeting
                    </p>
                  )}
                  {(!dayDate || !dayStartTime) && editingDay && (
                    <p className="text-xs text-warning">
                      Set date and start time first
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={dayMeetingLink}
                      onChange={(e) => setDayMeetingLink(e.target.value)}
                      placeholder="Meeting link"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDayMeetingLink('')}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Meeting created - each student will get a unique join link
                  </p>
                </div>
              )}
            </div>

            {/* Notify Students Toggle */}
            {dayMeetingLink && (
              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <Label className="text-primary">Notify Students</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS + in-app notification about the class
                  </p>
                </div>
                <Switch 
                  checked={notifyMeetingLink} 
                  onCheckedChange={setNotifyMeetingLink} 
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveDayMutation.mutate()}
              disabled={saveDayMutation.isPending || !dayTitle || !dayDate}
            >
              {saveDayMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            <DialogDescription>
              {editingLesson ? 'Update lesson details and materials' : 'Add lesson content and materials'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">Title</Label>
              <Input 
                id="lessonTitle" 
                placeholder="e.g., Introduction to Databases"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessonDescription">Description</Label>
              <Textarea 
                id="lessonDescription" 
                placeholder="Brief description of the lesson..."
                rows={2}
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessonNotes">Notes (optional)</Label>
              <Textarea 
                id="lessonNotes" 
                placeholder="Detailed notes or key points..."
                rows={3}
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
              />
            </div>

            {/* Attachments - only show when editing existing lesson */}
            {editingLesson && (
              <LessonAttachmentsManager lessonId={editingLesson.id} />
            )}

            {!editingLesson && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                💡 Save the lesson first, then you can add multiple videos, PDFs, and images
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveLessonMutation.mutate()}
              disabled={saveLessonMutation.isPending || !lessonTitle}
            >
              {saveLessonMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Day Confirmation */}
      <AlertDialog open={!!deleteDay} onOpenChange={() => setDeleteDay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class Day</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDay?.title}"? This will also delete all lessons for this day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDay && deleteDayMutation.mutate(deleteDay.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lesson Confirmation */}
      <AlertDialog open={!!deleteLesson} onOpenChange={() => setDeleteLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteLesson?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteLesson && deleteLessonMutation.mutate(deleteLesson.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminClassContent;