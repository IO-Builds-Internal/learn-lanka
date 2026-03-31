import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import {
  Monitor, Calculator, Atom, FlaskConical, Leaf, Receipt, TrendingUp, Briefcase,
  Scale, Languages, BookText, Globe, Landmark, Palette, Music, Brain, Sprout, Home,
  GraduationCap, Search, BookOpen, FileText, ArrowRight, LogIn, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

const ICON_MAP: Record<string, React.ElementType> = {
  Monitor, Calculator, Atom, FlaskConical, Leaf, Receipt, TrendingUp, Briefcase,
  Scale, Languages, BookText, Globe, Landmark, Palette, Music, Brain, Sprout, Home,
  BookOpen, GraduationCap,
};

const HomePage = () => {
  const { user, isAdmin, isModerator, isTeacher } = useAuth();
  const { data: settings } = useSiteSettings();
  const [search, setSearch] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  const filteredSubjects = subjects.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="AL Student" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <span className="font-bold text-lg text-foreground">AL Student</span>
                <span className="text-xs text-muted-foreground block -mt-1">Sri Lanka's #1 A/L Platform</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Link to={getDashboardLink()}>
                  <Button size="sm" className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Register</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative page-container py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            All A/L Subjects in One Place
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
            Your Gateway to
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> A/L Success</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Access past papers, expert classes, rank papers, and study materials for every Advanced Level subject — all in one platform.
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl bg-card border-border shadow-sm"
            />
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/papers">
              <Button variant="outline" className="gap-2 rounded-full">
                <FileText className="w-4 h-4" />
                Past Papers Library
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="gap-2 rounded-full">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="page-container pb-16">
        <h2 className="text-2xl font-bold text-foreground mb-2">Browse by Subject</h2>
        <p className="text-muted-foreground mb-8">Select a subject to explore classes, papers, and resources</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredSubjects.map((subject: any) => {
            const Icon = ICON_MAP[subject.icon_name] || BookOpen;
            return (
              <Link
                key={subject.id}
                to={`/${subject.slug}`}
                className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200 text-center"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${subject.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: subject.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {subject.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-primary transition-all absolute top-3 right-3 group-hover:opacity-100 opacity-0" />
              </Link>
            );
          })}
        </div>

        {filteredSubjects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No subjects found matching "{search}"
          </div>
        )}
      </section>

      {/* Our Teachers Section */}
      <TeachersSection />

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="page-container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">AL Student</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <Link to="/papers" className="hover:text-primary transition-colors">Past Papers</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} AL Student. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
