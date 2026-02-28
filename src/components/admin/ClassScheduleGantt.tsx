import { Calendar, ChevronLeft, ChevronRight, Bell, Loader2, List, Grid3X3, CalendarDays, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, getDaysInMonth, parseISO, getDate, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClassWithDays {
  id: string;
  title: string;
  days: {
    id: string;
    date: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    is_conducted: boolean;
    is_extra: boolean;
  }[];
}

type ViewMode = 'day' | 'week' | 'month';

const ClassScheduleGantt = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const queryClient = useQueryClient();

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return { start: currentDate, end: currentDate };
      case 'week':
        return { 
          start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
          end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
        };
      case 'month':
      default:
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const dateRange = getDateRange();
  const yearMonth = format(currentDate, 'yyyy-MM');

  // Fetch all classes with their days and notification status
  const { data: classesWithDays = [], isLoading } = useQuery({
    queryKey: ['gantt-schedule', format(dateRange.start, 'yyyy-MM-dd'), format(dateRange.end, 'yyyy-MM-dd'), yearMonth],
    queryFn: async () => {
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, title')
        .order('title');
      if (classError) throw classError;

      // Get class months for notification status
      const { data: classMonths } = await (supabase as any)
        .from('class_months')
        .select('class_id, schedule_notified_at')
        .eq('year_month', yearMonth);

      // Get class days in date range
      const { data: classDays, error: daysError } = await supabase
        .from('class_days')
        .select(`
          id, date, title, start_time, end_time, is_conducted, is_extra,
          class_month:class_month_id (class_id)
        `)
        .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.end, 'yyyy-MM-dd'));
      if (daysError) throw daysError;

      const notifiedMap = new Map((classMonths || []).map(cm => [cm.class_id, cm.schedule_notified_at]));

      return (classes || []).map(cls => {
        const days = (classDays || [])
          .filter((d: any) => d.class_month?.class_id === cls.id)
          .map((d: any) => ({
            id: d.id,
            date: d.date,
            title: d.title,
            start_time: d.start_time,
            end_time: d.end_time,
            is_conducted: d.is_conducted,
            is_extra: d.is_extra,
          }));
        return { ...cls, days, schedule_notified_at: notifiedMap.get(cls.id) || null };
      }).filter(cls => cls.days.length > 0) as (ClassWithDays & { schedule_notified_at: string | null })[];
    },
  });

  // Publish schedule mutation
  const publishMutation = useMutation({
    mutationFn: async (classData: ClassWithDays & { schedule_notified_at: string | null }) => {
      const monthName = format(currentDate, 'MMMM yyyy');
      
      const scheduleDetails = classData.days
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => {
          const dayDate = parseISO(day.date);
          const dateStr = format(dayDate, 'EEE, MMM d');
          const timeStr = day.start_time 
            ? `${formatTime(day.start_time)}${day.end_time ? ` - ${formatTime(day.end_time)}` : ''}`
            : '';
          return `📅 ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
        })
        .join('\n');

      await supabase.from('notifications').insert({
        title: `📅 ${classData.title} - ${monthName} Schedule`,
        message: `Class schedule for ${monthName} has been published!\n\n${scheduleDetails}\n\n${classData.days.length} classes scheduled.`,
        target_type: 'CLASS',
        target_ref: classData.id,
      });

      // Update class_month to mark as notified
      await (supabase as any)
        .from('class_months')
        .update({ schedule_notified_at: new Date().toISOString() })
        .eq('class_id', classData.id)
        .eq('year_month', yearMonth);

      const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
      
      await supabase.functions.invoke('send-sms-notification', {
        body: {
          type: 'schedule_published',
          classId: classData.id,
          previousMonthOnly: true,
          previousMonth: prevMonth,
          data: {
            className: classData.title,
            month: monthName,
            classCount: classData.days.length,
          },
        },
      });

      return classData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gantt-schedule'] });
      toast.success(`Schedule published for ${data.title}!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to publish');
    },
  });

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const navigate = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' 
      ? viewMode === 'day' ? subDays : viewMode === 'week' ? subWeeks : subMonths
      : viewMode === 'day' ? addDays : viewMode === 'week' ? addWeeks : addMonths;
    setCurrentDate(fn(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Generate column headers based on view
  const getColumns = () => {
    if (viewMode === 'day') {
      return [{ date: currentDate, label: format(currentDate, 'd'), fullLabel: format(currentDate, 'EEEE, MMM d') }];
    } else if (viewMode === 'week') {
      const days = [];
      let day = dateRange.start;
      while (day <= dateRange.end) {
        days.push({ date: day, label: format(day, 'EEE d'), fullLabel: format(day, 'EEEE, MMM d') });
        day = addDays(day, 1);
      }
      return days;
    } else {
      const daysInMonth = getDaysInMonth(currentDate);
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
        return { date: day, label: String(i + 1), fullLabel: format(day, 'EEEE, MMM d') };
      });
    }
  };

  const columns = getColumns();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get header label
  const getHeaderLabel = () => {
    if (viewMode === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (viewMode === 'week') return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <Card className="card-elevated overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Class Schedule
          </CardTitle>
          
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2 gap-1">
                <List className="w-3 h-3" />
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2 gap-1">
                <CalendarDays className="w-3 h-3" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2 gap-1">
                <Grid3X3 className="w-3 h-3" />
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {getHeaderLabel()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : classesWithDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No classes scheduled</p>
          </div>
        ) : (
          <ScrollArea className={viewMode === 'day' ? '' : 'max-h-[400px]'}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b">
                    <th className="sticky left-0 z-20 bg-card p-2 text-left text-sm font-medium text-muted-foreground min-w-[160px] border-r">
                      Class
                    </th>
                    {columns.map((col, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <th 
                            className={cn(
                              "p-1 text-center font-medium",
                              viewMode === 'month' ? "text-xs min-w-[28px]" : "text-xs min-w-[60px]",
                              format(col.date, 'yyyy-MM-dd') === todayStr
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {col.label}
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {col.fullLabel}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    <th className="sticky right-0 z-20 bg-card p-2 text-center text-sm font-medium text-muted-foreground min-w-[80px] border-l">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classesWithDays.map((cls, index) => {
                    const dayMap = new Map(
                      cls.days.map(d => [format(parseISO(d.date), 'yyyy-MM-dd'), d])
                    );

                    return (
                      <tr key={cls.id} className={cn("border-b", index % 2 === 0 ? "bg-muted/20" : "")}>
                        <td className="sticky left-0 z-10 bg-card p-2 border-r">
                          <Link 
                            to={`/admin/classes/${cls.id}/content`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block max-w-[140px]"
                          >
                            {cls.title}
                          </Link>
                        </td>
                        {columns.map((col, i) => {
                          const dateKey = format(col.date, 'yyyy-MM-dd');
                          const classDay = dayMap.get(dateKey);
                          return (
                            <td key={i} className="p-0.5">
                              {classDay ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link to={`/admin/classes/${cls.id}/content`}>
                                      <div className={cn(
                                        "h-6 rounded-sm cursor-pointer transition-all hover:scale-110",
                                        classDay.is_conducted 
                                          ? "bg-success/60" 
                                          : classDay.is_extra 
                                            ? "bg-accent" 
                                            : "bg-primary"
                                      )} />
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                                    <p className="font-medium">{classDay.title}</p>
                                    {classDay.start_time && (
                                      <p className="text-muted-foreground">
                                        {formatTime(classDay.start_time)}
                                        {classDay.end_time && ` - ${formatTime(classDay.end_time)}`}
                                      </p>
                                    )}
                                    <div className="flex gap-1 mt-1">
                                      {classDay.is_conducted && <Badge className="bg-success text-[10px]">Done</Badge>}
                                      {classDay.is_extra && <Badge className="bg-accent text-[10px]">Extra</Badge>}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="h-6" />
                              )}
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-card p-1 border-l">
                          <Button
                            variant={cls.schedule_notified_at ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs gap-1",
                              cls.schedule_notified_at && "text-success border-success/30"
                            )}
                            onClick={() => publishMutation.mutate(cls)}
                            disabled={publishMutation.isPending}
                          >
                            {publishMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : cls.schedule_notified_at ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Bell className="w-3 h-3" />
                            )}
                            {cls.schedule_notified_at ? 'Notified' : 'Publish'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 p-3 border-t bg-muted/30 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-primary" />
            <span className="text-muted-foreground">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-success/60" />
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-accent" />
            <span className="text-muted-foreground">Extra</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassScheduleGantt;
