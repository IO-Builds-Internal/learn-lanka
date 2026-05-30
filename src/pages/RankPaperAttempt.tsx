import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Send,
  Loader2,
  Eye,
  EyeOff,
  FileText,
  Shield,
  Save,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';

interface Question {
  id: string;
  q_no: number;
  question_text: string | null;
  question_image_url: string | null;
  options: {
    id: string;
    option_no: number;
    option_text: string | null;
    option_image_url: string | null;
  }[];
}

interface RankPaper {
  id: string;
  title: string;
  time_limit_minutes: number;
  has_mcq: boolean;
  has_short_essay: boolean;
  has_essay: boolean;
  essay_pdf_url: string | null;
  short_essay_pdf_url: string | null;
}

interface Attempt {
  id: string;
  ends_at: string;
  submitted_at: string | null;
  tab_switch_count: number;
  window_close_count: number;
}

const RankPaperAttempt = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [paper, setPaper] = useState<RankPaper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabBlurred, setTabBlurred] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [windowCloseCount, setWindowCloseCount] = useState(0);
  const [essayFile, setEssayFile] = useState<File | null>(null);
  const [shortEssayFile, setShortEssayFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const violationSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch paper and questions
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;

      // Fetch paper
      const { data: paperData, error: paperError } = await supabase
        .from('rank_papers')
        .select('*')
        .eq('id', id)
        .single();

      if (paperError || !paperData) {
        toast({ title: 'Paper not found', variant: 'destructive' });
        navigate('/rank-papers');
        return;
      }

      setPaper(paperData);

      // Check for existing attempt or create new one
      const { data: existingAttempt } = await supabase
        .from('rank_attempts')
        .select('*')
        .eq('rank_paper_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingAttempt) {
        if (existingAttempt.submitted_at) {
          toast({ title: 'Already submitted', description: 'You have already completed this paper' });
          navigate(`/rank-papers/${id}/results`);
          return;
        }
        setAttempt(existingAttempt);

        // Load existing violation counts
        setTabSwitchCount(existingAttempt.tab_switch_count || 0);
        setWindowCloseCount((existingAttempt.window_close_count || 0) + 1); // Increment for this session

        // Save the incremented window close count
        await supabase
          .from('rank_attempts')
          .update({ window_close_count: (existingAttempt.window_close_count || 0) + 1 })
          .eq('id', existingAttempt.id);

        // Calculate remaining time
        const endTime = new Date(existingAttempt.ends_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          // Auto-submit if time expired
          handleAutoSubmit(existingAttempt.id);
          return;
        }

        // Fetch existing answers
        const { data: existingAnswers } = await supabase
          .from('rank_answers_mcq')
          .select('question_id, selected_option_no')
          .eq('attempt_id', existingAttempt.id);

        if (existingAnswers) {
          const answersMap: Record<string, number> = {};
          existingAnswers.forEach(a => {
            if (a.selected_option_no !== null) {
              answersMap[a.question_id] = a.selected_option_no;
            }
          });
          setAnswers(answersMap);
        }
      } else {
        // Create new attempt
        const endsAt = new Date(Date.now() + paperData.time_limit_minutes * 60 * 1000);
        const { data: newAttempt, error: attemptError } = await supabase
          .from('rank_attempts')
          .insert({
            rank_paper_id: id,
            user_id: user.id,
            ends_at: endsAt.toISOString(),
          })
          .select()
          .single();

        if (attemptError || !newAttempt) {
          toast({ title: 'Failed to start attempt', variant: 'destructive' });
          navigate('/rank-papers');
          return;
        }

        setAttempt(newAttempt);
        setTimeLeft(paperData.time_limit_minutes * 60);
      }

      // Fetch questions with options
      if (paperData.has_mcq) {
        const { data: questionsData } = await supabase
          .from('rank_mcq_questions')
          .select(`
            id,
            q_no,
            question_text,
            question_image_url,
            rank_mcq_options (
              id,
              option_no,
              option_text,
              option_image_url
            )
          `)
          .eq('rank_paper_id', id)
          .order('q_no');

        if (questionsData) {
          setQuestions(questionsData.map(q => ({
            ...q,
            options: q.rank_mcq_options.sort((a, b) => a.option_no - b.option_no)
          })));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user, navigate, toast]);

  // Timer countdown
  useEffect(() => {
    if (!attempt || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit(attempt.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, timeLeft > 0]);

  // Save violations to database
  const saveViolations = useCallback(async (newTabCount: number, newWindowCount: number) => {
    if (!attempt) return;

    // Debounce the save
    if (violationSaveRef.current) {
      clearTimeout(violationSaveRef.current);
    }

    violationSaveRef.current = setTimeout(async () => {
      await supabase
        .from('rank_attempts')
        .update({
          tab_switch_count: newTabCount,
          window_close_count: newWindowCount
        })
        .eq('id', attempt.id);
    }, 500);
  }, [attempt]);

  // Anti-cheating measures: Tab visibility, window blur, keyboard shortcuts, print screen, copy protection
  useEffect(() => {
    // Fires when switching browser tabs
    const handleVisibilityChange = () => {
      if (document.hidden && attempt) {
        setTabBlurred(true);
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          saveViolations(newCount, windowCloseCount);
          return newCount;
        });
      } else if (!document.hidden) {
        setTabBlurred(false);
      }
    };

    // Fires when switching to another application (Alt+Tab, opening another browser, etc.)
    const handleWindowBlur = () => {
      if (attempt) {
        setTabBlurred(true);
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          saveViolations(newCount, windowCloseCount);
          return newCount;
        });
      }
    };

    const handleWindowFocus = () => {
      setTabBlurred(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({ title: 'Right-click disabled', description: 'This action is not allowed during the exam' });
    };

    document.addEventListener('contextmenu', handleContextMenu);

    // Block copy event
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: 'Copy disabled', description: 'Copying content is not allowed during the exam' });
    };
    document.addEventListener('copy', handleCopy);

    // Block cut event
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: 'Cut disabled', description: 'Cutting content is not allowed during the exam' });
    };
    document.addEventListener('cut', handleCut);

    // Block paste event
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: 'Paste disabled', description: 'Pasting content is not allowed during the exam' });
    };
    document.addEventListener('paste', handlePaste);

    // Block keyboard shortcuts for screenshots and copy
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard.writeText('').catch(() => { });
        toast({ title: 'Screenshots blocked', description: 'Taking screenshots is not allowed during the exam', variant: 'destructive' });
        // Record as violation
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          saveViolations(newCount, windowCloseCount);
          return newCount;
        });
        return;
      }

      // Block Ctrl/Cmd+P (Print), Ctrl/Cmd+S (Save), Ctrl/Cmd+C (Copy), Ctrl/Cmd+A (Select All), Ctrl/Cmd+X (Cut), Ctrl/Cmd+V (Paste)
      if (e.ctrlKey || e.metaKey) {
        if (['p', 's', 'c', 'a', 'x', 'v', 'u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          toast({ title: 'Shortcut blocked', description: 'This keyboard shortcut is not allowed during the exam', variant: 'destructive' });
          return;
        }
        // Block Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
        if (e.shiftKey && ['i', 'j', 'c', 's'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          return;
        }
        // Block Ctrl+Shift+S (Screenshot in some systems)
        if (e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          toast({ title: 'Screenshots blocked', description: 'Taking screenshots is not allowed during the exam', variant: 'destructive' });
          return;
        }
      }

      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Block Windows+Shift+S (Windows screenshot)
      if (e.key === 's' && e.shiftKey && (e.metaKey || e.getModifierState('Meta'))) {
        e.preventDefault();
        toast({ title: 'Screenshots blocked', description: 'Taking screenshots is not allowed during the exam', variant: 'destructive' });
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', (e) => {
      // Clear clipboard after PrintScreen keyup
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('').catch(() => { });
      }
    });

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('selectstart', handleSelectStart);

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    document.addEventListener('dragstart', handleDragStart);

    // Add CSS to body for exam mode
    document.body.classList.add('exam-mode-active');
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.body.classList.remove('exam-mode-active');
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [toast, attempt, windowCloseCount, saveViolations]);

  const handleAutoSubmit = async (attemptId: string) => {
    setSubmitting(true);
    await supabase
      .from('rank_attempts')
      .update({ submitted_at: new Date().toISOString(), auto_closed: true })
      .eq('id', attemptId);

    toast({ title: 'Time expired', description: 'Your answers have been auto-submitted' });
    navigate(`/rank-papers/${id}/results`);
  };

  // Save answer with debounce
  const saveAnswerToDb = useCallback(async (questionId: string, optionNo: number, attemptId: string) => {
    setIsSaving(true);
    try {
      await supabase
        .from('rank_answers_mcq')
        .upsert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_no: optionNo,
        }, {
          onConflict: 'attempt_id,question_id'
        });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save answer:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleAnswerChange = async (questionId: string, optionNo: number) => {
    if (!attempt) return;

    // Update local state immediately
    setAnswers(prev => ({ ...prev, [questionId]: optionNo }));

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to database (300ms)
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswerToDb(questionId, optionNo, attempt.id);
    }, 300);
  };

  const handleFileUpload = async (file: File, type: 'SHORT_ESSAY' | 'ESSAY') => {
    if (!attempt || !user) return;

    let fileToUse = file;

    // Validate size limit and try to compress images if they exceed the 10MB limit
    if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Compressing image...',
        description: 'Your answer image is larger than 10MB. Compressing to fit limit.',
      });

      fileToUse = await compressImage(
        file,
        10 * 1024 * 1024,
        undefined,
        (compFile, savedBytes) => {
          if (savedBytes > 0) {
            toast({
              title: 'Image compressed successfully',
              description: `Reduced size by ${(savedBytes / (1024 * 1024)).toFixed(2)}MB`,
            });
          }
        }
      );

      if (fileToUse.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Failed to compress the image under the 10MB limit. Please upload a smaller image.',
          variant: 'destructive',
        });
        return;
      }
    } else if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB for PDF files.',
        variant: 'destructive',
      });
      return;
    }

    const fileExt = fileToUse.name.split('.').pop();
    const fileName = `${user.id}/${attempt.id}-${type.toLowerCase()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('essay-uploads')
      .upload(fileName, fileToUse, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('essay-uploads')
      .getPublicUrl(fileName);

    await supabase
      .from('rank_answers_uploads')
      .upsert({
        attempt_id: attempt.id,
        upload_type: type,
        pdf_url: urlData.publicUrl,
      }, {
        onConflict: 'attempt_id,upload_type'
      });

    toast({ title: 'Upload successful', description: `${type === 'ESSAY' ? 'Essay' : 'Short essay'} uploaded` });
  };

  const handleSubmit = async () => {
    if (!attempt) return;

    setSubmitting(true);
    setShowSubmitDialog(false);

    // Upload files if pending
    if (essayFile) {
      await handleFileUpload(essayFile, 'ESSAY');
    }
    if (shortEssayFile) {
      await handleFileUpload(shortEssayFile, 'SHORT_ESSAY');
    }

    // Mark as submitted
    await supabase
      .from('rank_attempts')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', attempt.id);

    toast({ title: 'Submitted successfully', description: 'Your answers have been recorded' });
    navigate(`/rank-papers/${id}/results`);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paper || !attempt) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-3 sm:px-4 py-4 max-w-4xl mx-auto">
      {/* Watermark overlay - deters screenshots */}
      <div
        className="fixed inset-0 pointer-events-none z-40 select-none"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 100px,
            rgba(128, 128, 128, 0.03) 100px,
            rgba(128, 128, 128, 0.03) 200px
          )`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
          <div className="text-6xl font-bold text-foreground rotate-[-30deg] whitespace-nowrap">
            {user?.email || 'EXAM MODE'}
          </div>
        </div>
      </div>

      {/* Tab blur warning overlay */}
      {tabBlurred && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Tab Switch Detected</h2>
              <p className="text-muted-foreground mb-2">
                Switching tabs during the exam is not allowed. This has been recorded.
              </p>
              <div className="p-3 rounded-lg bg-destructive/10 mb-4">
                <p className="text-sm font-medium text-destructive">
                  Integrity Violations:
                </p>
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>• Tab switches: {tabSwitchCount}</p>
                  <p>• Window reopens: {windowCloseCount}</p>
                </div>
              </div>
              <Button onClick={() => setTabBlurred(false)}>
                Continue Exam
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        {/* Header with Timer */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur py-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success flex-shrink-0" />
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">{paper.title}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span>{answeredCount}/{questions.length} answered</span>
                {(tabSwitchCount > 0 || windowCloseCount > 0) && (
                  <Badge variant="destructive" className="gap-1 text-xs px-1.5 py-0">
                    <AlertTriangle className="w-3 h-3" />
                    {tabSwitchCount + windowCloseCount}
                  </Badge>
                )}
                <span className="flex items-center gap-1">
                  {isSaving ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>
                  ) : lastSaved ? (
                    <><CheckCircle2 className="w-3 h-3 text-success" />Saved</>
                  ) : null}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Progress value={progress} className="w-16 sm:w-24 hidden xs:block" />
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono text-base sm:text-lg font-bold transition-all",
                timeLeft < 60 ? "bg-destructive text-destructive-foreground animate-pulse scale-110" :
                  timeLeft < 300 ? "bg-destructive/10 text-destructive animate-pulse" :
                    timeLeft < 600 ? "bg-warning/10 text-warning" : "bg-muted"
              )}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="mcq" className="space-y-6 exam-mode">
          <TabsList className="grid w-full grid-cols-3">
            {paper.has_mcq && <TabsTrigger value="mcq">MCQ</TabsTrigger>}
            {paper.has_short_essay && <TabsTrigger value="short_essay">Short Essay</TabsTrigger>}
            {paper.has_essay && <TabsTrigger value="essay">Essay</TabsTrigger>}
          </TabsList>

          {/* MCQ Tab */}
          {paper.has_mcq && (
            <TabsContent value="mcq" className="space-y-6">
              {/* Question Navigation */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(idx)}
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-medium text-sm transition-colors",
                      idx === currentQuestion && "ring-2 ring-primary",
                      answers[q.id]
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {q.q_no}
                  </button>
                ))}
              </div>

              {/* Current Question */}
              {questions[currentQuestion] && (
                <Card className="card-elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Question {questions[currentQuestion].q_no}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Question Text/Image */}
                    {questions[currentQuestion].question_text && (
                      <p className="text-lg">{questions[currentQuestion].question_text}</p>
                    )}
                    {questions[currentQuestion].question_image_url && (
                      <img
                        src={questions[currentQuestion].question_image_url}
                        alt="Question"
                        className="max-w-full rounded-lg"
                      />
                    )}

                    {/* Options */}
                    <RadioGroup
                      value={answers[questions[currentQuestion].id] !== undefined
                        ? answers[questions[currentQuestion].id].toString()
                        : ""}
                      onValueChange={(value) =>
                        handleAnswerChange(questions[currentQuestion].id, parseInt(value))
                      }
                      className="space-y-3"
                    >
                      {questions[currentQuestion].options.map((option) => (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                            answers[questions[currentQuestion].id] === option.option_no
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleAnswerChange(questions[currentQuestion].id, option.option_no)}
                        >
                          <RadioGroupItem value={option.option_no.toString()} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.option_text && <span>{option.option_text}</span>}
                            {option.option_image_url && (
                              <img
                                src={option.option_image_url}
                                alt={`Option ${option.option_no}`}
                                className="max-w-[200px] mt-2 rounded"
                              />
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* Navigation */}
                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={currentQuestion === questions.length - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Short Essay Tab */}
          {paper.has_short_essay && (
            <TabsContent value="short_essay">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Short Essay</CardTitle>
                  <CardDescription>
                    Download the question paper, write your answers on paper, and upload
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Paper Download */}
                  {paper.short_essay_pdf_url && (
                    <a
                      href={paper.short_essay_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">Short Essay Question Paper</p>
                        <p className="text-sm text-muted-foreground">Click to download</p>
                      </div>
                    </a>
                  )}

                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground">
                      Tips: Use a well-lit area, ensure text is readable, and upload in JPG/PNG/PDF format
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setShortEssayFile(file);
                          handleFileUpload(file, 'SHORT_ESSAY');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium">
                        {shortEssayFile ? shortEssayFile.name : 'Click to upload short essay answer'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Image or PDF up to 10MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Essay Tab */}
          {paper.has_essay && (
            <TabsContent value="essay">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Essay</CardTitle>
                  <CardDescription>
                    Download the question paper, write your answers, and upload
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paper.essay_pdf_url && (
                    <a
                      href={paper.essay_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">Essay Question Paper</p>
                        <p className="text-sm text-muted-foreground">Click to download</p>
                      </div>
                    </a>
                  )}

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEssayFile(file);
                          handleFileUpload(file, 'ESSAY');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium">
                        {essayFile ? essayFile.name : 'Click to upload essay answer'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Image or PDF up to 10MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Submit Button */}
        <div className="sticky bottom-4 flex justify-center px-4">
          <Button
            variant="hero"
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Submit Paper</>
            )}
          </Button>
        </div>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
              <AlertDialogDescription>
                You have answered {answeredCount} out of {questions.length} MCQ questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-warning">
                    Warning: {questions.length - answeredCount} questions are unanswered.
                  </span>
                )}
                <span className="block mt-2">
                  This action cannot be undone.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Exam</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default RankPaperAttempt;
