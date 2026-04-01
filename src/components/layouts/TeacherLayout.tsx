import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, BookOpen, Users, CreditCard,
  ChevronLeft, Menu, LogOut, Loader2, FileText, Layers, HelpCircle, Scissors, MessageSquare, Award,
  ShoppingBag, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/teacher/classes', label: 'My Classes', icon: BookOpen },
  { path: '/teacher/enrollments', label: 'Enrollments', icon: Users },
  { path: '/teacher/payments', label: 'Payments', icon: CreditCard },
  { path: '/teacher/papers', label: 'Past Papers', icon: FileText },
  { path: '/teacher/rank-papers', label: 'Rank Papers', icon: Award },
  { path: '/teacher/syllabus', label: 'Syllabus', icon: Layers },
  { path: '/teacher/question-bank', label: 'Question Bank', icon: HelpCircle },
  { path: '/teacher/paper-crop', label: 'Paper Crop', icon: Scissors },
  { path: '/teacher/bulk-sms', label: 'Bulk SMS', icon: MessageSquare },
  { path: '/teacher/shop', label: 'Shop Products', icon: ShoppingBag },
  { path: '/teacher/orders', label: 'Orders', icon: Package },
];

const TeacherLayout = ({ children }: TeacherLayoutProps) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isTeacher, isAdmin, loading, signOut } = useAuth();
  const { data: settings } = useSiteSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isTeacher && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-14' : 'w-56',
      )}>
        <div className={cn(
          'h-14 flex items-center border-b border-sidebar-border flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-3',
        )}>
          {!collapsed && (
            <Link to="/teacher" className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-sidebar-foreground truncate">Teacher Panel</span>
            </Link>
          )}
          <Button
            variant="ghost" size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent flex-shrink-0 w-7 h-7"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map(item => {
            const active = item.path === '/teacher'
              ? location.pathname === '/teacher'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  collapsed && 'justify-center',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5 flex-shrink-0">
          <div className={cn('flex items-center px-2.5 py-1.5', collapsed ? 'justify-center' : 'gap-2.5')}>
            <ThemeToggle />
            {!collapsed && <span className="text-sm text-sidebar-foreground/70">Theme</span>}
          </div>
          <button
            onClick={async () => { await signOut(); }}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive w-full',
              collapsed && 'justify-center',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 h-13 border-b bg-card flex items-center justify-between px-4">
          <Link to="/teacher" className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Teacher Panel</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="fixed left-0 top-0 h-full w-56 bg-sidebar border-r border-sidebar-border flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="h-14 flex items-center px-3 border-b border-sidebar-border">
                <span className="font-bold text-sm text-sidebar-foreground">Teacher Panel</span>
              </div>
              <nav className="flex-1 px-2 py-2 space-y-0.5">
                {navItems.map(item => {
                  const active = item.path === '/teacher'
                    ? location.pathname === '/teacher'
                    : location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                        active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent',
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="px-2 py-2 border-t border-sidebar-border">
                <button
                  onClick={async () => { setMobileMenuOpen(false); await signOut(); }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
