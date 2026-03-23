import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  BookOpen, 
  CreditCard, 
  Bell, 
  Lock,
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Youtube,
  Loader2,
  ClipboardList,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StudentLayout from '@/components/layouts/StudentLayout';
import ClassPapersList from '@/components/class/ClassPapersList';
import LessonAttachmentsList from '@/components/class/LessonAttachmentsList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PaymentUploadForm from '@/components/payments/PaymentUploadForm';
import BankAccountsList from '@/components/payments/BankAccountsList';
import { invokeFunction } from '@/lib/functions';

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [enrollCode, setEnrollCode] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [viewingNotes, setViewingNotes] = useState<{ title: string; notes: string } | null>(null);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);

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

  // Check enrollment status
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', user?.id, id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', id)
        .in('status', ['ACTIVE', 'PENDING'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch enrollment payments for private classes
  const { data: enrollmentPayments = [] } = useQuery({
    queryKey: ['enrollment-payments', enrollment?.id],
    queryFn: async () => {
      if (!enrollment?.id) return [];
      const { data, error } = await (supabase as any)
        .from('enrollment_payments')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!enrollment?.id,
  });

  // Fetch current month payment status
  const { data: currentPayment } = useQuery({
    queryKey: ['class-payment', user?.id, id, selectedMonth],
    queryFn: async () => {
      if (!user || !id) return null;
      // ref_id format: classId-yearMonth
      const refId = `${id}-${selectedMonth}`;
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('ref_id', refId)
        .eq('payment_type', 'CLASS_MONTH')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && !!enrollment,
  });

  // Fetch class days for the month
  const { data: classDays = [] } = useQuery({
    queryKey: ['class-days', id, selectedMonth],
    queryFn: async () => {
      if (!id) return [];
      const { data: classMonth } = await supabase
        .from('class_months')
        .select('id')
        .eq('class_id', id)
        .eq('year_month', selectedMonth)
        .maybeSingle();
      
      if (!classMonth) return [];

      const { data, error } = await supabase
        .from('class_days')
        .select('*')
        .eq('class_month_id', classMonth.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!id && !!enrollment,
  });

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', id, selectedMonth],
    queryFn: async () => {
      if (!id || classDays.length === 0) return [];
      const dayIds = classDays.map(d => d.id);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .in('class_day_id', dayIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && classDays.length > 0,
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Not authenticated');

      // Validate private class code
      if (classData?.is_private) {
        if (!enrollCode.trim()) throw new Error('Please enter the class code');
        if (classData.private_code && enrollCode.trim() !== classData.private_code) {
          throw new Error('Invalid class code');
        }
      }

      // Check for duplicate enrollment
      const { data: existing } = await supabase
        .from('class_enrollments')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('class_id', id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'ACTIVE') throw new Error('You are already enrolled in this class');
        throw new Error('Your enrollment request is already submitted');
      }

      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          user_id: user.id,
          class_id: id,
          status: classData?.is_private ? 'PENDING' : 'ACTIVE',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      const msg = classData?.is_private
        ? 'Enrollment request submitted! Wait for admin approval.'
        : 'Successfully enrolled!';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll');
    },
  });

  // Download PDF with watermark
  const handleDownloadPdf = async (lessonId: string, pdfUrl: string) => {
    if (!session?.access_token) {
      toast.error('Please log in to download');
      return;
    }

    setDownloadingPdf(lessonId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-pdf-watermark`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pdfUrl }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download PDF');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `material-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded with watermark');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const isEnrolled = !!enrollment;
  const isPrivateClass = classData?.is_private || false;
  
  // For private classes: always consider as paid (free access)
  // For public classes: check payment status
  const paymentStatus = isPrivateClass ? 'PAID' 
    : currentPayment?.status === 'APPROVED' ? 'PAID' 
    : currentPayment?.status === 'PENDING' ? 'PENDING' 
    : 'UNPAID';
  const isPaid = paymentStatus === 'PAID';

  if (classLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!classData) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-2">Class not found</h2>
          <Link to="/classes">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  // Not enrolled view
  if (!isEnrolled) {
    return (
      <StudentLayout>
        <div className="section-spacing max-w-3xl mx-auto">
          <Link to="/classes" className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            Back to Classes
          </Link>

          <Card className="card-elevated">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-2xl">{classData.title}</CardTitle>
                  <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                    {classData.description}
                  </CardDescription>
                </div>
                {classData.is_private && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0">
                    <Lock className="w-3 h-3" />
                    Private
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg bg-muted">
                  <p className="text-xs sm:text-sm text-muted-foreground">Grade</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {classData.grade_min === classData.grade_max 
                      ? `Grade ${classData.grade_min}` 
                      : `${classData.grade_min}-${classData.grade_max}`
                    }
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted">
                  <p className="text-xs sm:text-sm text-muted-foreground">Fee</p>
                  <p className="text-base sm:text-lg font-semibold">
                    Rs. {classData.monthly_fee_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {classData.is_private ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-warning/50 bg-warning/5">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground">Private Class</h4>
                        <p className="text-sm text-muted-foreground">
                          Enter the class code provided by your teacher to request enrollment.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classCode">Class Code</Label>
                    <Input
                      id="classCode"
                      placeholder="Enter class code"
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    variant="hero"
                    disabled={!enrollCode || enrollMutation.isPending}
                    onClick={() => enrollMutation.mutate()}
                  >
                    {enrollMutation.isPending ? 'Requesting...' : 'Request Enrollment'}
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  variant="hero"
                  size="lg"
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                </Button>
              )}

              <p className="text-sm text-muted-foreground text-center">
                Enrollment is free. Materials are unlocked after monthly payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  // Enrolled view with tabs
  return (
    <StudentLayout>
      <div className="section-spacing">
        <Link to="/classes" className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-3 sm:mb-4">
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
          Back
        </Link>

        {/* Class Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground line-clamp-1">{classData.title}</h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-1 line-clamp-2">{classData.description}</p>
          </div>
          {isPrivateClass ? (
            // Private class: show payment received date or enrolled status
            <Badge 
              variant="outline"
              className="text-xs sm:text-sm px-2 sm:px-4 py-1 self-start sm:shrink-0 badge-paid"
            >
              {enrollment?.payment_received_at 
                ? `Paid: ${new Date(enrollment.payment_received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Enrolled'
              }
            </Badge>
          ) : (
            // Public class: show payment status
            <Badge 
              variant="outline"
              className={cn(
                "text-xs sm:text-sm px-2 sm:px-4 py-1 self-start sm:shrink-0",
                paymentStatus === 'PAID' && 'badge-paid',
                paymentStatus === 'PENDING' && 'badge-pending',
                paymentStatus === 'UNPAID' && 'badge-unpaid'
              )}
            >
              {paymentStatus === 'PAID' && 'Paid'}
              {paymentStatus === 'PENDING' && 'Pending'}
              {paymentStatus === 'UNPAID' && 'Unpaid'}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="schedule" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="schedule" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Lessons</span>
            </TabsTrigger>
            <TabsTrigger value="papers" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
              <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Papers</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">News</span>
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monthly Schedule</h2>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
            </div>

            {classDays.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No schedule yet</h3>
                  <p className="text-sm text-muted-foreground">Schedule will be available soon</p>
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
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center",
                          day.is_conducted ? "bg-success/20" : "bg-primary/10"
                        )}>
                          {day.is_conducted ? (
                            <CheckCircle className="w-6 h-6 text-success" />
                          ) : (
                            <span className="text-lg font-bold text-primary">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{day.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {day.is_conducted && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                            Conducted
                          </Badge>
                        )}
                        {day.is_extra && (
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                            Extra Session
                          </Badge>
                        )}
                        {/* Join Meeting Button - only for paid students with Zoom meeting */}
                        {isPaid && day.meeting_link && day.zoom_meeting_id && (
                          <Button 
                            size="sm" 
                            className="gap-1.5"
                            disabled={joiningMeeting === day.id}
                            onClick={async () => {
                              setJoiningMeeting(day.id);
                              try {
                                // Get unique join link via Zoom registration
                                const { data, error } = await invokeFunction('register-zoom-meeting', {
                                  body: { classDayId: day.id },
                                });
                                
                                if (error) {
                                  // Try to extract the real error message from the function response
                                  const ctx = (error as any)?.context as Response | undefined;
                                  if (ctx) {
                                    const raw = await ctx.text();
                                    try {
                                      const parsed = JSON.parse(raw);
                                      throw new Error(parsed?.error || error.message);
                                    } catch {
                                      throw new Error(raw || error.message);
                                    }
                                  }
                                  throw error;
                                }
                                if ((data as any)?.error) throw new Error((data as any).error);
                                
                                // Open the unique join link
                                window.open((data as any).joinUrl, '_blank');
                              } catch (err: any) {
                                console.error('Join meeting error:', err);
                                toast.error(err.message || 'Failed to join meeting');
                              } finally {
                                setJoiningMeeting(null);
                              }
                            }}
                          >
                            {joiningMeeting === day.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Video className="w-4 h-4" />
                            )}
                            Join
                          </Button>
                        )}
                        {/* Regular meeting link (non-Zoom) */}
                        {isPaid && day.meeting_link && !day.zoom_meeting_id && (
                          <Button 
                            size="sm" 
                            className="gap-1.5"
                            onClick={() => window.open(day.meeting_link, '_blank')}
                          >
                            <Video className="w-4 h-4" />
                            Join
                          </Button>
                        )}
                        {isPaid ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              * Monthly fee covers first 4 sessions. Extra sessions are free once monthly fee is paid.
            </p>
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <h2 className="text-lg font-semibold">Lessons & Materials</h2>

            {lessons.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No lessons yet</h3>
                  <p className="text-sm text-muted-foreground">Lessons will be added soon</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id} className="card-elevated relative overflow-hidden">
                    {!isPaid && (
                      <div className="locked-overlay">
                        <div className="text-center p-4">
                          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium">Pay monthly fee to unlock</p>
                        </div>
                      </div>
                    )}
                    <CardContent className={cn("p-4", !isPaid && "blur-sm")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <span className="font-semibold text-secondary-foreground">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                            
                            {/* Legacy Materials (single pdf/youtube) */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {lesson.pdf_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1"
                                  onClick={() => handleDownloadPdf(lesson.id, lesson.pdf_url)}
                                  disabled={downloadingPdf === lesson.id}
                                >
                                  {downloadingPdf === lesson.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  PDF
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                              {lesson.youtube_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1"
                                  onClick={() => window.open(lesson.youtube_url, '_blank')}
                                >
                                  <Youtube className="w-4 h-4 text-destructive" />
                                  Watch Video
                                </Button>
                              )}
                              {lesson.notes_text && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1"
                                  onClick={() => setViewingNotes({ title: lesson.title, notes: lesson.notes_text })}
                                >
                                  <BookOpen className="w-4 h-4" />
                                  Notes
                                </Button>
                              )}
                            </div>
                            
                            {/* New Multi-Attachments */}
                            <LessonAttachmentsList lessonId={lesson.id} isPaid={isPaid} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Papers Tab */}
          <TabsContent value="papers" className="space-y-4">
            <h2 className="text-lg font-semibold">Practice Papers</h2>
            <ClassPapersList classId={id!} isPaid={isPaid} />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {isPrivateClass ? (
              // Private class - show payment history from admin
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10">
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-medium text-success">Private Class - Free Access</p>
                      <p className="text-sm text-muted-foreground">All materials are unlocked for enrolled students</p>
                    </div>
                  </div>

                  {enrollmentPayments.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Recorded Payments</h4>
                      <div className="space-y-2">
                        {enrollmentPayments.map((payment: any) => (
                          <div key={payment.id} className="p-4 rounded-lg bg-muted flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Rs. {payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                              {payment.note && (
                                <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>
                              )}
                            </div>
                            <CheckCircle className="w-5 h-5 text-success" />
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Paid</span>
                          <span className="font-bold text-lg">
                            Rs. {enrollmentPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No payment records yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Public class - show payment upload form
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Payment Status */}
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                      <span className="text-muted-foreground">Monthly Fee</span>
                      <span className="text-xl font-bold">
                        Rs. {classData.monthly_fee_amount.toLocaleString()}
                      </span>
                    </div>

                    <div className={cn(
                      "flex items-center gap-3 p-4 rounded-lg",
                      paymentStatus === 'PAID' && "bg-success/10",
                      paymentStatus === 'PENDING' && "bg-warning/10",
                      paymentStatus === 'UNPAID' && "bg-destructive/10"
                    )}>
                      {paymentStatus === 'PAID' && (
                        <>
                          <CheckCircle className="w-6 h-6 text-success" />
                          <div>
                            <p className="font-medium text-success">Payment Verified</p>
                            <p className="text-sm text-muted-foreground">All materials unlocked</p>
                          </div>
                        </>
                      )}
                      {paymentStatus === 'PENDING' && (
                        <>
                          <Clock className="w-6 h-6 text-warning" />
                          <div>
                            <p className="font-medium text-warning">Verification Pending</p>
                            <p className="text-sm text-muted-foreground">We'll verify within 24 hours</p>
                          </div>
                        </>
                      )}
                      {paymentStatus === 'UNPAID' && (
                        <>
                          <AlertCircle className="w-6 h-6 text-destructive" />
                          <div>
                            <p className="font-medium text-destructive">Payment Required</p>
                            <p className="text-sm text-muted-foreground">Pay to access materials</p>
                          </div>
                        </>
                      )}
                    </div>

                    {paymentStatus !== 'PAID' && id && (
                      <PaymentUploadForm 
                        paymentType="CLASS_MONTH"
                        refId={`${id}-${selectedMonth}`}
                        amount={classData.monthly_fee_amount}
                        title={`${selectedMonth} Fee`}
                        currentStatus={currentPayment?.status as 'PENDING' | 'APPROVED' | 'REJECTED' | null}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['class-payment'] })}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Bank Accounts */}
                <BankAccountsList />
              </div>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <h2 className="text-lg font-semibold">Class Announcements</h2>
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No announcements</h3>
                <p className="text-sm text-muted-foreground">Check back later for updates</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notes Dialog */}
        <Dialog open={!!viewingNotes} onOpenChange={(open) => !open && setViewingNotes(null)}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Notes: {viewingNotes?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="whitespace-pre-wrap text-sm text-foreground bg-muted p-4 rounded-lg max-h-[50vh] overflow-y-auto">
                {viewingNotes?.notes}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default ClassDetail;
