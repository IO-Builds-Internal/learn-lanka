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
  ChevronRight,
  Palette,
  ToggleLeft,
  Phone,
  Landmark,
  FileCode,
  HardDriveDownload,
  HelpCircle,
  Eye,
  CalendarDays,
  ScrollText,
  BookMarked,
  Layers,
  Wallet,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavLeaf {
  type: 'leaf';
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSubGroup {
  type: 'subgroup';
  label: string;
  icon: React.ElementType;
  basePath: string;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavSubGroup;

interface NavGroup {
  label: string;
  entries: NavEntry[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    entries: [
      { type: 'leaf', path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'People',
    entries: [
      { type: 'leaf', path: '/admin/users', label: 'Students', icon: Users },
      { type: 'leaf', path: '/admin/moderators', label: 'Moderators', icon: Shield },
    ],
  },
  {
    label: 'Academics',
    entries: [
      {
        type: 'subgroup',
        label: 'Classes',
        icon: BookOpen,
        basePath: '/admin/classes',
        items: [
          { type: 'leaf', path: '/admin/classes', label: 'All Classes', icon: BookOpen },
          { type: 'leaf', path: '/admin/class-content', label: 'Class Content', icon: CalendarDays },
        ],
      },
      {
        type: 'subgroup',
        label: 'Rank Papers',
        icon: Award,
        basePath: '/admin/rank-papers',
        items: [
          { type: 'leaf', path: '/admin/rank-papers', label: 'All Papers', icon: Award },
          { type: 'leaf', path: '/admin/rank-paper-attempts', label: 'Attempts', icon: ScrollText },
        ],
      },
      { type: 'leaf', path: '/admin/papers', label: 'Past Papers', icon: FileText },
      { type: 'leaf', path: '/admin/syllabus', label: 'Syllabus', icon: BookMarked },
      { type: 'leaf', path: '/admin/question-bank', label: 'Question Bank', icon: HelpCircle },
    ],
  },
  {
    label: 'Finance',
    entries: [
      { type: 'leaf', path: '/admin/payments', label: 'Payments', icon: CreditCard },
      { type: 'leaf', path: '/admin/orders', label: 'Shop Orders', icon: ShoppingBag },
      { type: 'leaf', path: '/admin/answer-access-payments', label: 'Answer Access', icon: KeyRound },
      { type: 'leaf', path: '/admin/coupons', label: 'Coupons', icon: Tag },
      { type: 'leaf', path: '/admin/shop', label: 'Shop Products', icon: Wallet },
    ],
  },
  {
    label: 'Communication',
    entries: [
      { type: 'leaf', path: '/admin/notifications', label: 'Notifications', icon: Bell },
      { type: 'leaf', path: '/admin/bulk-sms', label: 'Bulk SMS', icon: MessageSquare },
      { type: 'leaf', path: '/admin/contact-messages', label: 'Contact Messages', icon: MessageCircle },
    ],
  },
  {
    label: 'System',
    entries: [
      {
        type: 'subgroup',
        label: 'Settings',
        icon: Settings,
        basePath: '/admin/settings',
        items: [
          { type: 'leaf', path: '/admin/settings?tab=branding', label: 'Branding', icon: Palette },
          { type: 'leaf', path: '/admin/settings?tab=features', label: 'Features', icon: ToggleLeft },
          { type: 'leaf', path: '/admin/settings?tab=contact', label: 'Contact Info', icon: Phone },
          { type: 'leaf', path: '/admin/settings?tab=paper-template', label: 'Paper Template', icon: Layers },
          { type: 'leaf', path: '/admin/settings?tab=bank', label: 'Bank Accounts', icon: Landmark },
          { type: 'leaf', path: '/admin/settings?tab=sms', label: 'SMS Templates', icon: FileCode },
          { type: 'leaf', path: '/admin/settings?tab=backup', label: 'Backup & Restore', icon: HardDriveDownload },
        ],
      },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const isLeafActive = (path: string, pathname: string) =>
  path === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(path.split('?')[0]) && path.startsWith('/admin');

const isSubGroupActive = (basePath: string, pathname: string) =>
  pathname === basePath || pathname.startsWith(basePath + '/');

// ─── Collapsed icon row for a group ────────────────────────────────────────

const CollapsedGroupIcons = ({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) => (
  <div className="space-y-0.5">
    {group.entries.map(entry => {
      if (entry.type === 'leaf') {
        const active = isLeafActive(entry.path, pathname);
        return (
          <Link
            key={entry.path}
            to={entry.path}
            onClick={onNavigate}
            title={entry.label}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg mx-auto transition-colors',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <entry.icon className="w-4.5 h-4.5 flex-shrink-0" />
          </Link>
        );
      }
      const active = isSubGroupActive(entry.basePath, pathname);
      const rootItem = entry.items[0];
      return (
        <Link
          key={entry.basePath}
          to={rootItem?.path ?? entry.basePath}
          onClick={onNavigate}
          title={entry.label}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg mx-auto transition-colors',
            active
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <entry.icon className="w-4.5 h-4.5 flex-shrink-0" />
        </Link>
      );
    })}
  </div>
);

// ─── SubGroup row (expandable) ─────────────────────────────────────────────

const SubGroupRow = ({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavSubGroup;
  pathname: string;
  onNavigate?: () => void;
}) => {
  const active = isSubGroupActive(entry.basePath, pathname);
  const [open, setOpen] = useState(active);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
          active
            ? 'text-sidebar-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <entry.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 text-sidebar-foreground/40" />
          : <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />}
      </button>

      {open && (
        <div className="ml-3.5 pl-3 border-l border-sidebar-border/50 mt-0.5 space-y-0.5">
          {entry.items.map(item => {
            const itemActive = isLeafActive(item.path, pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                  itemActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Full expanded group section ───────────────────────────────────────────

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
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="py-1 space-y-0.5">
        <CollapsedGroupIcons group={group} pathname={pathname} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 hover:text-sidebar-foreground/60 transition-colors"
      >
        <span>{group.label}</span>
        {open
          ? <ChevronDown className="w-2.5 h-2.5" />
          : <ChevronRight className="w-2.5 h-2.5" />}
      </button>

      {open && (
        <div className="space-y-0.5">
          {group.entries.map(entry => {
            if (entry.type === 'leaf') {
              const active = isLeafActive(entry.path, pathname);
              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <entry.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{entry.label}</span>
                  {entry.badge && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {entry.badge}
                    </span>
                  )}
                </Link>
              );
            }
            return (
              <SubGroupRow
                key={entry.basePath}
                entry={entry}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main layout ───────────────────────────────────────────────────────────

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, isModerator, loading, signOut } = useAuth();
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

  const sidebarNav = (
    <>
      {navGroups.map(group => (
        <NavGroupSection
          key={group.label}
          group={group}
          collapsed={collapsed}
          pathname={location.pathname}
        />
      ))}
    </>
  );

  const mobileSidebarNav = (
    <>
      {navGroups.map(group => (
        <NavGroupSection
          key={group.label}
          group={group}
          collapsed={false}
          pathname={location.pathname}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — Desktop */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* Logo row */}
        <div className={cn(
          'h-14 flex items-center border-b border-sidebar-border flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-3',
        )}>
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-sidebar-primary overflow-hidden flex-shrink-0">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
                )}
              </div>
              <span className="font-bold text-sm text-sidebar-foreground truncate">{siteName}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent flex-shrink-0 w-7 h-7"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 overflow-y-auto scrollbar-thin">
          {sidebarNav}
        </nav>

        {/* Bottom bar */}
        <div className={cn(
          'px-2 py-2 border-t border-sidebar-border space-y-0.5 flex-shrink-0',
        )}>
          {/* View as Student */}
          <button
            onClick={() => {
              sessionStorage.setItem('admin_student_preview', 'true');
              window.location.href = '/dashboard';
            }}
            title="View as Student"
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full',
              collapsed && 'justify-center',
            )}
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>View as Student</span>}
          </button>

          {/* Theme */}
          <div className={cn('flex items-center px-2.5 py-1.5', collapsed ? 'justify-center' : 'gap-2.5')}>
            <ThemeToggle />
            {!collapsed && <span className="text-sm text-sidebar-foreground/70">Theme</span>}
          </div>

          {/* Sign Out */}
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

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 h-13 border-b bg-card flex items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <span className="font-bold text-sm">{siteName}</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="fixed left-0 top-0 h-full w-56 bg-sidebar border-r border-sidebar-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-14 flex items-center px-3 border-b border-sidebar-border flex-shrink-0">
                <Link
                  to="/admin"
                  className="flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-sidebar-primary overflow-hidden">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-sidebar-foreground">{siteName}</span>
                </Link>
              </div>
              <nav className="flex-1 px-2 overflow-y-auto">
                {mobileSidebarNav}
              </nav>
              <div className="px-2 py-2 border-t border-sidebar-border flex-shrink-0 space-y-0.5">
                <button
                  onClick={() => { setMobileMenuOpen(false); sessionStorage.setItem('admin_student_preview', 'true'); window.location.href = '/dashboard'; }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent w-full"
                >
                  <Eye className="w-4 h-4" />
                  <span>View as Student</span>
                </button>
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

export default AdminLayout;
