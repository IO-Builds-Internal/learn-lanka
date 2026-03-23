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
  Database,
  Palette,
  ToggleLeft,
  Phone,
  Landmark,
  FileCode,
  HardDriveDownload,
  HelpCircle,
  Code2,
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
}

interface NavSubGroup {
  type: 'subgroup';
  label: string;
  icon: React.ElementType;
  /** prefix used to detect if any child is active */
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
      { type: 'leaf', path: '/admin/users', label: 'Users', icon: Users },
      { type: 'leaf', path: '/admin/moderators', label: 'Moderators', icon: Shield },
    ],
  },
  {
    label: 'Academics',
    entries: [
      { type: 'leaf', path: '/admin/classes', label: 'Classes', icon: BookOpen },
      {
        type: 'subgroup',
        label: 'Rank Papers',
        icon: Award,
        basePath: '/admin/rank-papers',
        items: [
          { type: 'leaf', path: '/admin/rank-papers', label: 'All Papers', icon: Award },
        ],
      },
      { type: 'leaf', path: '/admin/papers', label: 'Past Papers', icon: FileText },
      { type: 'leaf', path: '/admin/syllabus', label: 'Syllabus', icon: GraduationCap },
      { type: 'leaf', path: '/admin/question-bank', label: 'Question Bank', icon: HelpCircle },
    ],
  },
  {
    label: 'Finance',
    entries: [
      { type: 'leaf', path: '/admin/payments', label: 'Payments', icon: CreditCard },
      { type: 'leaf', path: '/admin/answer-access-payments', label: 'Answer Access Payments', icon: FileText },
      { type: 'leaf', path: '/admin/coupons', label: 'Coupons', icon: Tag },
      { type: 'leaf', path: '/admin/shop', label: 'Shop', icon: ShoppingBag },
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
          { type: 'leaf', path: '/admin/settings?tab=features', label: 'Features & Sections', icon: ToggleLeft },
          { type: 'leaf', path: '/admin/settings?tab=contact', label: 'Contact Info', icon: Phone },
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
  <div className="space-y-1">
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
              'flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <entry.icon className="w-5 h-5 flex-shrink-0" />
          </Link>
        );
      }
      // subgroup — show icon for the group root
      const active = isSubGroupActive(entry.basePath, pathname);
      const rootItem = entry.items[0];
      return (
        <Link
          key={entry.basePath}
          to={rootItem?.path ?? entry.basePath}
          onClick={onNavigate}
          title={entry.label}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
            active
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <entry.icon className="w-5 h-5 flex-shrink-0" />
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
      {/* Sub-group header button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'text-sidebar-foreground bg-sidebar-accent/60'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <entry.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/50" />
          : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground/50" />}
      </button>

      {/* Children — indented */}
      {open && (
        <div className="ml-4 pl-3 border-l border-sidebar-border/60 mt-0.5 space-y-0.5">
          {entry.items.map(item => {
            const itemActive = isLeafActive(item.path, pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  itemActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
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
  const isAnyActive = group.entries.some(e =>
    e.type === 'leaf'
      ? isLeafActive(e.path, pathname)
      : isSubGroupActive(e.basePath, pathname),
  );
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return <CollapsedGroupIcons group={group} pathname={pathname} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-0.5">
      {/* Group label with toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
      >
        <span>{group.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3" />
          : <ChevronRight className="w-3 h-3" />}
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <entry.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{entry.label}</span>
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
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo row */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border flex-shrink-0">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary overflow-hidden flex-shrink-0">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
                )}
              </div>
              <span className="font-bold text-sidebar-foreground truncate">{siteName}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
          {sidebarNav}
        </nav>

        {/* Bottom bar */}
        <div className="p-2 border-t border-sidebar-border space-y-1 flex-shrink-0">
          <div className={cn('flex items-center px-3 py-1', collapsed ? 'justify-center' : 'gap-3')}>
            <ThemeToggle />
            {!collapsed && <span className="text-sm text-sidebar-foreground">Theme</span>}
          </div>
          <button
            onClick={async () => { await signOut(); }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full',
              collapsed && 'justify-center',
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
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

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-14 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
                <Link
                  to="/admin"
                  className="flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
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
              <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
                {mobileSidebarNav}
              </nav>
              <div className="p-2 border-t border-sidebar-border flex-shrink-0">
                <button
                  onClick={async () => { setMobileMenuOpen(false); await signOut(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
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
