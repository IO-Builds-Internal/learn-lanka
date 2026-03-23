import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import StudentPreviewBanner from '@/components/admin/StudentPreviewBanner';
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
  Code2,
  MessageCircle,
  Package
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

const ALL_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, flag: null },
  { path: '/classes', label: 'Classes', icon: BookOpen, flag: 'section_classes' },
  { path: '/rank-papers', label: 'Rank Papers', icon: FileText, flag: 'section_rank_papers' },
  { path: '/paper-generator', label: 'Paper Generator', icon: FileText, flag: null },
  { path: '/shop', label: 'Shop', icon: ShoppingBag, flag: 'section_shop' },
  { path: '/playground', label: 'Playground', icon: Code2, flag: 'section_playground' },
];

const StudentLayout = React.forwardRef<HTMLDivElement, StudentLayoutProps>(({ children }, ref) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isAdmin, isModerator } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || 'ICT Academy';

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!item.flag) return true;
    return (settings as any)?.[item.flag] !== false;
  });

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

  const isStudentPreview = sessionStorage.getItem('admin_student_preview') === 'true';

  return (
    <div ref={ref} className={`min-h-screen bg-background ${isStudentPreview ? 'pt-10' : ''}`}>
      {isStudentPreview && <StudentPreviewBanner />}
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
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* My Orders */}
              {settings?.section_shop !== false && (
                <Link to="/my-orders">
                  <Button variant="ghost" size="icon" className="relative">
                    <Package className="w-5 h-5" />
                  </Button>
                </Link>
              )}

              {/* Contact / Messages */}
              <Link to="/contact">
                <Button variant="ghost" size="icon">
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </Link>

              {/* Notifications */}
              {settings?.section_notifications !== false && (
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
              )}

              {/* Admin Panel Link */}
              {(isAdmin || isModerator) && (
                <Link to="/admin" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary">
                    <Shield className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}

              {/* Profile */}
              <Link to="/profile" className="hidden sm:block">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>

              {/* Mobile Menu Button */}
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card animate-fade-in">
            <nav className="page-container py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t my-2 pt-2">
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
                {settings?.section_shop !== false && (
                  <Link
                    to="/my-orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Package className="w-5 h-5" />
                    My Orders
                  </Link>
                )}
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User className="w-5 h-5" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="page-container py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
});
StudentLayout.displayName = "StudentLayout";

export default StudentLayout;
