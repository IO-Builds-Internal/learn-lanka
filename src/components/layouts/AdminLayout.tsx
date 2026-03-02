import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  FileText, 
  Bell, 
  Settings, 
  ChevronLeft,
  Menu,
  LogOut,
  Tag,
  ShoppingBag,
  Award,
  Shield,
  Loader2,
  MessageSquare,
  MessageCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/moderators', label: 'Moderators', icon: Shield },
    ],
  },
  {
    label: 'Academics',
    items: [
      { path: '/admin/classes', label: 'Classes', icon: BookOpen },
      { path: '/admin/rank-papers', label: 'Rank Papers', icon: Award },
      { path: '/admin/papers', label: 'Papers', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/admin/payments', label: 'Payments', icon: CreditCard },
      { path: '/admin/coupons', label: 'Coupons', icon: Tag },
      { path: '/admin/shop', label: 'Shop', icon: ShoppingBag },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/admin/notifications', label: 'Notifications', icon: Bell },
      { path: '/admin/bulk-sms', label: 'Bulk SMS', icon: MessageSquare },
      { path: '/admin/contact-messages', label: 'Contact Messages', icon: MessageCircle },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// All items flat for mobile / active detection
const allNavItems = navGroups.flatMap(g => g.items);

const NavGroupSection = ({
  group,
  collapsed,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) => {
  const isAnyActive = group.items.some(
    item => pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
  );
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map(item => {
          const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
      >
        <span>{group.label}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {open && (
        <div className="space-y-0.5">
          {group.items.map(item => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, isModerator, loading } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || 'Admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary overflow-hidden">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
                )}
              </div>
              <span className="font-bold text-sidebar-foreground">{siteName}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {navGroups.map(group => (
            <NavGroupSection
              key={group.label}
              group={group}
              collapsed={collapsed}
              pathname={location.pathname}
            />
          ))}
        </nav>

        {/* Theme Toggle & Logout */}
        <div className="p-2 border-t border-sidebar-border space-y-1 flex-shrink-0">
          <div className={cn("flex items-center px-3 py-1", collapsed ? "justify-center" : "gap-3")}>
            <ThemeToggle />
            {!collapsed && <span className="text-sm text-sidebar-foreground">Theme</span>}
          </div>
          <Link
            to="/login"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-40 h-14 border-b bg-card flex items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <span className="font-bold">{siteName}</span>
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
            <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="h-14 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
                <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary overflow-hidden">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
                    )}
                  </div>
                  <span className="font-bold text-sidebar-foreground">{siteName}</span>
                </Link>
              </div>
              <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
                {navGroups.map(group => (
                  <NavGroupSection
                    key={group.label}
                    group={group}
                    collapsed={false}
                    pathname={location.pathname}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>
              <div className="p-2 border-t border-sidebar-border flex-shrink-0">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
