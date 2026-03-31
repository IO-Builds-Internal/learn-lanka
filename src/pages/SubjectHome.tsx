import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import {
  Monitor, Calculator, Atom, FlaskConical, Leaf, Receipt, TrendingUp, Briefcase,
  Scale, Languages, BookText, Globe, Landmark, Palette, Music, Brain, Sprout, Home,
  GraduationCap, BookOpen, FileText, Users, Award, ArrowLeft, LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2 } from 'lucide-react';
import { SUBJECT_FALLBACK_IMAGES } from '@/lib/subjectImages';

const ICON_MAP: Record<string, React.ElementType> = {
  Monitor, Calculator, Atom, FlaskConical, Leaf, Receipt, TrendingUp, Briefcase,
  Scale, Languages, BookText, Globe, Landmark, Palette, Music, Brain, Sprout, Home,
  BookOpen, GraduationCap,
};

const SubjectHome = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin, isModerator, isTeacher } = useAuth();

  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      return data;
    },
  });

  // Get counts for this subject
  const { data: stats } = useQuery({
    queryKey: ['subject-stats', subject?.id],
    queryFn: async () => {
      if (!subject) return { classes: 0, papers: 0, rankPapers: 0 };
      const [classesRes, papersRes, rankRes] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('subject_id', subject.id).eq('approval_status', 'APPROVED'),
        supabase.from('papers').select('id', { count: 'exact', head: true }).eq('subject_id', subject.id),
        supabase.from('rank_papers').select('id', { count: 'exact', head: true }).eq('subject_id', subject.id).eq('publish_status', 'PUBLISHED'),
      ]);
      return {
        classes: classesRes.count || 0,
        papers: papersRes.count || 0,
        rankPapers: rankRes.count || 0,
      };
    },
    enabled: !!subject,
  });

  // Get available papers for this subject
  const { data: papers = [] } = useQuery({
    queryKey: ['subject-papers', subject?.id],
    queryFn: async () => {
      if (!subject) return [];
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('subject_id', subject.id)
        .order('year', { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!subject,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return <Navigate to="/" replace />;
  }

  // Show "Coming Soon" if subject is disabled
  if (!subject.is_active) {
    const SubIcon = ICON_MAP[subject.icon_name] || BookOpen;
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="page-container py-0">
            <div className="flex h-14 items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
                <GraduationCap className="w-6 h-6 text-primary" />
                <span className="font-bold text-foreground">AL Student</span>
              </Link>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${subject.color}20` }}>
              <SubIcon className="w-10 h-10" style={{ color: subject.color }} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{subject.name}</h1>
            <p className="text-lg text-muted-foreground mb-6">Coming Soon!</p>
            <p className="text-sm text-muted-foreground mb-8">We're working hard to bring you the best {subject.name} content. Check back soon!</p>
            <Link to="/"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Home</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const Icon = ICON_MAP[subject.icon_name] || BookOpen;
  const getDashboardLink = () => {
    if (isAdmin || isModerator) return '/admin';
    if (isTeacher) return '/teacher';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="page-container py-0">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link to="/" className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                <span className="font-bold text-foreground">AL Student</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Link to={getDashboardLink()}>
                  <Button size="sm" variant="outline">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b relative overflow-hidden" style={{ backgroundColor: `${subject.color}08` }}>
        {(subject.image_url || SUBJECT_FALLBACK_IMAGES[subject.slug]) && (
          <div className="absolute inset-0">
            <img src={subject.image_url || SUBJECT_FALLBACK_IMAGES[subject.slug]} alt="" className="w-full h-full object-cover opacity-10" />
          </div>
        )}
        <div className="relative page-container py-10 sm:py-16">
          <div className="flex items-center gap-4 mb-4">
            {(subject.image_url || SUBJECT_FALLBACK_IMAGES[subject.slug]) ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border">
                <img src={subject.image_url || SUBJECT_FALLBACK_IMAGES[subject.slug]} alt={subject.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${subject.color}20` }}
              >
                <Icon className="w-8 h-8" style={{ color: subject.color }} />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground">{subject.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{subject.description}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats?.classes || 0}</span>
              <span className="text-muted-foreground">Classes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats?.papers || 0}</span>
              <span className="text-muted-foreground">Past Papers</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats?.rankPapers || 0}</span>
              <span className="text-muted-foreground">Rank Papers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="page-container py-8 space-y-8">
        {/* Past Papers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Past Papers</h2>
            <Link to={`/papers?subject=${slug}`}>
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>
          {papers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((paper: any) => (
                <Card key={paper.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{paper.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {paper.year && <span>{paper.year}</span>}
                      {paper.grade && <span>• Grade {paper.grade}</span>}
                      {paper.medium && <span>• {paper.medium}</span>}
                    </div>
                    {paper.is_free && (
                      <span className="inline-block mt-2 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                        Free
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No past papers available yet for {subject.name}.</p>
          )}
        </div>

        {/* CTA */}
        {!user && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-8 text-center">
              <h3 className="text-lg font-bold text-foreground mb-2">Ready to start learning?</h3>
              <p className="text-muted-foreground mb-4">Create an account to access classes, rank papers, and more.</p>
              <div className="flex justify-center gap-3">
                <Link to="/register"><Button>Create Account</Button></Link>
                <Link to="/login"><Button variant="outline">Sign In</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-12">
        <div className="page-container py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AL Student. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default SubjectHome;
