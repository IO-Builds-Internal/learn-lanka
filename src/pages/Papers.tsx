import { forwardRef, useEffect, useState } from 'react';
import { FileText, Download, Lock, Loader2, LogIn, Video, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StudentLayout from '@/components/layouts/StudentLayout';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
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
  pdf_url: string;
  is_free: boolean;
  download_count: number;
}

interface PaperAttachment {
  id: string;
  paper_id: string;
  attachment_type: string;
  title: string | null;
  url: string;
  sort_order: number;
  access_type: string;
  class_id: string | null;
}

const Papers = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('PAST_PAPER');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [selectedPaperForReview, setSelectedPaperForReview] = useState<Paper | null>(null);
  const isGuest = !user;

  // Fetch papers with attachments count
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('year', { ascending: false });
      if (error) throw error;
      return data as Paper[];
    },
  });

  // Fetch attachments for all papers
  const { data: allAttachments = [] } = useQuery({
    queryKey: ['paper-attachments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paper_attachments')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PaperAttachment[];
    },
  });

  // Get attachments count for a paper
  const getAttachmentsCount = (paperId: string) => {
    return allAttachments.filter(a => a.paper_id === paperId).length;
  };

  // Get attachments for selected paper
  const selectedPaperAttachments = selectedPaperForReview 
    ? allAttachments.filter(a => a.paper_id === selectedPaperForReview.id)
    : [];


  // Check if user has active subscription (simplified check)
  const { data: hasActiveSubscription = false } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_type', 'CLASS_MONTH')
        .eq('status', 'APPROVED')
        .like('ref_id', `%-${currentMonth}`)
        .limit(1);
      if (error) return false;
      return data && data.length > 0;
    },
    enabled: !!user,
  });

  const handleDownloadPdf = async (paper: Paper) => {
    // Guest users must log in to download anything
    if (!user) {
      toast.error('Please log in to download papers');
      return;
    }

    if (!paper.is_free && !hasActiveSubscription) {
      toast.error('This paper requires an active subscription');
      return;
    }

    setDownloadingPdf(paper.id);
    
    try {
      // Increment download count
      await supabase
        .from('papers')
        .update({ download_count: (paper.download_count ?? 0) + 1 })
        .eq('id', paper.id);
      
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        setDownloadingPdf(null);
        return;
      }

      // Call edge function for watermarked PDF
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-pdf-watermark`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pdfUrl: paper.pdf_url }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download PDF');
      }

      // Download the watermarked PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error(error.message || 'Failed to download PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Download attachment PDF with watermark
  const handleDownloadAttachmentPdf = async (attachment: PaperAttachment) => {
    if (!user) {
      toast.error('Please log in to download');
      return;
    }

    setDownloadingAttachment(attachment.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        setDownloadingAttachment(null);
        return;
      }

      // Call edge function for watermarked PDF with access check
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-paper-attachment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            attachmentId: attachment.id,
            pdfUrl: attachment.url 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download PDF');
      }

      // Download the watermarked PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(attachment.title || 'review-material').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading attachment PDF:', error);
      toast.error(error.message || 'Failed to download PDF');
    } finally {
      setDownloadingAttachment(null);
    }
  }

  useEffect(() => {
    if (tabInitialized) return;
    if (!papers || papers.length === 0) return;

    const hasPast = papers.some((p) => p.paper_type === 'PAST_PAPER');
    const hasSchool = papers.some((p) => p.paper_type === 'SCHOOL_EXAM');
    const hasModel = papers.some((p) => p.paper_type === 'MODEL_PAPER');

    if (activeTab === 'PAST_PAPER' && !hasPast) {
      if (hasSchool) setActiveTab('SCHOOL_EXAM');
      else if (hasModel) setActiveTab('MODEL_PAPER');
    }

    setTabInitialized(true);
  }, [activeTab, papers, tabInitialized]);

  // Filter papers by type (guest users only see free papers - handled in displayPapers)
  const filteredPapers = (isGuest ? papers.filter(p => p.is_free) : papers).filter(p => p.paper_type === activeTab);

  // Group papers by year for past papers
  const papersByYear = filteredPapers.reduce((acc, paper) => {
    const key = paper.year || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(paper);
    return acc;
  }, {} as Record<string | number, Paper[]>);

  // Group school exams by grade and term
  const schoolExamsByGrade = filteredPapers.reduce((acc, paper) => {
    if (paper.grade) {
      const key = `Grade ${paper.grade}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(paper);
    }
    return acc;
  }, {} as Record<string, Paper[]>);

  const sortedYears = Object.keys(papersByYear).sort((a, b) => Number(b) - Number(a));
  const sortedGrades = Object.keys(schoolExamsByGrade).sort((a, b) => {
    const gradeA = parseInt(a.replace('Grade ', ''));
    const gradeB = parseInt(b.replace('Grade ', ''));
    return gradeB - gradeA;
  });

  if (isLoading || authLoading) {
    return (
      <PageWrapper isGuest={isGuest}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  // For guest users, only show free papers
  const displayPapers = isGuest ? papers.filter(p => p.is_free) : papers;

  return (
    <PageWrapper isGuest={isGuest}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Past Papers & Resources</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {isGuest ? 'Free papers available - Log in for full access' : 'Download past papers and exam resources'}
            </p>
          </div>
          {isGuest && (
            <Link to="/login">
              <Button>
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="PAST_PAPER">Past Papers</TabsTrigger>
            <TabsTrigger value="SCHOOL_EXAM">School Exams</TabsTrigger>
            <TabsTrigger value="MODEL_PAPER">Model Papers</TabsTrigger>
          </TabsList>

          {/* Past Papers Tab */}
          <TabsContent value="PAST_PAPER" className="mt-6">
            {sortedYears.length === 0 ? (
              <EmptyState message={isGuest ? "No free past papers available. Log in for more!" : "No past papers available yet"} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedYears.map((year) => (
                  <YearCard
                    key={year} 
                    year={year} 
                    papers={papersByYear[year]} 
                    onDownload={handleDownloadPdf}
                    hasAccess={hasActiveSubscription}
                    downloadingId={downloadingPdf}
                    isGuest={isGuest}
                    getAttachmentsCount={getAttachmentsCount}
                    onViewReview={setSelectedPaperForReview}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* School Exams Tab */}
          <TabsContent value="SCHOOL_EXAM" className="mt-6">
            {sortedGrades.length === 0 ? (
              <EmptyState message={isGuest ? "No free school exams available. Log in for more!" : "No school exams available yet"} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedGrades.map((grade) => (
                  <GradeCard
                    key={grade} 
                    grade={grade} 
                    papers={schoolExamsByGrade[grade]} 
                    onDownload={handleDownloadPdf}
                    hasAccess={hasActiveSubscription}
                    downloadingId={downloadingPdf}
                    isGuest={isGuest}
                    getAttachmentsCount={getAttachmentsCount}
                    onViewReview={setSelectedPaperForReview}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Model Papers Tab */}
          <TabsContent value="MODEL_PAPER" className="mt-6">
            {filteredPapers.length === 0 ? (
              <EmptyState message={isGuest ? "No free model papers available. Log in for more!" : "No model papers available yet"} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPapers.map((paper) => (
                  <PaperCard 
                    key={paper.id} 
                    paper={paper} 
                    onDownload={handleDownloadPdf}
                    hasAccess={hasActiveSubscription}
                    downloadingId={downloadingPdf}
                    isGuest={isGuest}
                    attachmentsCount={getAttachmentsCount(paper.id)}
                    onViewReview={setSelectedPaperForReview}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Materials Dialog */}
        <Dialog open={!!selectedPaperForReview} onOpenChange={(open) => !open && setSelectedPaperForReview(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Materials</DialogTitle>
            </DialogHeader>
            {selectedPaperForReview && (
              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedPaperForReview.title}</p>
                
                {selectedPaperAttachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No review materials available for this paper
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPaperAttachments.map((attachment) => (
                      <div key={attachment.id} className="space-y-2">
                        {attachment.attachment_type === 'VIDEO' ? (
                          <div className="space-y-2">
                            <p className="font-medium flex items-center gap-2">
                              <Video className="w-4 h-4 text-primary" />
                              {attachment.title || 'Review Video'}
                            </p>
                            <div onContextMenu={(e) => e.preventDefault()}>
                              <YouTubeEmbed url={attachment.url} />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Video download is disabled
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{attachment.title || 'Review PDF'}</p>
                                <p className="text-xs text-muted-foreground">PDF Document (watermarked)</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadAttachmentPdf(attachment)}
                              disabled={downloadingAttachment === attachment.id}
                            >
                              {downloadingAttachment === attachment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
};

// Page Wrapper - uses StudentLayout for logged in users, minimal layout for guests
const PageWrapper = ({ children, isGuest }: { children: React.ReactNode; isGuest: boolean }) => {
  if (isGuest) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">AL ICT</span>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Button>
            </Link>
          </div>
        </header>
        <main className="container py-6 px-4">{children}</main>
      </div>
    );
  }
  return <StudentLayout>{children}</StudentLayout>;
};

// Year Card Component (for Past Papers)
const YearCard = forwardRef<
  HTMLDivElement,
  {
    year: string | number;
    papers: Paper[];
    onDownload: (paper: Paper) => void;
    hasAccess: boolean;
    downloadingId: string | null;
    isGuest: boolean;
    getAttachmentsCount: (paperId: string) => number;
    onViewReview: (paper: Paper) => void;
  }
>(({ year, papers, onDownload, hasAccess, downloadingId, isGuest, getAttachmentsCount, onViewReview }, ref) => (
  <div ref={ref}>
    <Card className="overflow-hidden">
      <div className="bg-foreground text-background px-4 py-3">
        <h3 className="font-bold text-lg text-center">{year} Past Papers</h3>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {papers.map((paper) => {
            const isDownloading = downloadingId === paper.id;
            const attachmentsCount = getAttachmentsCount(paper.id);
            return (
              <div key={paper.id} className="space-y-2">
                <p className="font-semibold text-sm text-foreground">{paper.title}</p>
                <div className="flex gap-1">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => onDownload(paper)}
                    disabled={(!paper.is_free && !hasAccess) || isDownloading}
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /></>
                    ) : !paper.is_free && !hasAccess ? (
                      <><Lock className="w-4 h-4 mr-1" /> Locked</>
                    ) : (
                      <><Download className="w-4 h-4 mr-1" /> Download</>
                    )}
                  </Button>
                  {attachmentsCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewReview(paper)}
                      title="View review materials"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  </div>
));
YearCard.displayName = 'YearCard';

// Grade Card Component (for School Exams)
const GradeCard = forwardRef<
  HTMLDivElement,
  {
    grade: string;
    papers: Paper[];
    onDownload: (paper: Paper) => void;
    hasAccess: boolean;
    downloadingId: string | null;
    isGuest: boolean;
    getAttachmentsCount: (paperId: string) => number;
    onViewReview: (paper: Paper) => void;
  }
>(({ grade, papers, onDownload, hasAccess, downloadingId, isGuest, getAttachmentsCount, onViewReview }, ref) => {
  // Group by term
  const byTerm = papers.reduce((acc, p) => {
    const term = p.term ? `Term ${p.term}` : 'Other';
    if (!acc[term]) acc[term] = [];
    acc[term].push(p);
    return acc;
  }, {} as Record<string, Paper[]>);

  const getMediumLabel = (medium: string | null) => {
    switch (medium) {
      case 'SINHALA':
        return 'සිංහල';
      case 'ENGLISH':
        return 'English';
      case 'TAMIL':
        return 'தமிழ்';
      default:
        return '';
    }
  };

  return (
    <div ref={ref}>
      <Card className="overflow-hidden">
        <div className="bg-foreground text-background px-4 py-3">
          <h3 className="font-bold text-lg text-center">{grade} School Exams</h3>
        </div>
        <CardContent className="p-4 space-y-4">
          {Object.entries(byTerm).map(([term, termPapers]) => (
            <div key={term}>
              <p className="font-medium text-sm text-muted-foreground mb-2">{term}</p>
              <div className="space-y-2">
                {termPapers.map((paper) => {
                  const isDownloading = downloadingId === paper.id;
                  const attachmentsCount = getAttachmentsCount(paper.id);
                  return (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{paper.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {paper.school_or_zone && <span>{paper.school_or_zone}</span>}
                          {paper.medium && (
                            <span className="text-primary">{getMediumLabel(paper.medium)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {attachmentsCount > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewReview(paper)}
                            title="View review materials"
                          >
                            <Video className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDownload(paper)}
                          disabled={(!paper.is_free && !hasAccess) || isDownloading}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : !paper.is_free && !hasAccess ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
});
GradeCard.displayName = 'GradeCard';

// Single Paper Card
const PaperCard = ({ 
  paper, 
  onDownload, 
  hasAccess,
  downloadingId,
  isGuest,
  attachmentsCount,
  onViewReview
}: { 
  paper: Paper; 
  onDownload: (paper: Paper) => void;
  hasAccess: boolean;
  downloadingId: string | null;
  isGuest: boolean;
  attachmentsCount: number;
  onViewReview: (paper: Paper) => void;
}) => {
  const isDownloading = downloadingId === paper.id;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground truncate">{paper.title}</p>
            {attachmentsCount > 0 && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Video className="w-3 h-3" />
                {attachmentsCount}
              </Badge>
            )}
          </div>
          {paper.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{paper.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button 
              className="flex-1" 
              size="sm"
              onClick={() => onDownload(paper)}
              disabled={(!paper.is_free && !hasAccess) || isDownloading}
            >
              {isDownloading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Downloading...</>
              ) : !paper.is_free && !hasAccess ? (
                <><Lock className="w-4 h-4 mr-2" /> Subscription Required</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Download</>
              )}
            </Button>
            {attachmentsCount > 0 && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => onViewReview(paper)}
              >
                <Video className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Empty State
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

export default Papers;
