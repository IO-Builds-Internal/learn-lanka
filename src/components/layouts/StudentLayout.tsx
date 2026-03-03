import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  ShoppingBag, 
  Bell, 
  User, 
  Menu, 
  X,
  LogOut,
  Shield,
  Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteSettings } from '@/hooks/useSiteSettings';

import * as React from 'react';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/classes', label: 'Classes', icon: BookOpen },
  { path: '/rank-papers', label: 'Rank Papers', icon: FileText },
  { path: '/shop', label: 'Shop', icon: ShoppingBag },
  { path: '/playground', label: 'Playground', icon: Code2 },
];

const StudentLayout = React.forwardRef<HTMLDivElement, StudentLayoutProps>(({ children }, ref) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isAdmin, isModerator } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || 'ICT Academy';

  // Fetch unread notification count
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['unread-notification-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Fetch all visible notifications (RLS filters automatically)
      const { data: allNotifs } = await supabase
        .from('notifications')
        .select('id');

      const allIds = allNotifs?.map(n => n.id) || [];
      if (allIds.length === 0) return 0;

      // Fetch read notification IDs for this user
      const { data: readNotifs } = await supabase
        .from('user_notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);

      const readIds = new Set(readNotifs?.map(r => r.notification_id) || []);

      return allIds.filter(id => !readIds.has(id)).length;
    },
    enabled: !!user,
  });


  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  // Bottom nav items for mobile (5 key items)
  const bottomNavItems = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/classes', label: 'Classes', icon: BookOpen },
    { path: '/rank-papers', label: 'Exams', icon: FileText },
    { path: '/shop', label: 'Shop', icon: ShoppingBag },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="page-container py-0">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary overflow-hidden">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                )}
              </div>
              <span className="font-bold text-base sm:text-lg text-foreground hidden xs:block">{siteName}</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />

              {/* Notifications */}
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Admin Panel Link - desktop only */}
              {(isAdmin || isModerator) && (
                <Link to="/admin" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary">
                    <Shield className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}

              {/* Profile - desktop only */}
              <Link to="/profile" className="hidden md:block">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>

              {/* Mobile overflow menu (admin/logout) */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile slide-down menu for extra items */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card animate-fade-in">
            <nav className="page-container py-3 space-y-0.5">
              {(isAdmin || isModerator) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Shield className="w-5 h-5" />
                  Admin Panel
                </Link>
              )}
              <Link
                to="/playground"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Code2 className="w-5 h-5" />
                Playground
              </Link>
              <Link
                to="/papers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="w-5 h-5" />
                Past Papers
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content - add bottom padding on mobile for bottom nav */}
      <main className="page-container py-4 sm:py-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[56px] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                {item.path === '/profile' && notificationCount > 0 && false /* notifications shown in header */}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
});
StudentLayout.displayName = "StudentLayout";

export default StudentLayout;
