import { useState, useEffect, useRef } from 'react';
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
  Globe,
  CheckSquare,
  Search,
  Plus,
  Sparkles,
  Command,
  X,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import TeacherLayout from '@/components/layouts/TeacherLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavLeaf {
  type: 'leaf';
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  keywords?: string; // For global command search
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
      { type: 'leaf', path: '/admin', label: 'Dashboard', icon: LayoutDashboard, keywords: 'overview home stats analytics' },
    ],
  },
  {
    label: 'People',
    entries: [
      { type: 'leaf', path: '/admin/users', label: 'Students', icon: Users, keywords: 'student users members accounts' },
      { type: 'leaf', path: '/admin/teachers', label: 'Teachers', icon: GraduationCap, keywords: 'lecturer instructor staff faculty' },
      { type: 'leaf', path: '/admin/moderators', label: 'Moderators', icon: Shield, keywords: 'admins permissions roles security' },
    ],
  },
  {
    label: 'Academics',
    entries: [
      { type: 'leaf', path: '/admin/subjects', label: 'Subjects', icon: Globe, keywords: 'subject curriculum science math arts' },
      { type: 'leaf', path: '/admin/class-approvals', label: 'Class Approvals', icon: CheckSquare, keywords: 'approve verify classes request' },
      { type: 'leaf', path: '/admin/classes', label: 'Classes', icon: BookOpen, keywords: 'courses scheduling active' },
      {
        type: 'subgroup',
        label: 'Rank Papers',
        icon: Award,
        basePath: '/admin/rank-papers',
        items: [
          { type: 'leaf', path: '/admin/rank-papers', label: 'All Papers', icon: Award, keywords: 'exam ranking online test testpapers' },
          { type: 'leaf', path: '/admin/rank-paper-attempts', label: 'Attempts', icon: ScrollText, keywords: 'submissions results grades marks ranking' },
        ],
      },
      { type: 'leaf', path: '/admin/papers', label: 'Past Papers', icon: FileText, keywords: 'past papers library resource documents' },
      { type: 'leaf', path: '/admin/paper-crop', label: 'Paper Crop Tool', icon: Layers, keywords: 'crop image cutter slice questions editor' },
      { type: 'leaf', path: '/admin/syllabus', label: 'Syllabus', icon: BookMarked, keywords: 'syllabus schedule blueprint education' },
      { type: 'leaf', path: '/admin/question-bank', label: 'Question Bank', icon: HelpCircle, keywords: 'mcq questions pool quizzes tags' },
    ],
  },
  {
    label: 'Finance',
    entries: [
      { type: 'leaf', path: '/admin/payments', label: 'Payments', icon: CreditCard, keywords: 'revenue subscription transaction slips bank approvals' },
      { type: 'leaf', path: '/admin/prices', label: 'Prices', icon: Wallet, keywords: 'fees setup tier packages billing cost' },
      { type: 'leaf', path: '/admin/orders', label: 'Shop Orders', icon: ShoppingBag, keywords: 'deliveries packages items book sells' },
      { type: 'leaf', path: '/admin/coupons', label: 'Coupons', icon: Tag, keywords: 'discounts promo codes vouchers offers' },
      { type: 'leaf', path: '/admin/shop', label: 'Shop Products', icon: Wallet, keywords: 'physical store books items materials sales' },
    ],
  },
  {
    label: 'Communication',
    entries: [
      { type: 'leaf', path: '/admin/notifications', label: 'Notifications', icon: Bell, keywords: 'announcements push broadcast global message alert' },
      { type: 'leaf', path: '/admin/bulk-sms', label: 'Bulk SMS', icon: MessageSquare, keywords: 'text message text.lk broadcast mobile phone alerts' },
      { type: 'leaf', path: '/admin/contact-messages', label: 'Contact Messages', icon: MessageCircle, keywords: 'inbox support feedback queries chats' },
    ],
  },
  {
    label: 'System',
    entries: [
      { type: 'leaf', path: '/admin/otp-logs', label: 'OTP Logs', icon: ScrollText, keywords: 'logs pin codes safety audits logins SMS' },
      { type: 'leaf', path: '/admin/traffic', label: 'Traffic Overview', icon: Globe, keywords: 'traffic downloads visitors analytics ip locations stats geo' },
      {
        type: 'subgroup',
        label: 'Settings',
        icon: Settings,
        basePath: '/admin/settings',
        items: [
          { type: 'leaf', path: '/admin/settings/branding', label: 'Branding', icon: Palette, keywords: 'theme logo images visual colors customizable' },
          { type: 'leaf', path: '/admin/settings/features', label: 'Features', icon: ToggleLeft, keywords: 'modules switches active features controls' },
          { type: 'leaf', path: '/admin/settings/contact', label: 'Contact Info', icon: Phone, keywords: 'support phone email address details location' },
          { type: 'leaf', path: '/admin/settings/paper-template', label: 'Paper Template', icon: Layers, keywords: 'template structures formats styles layout' },
          { type: 'leaf', path: '/admin/settings/bank', label: 'Bank Accounts', icon: Landmark, keywords: 'details accounts transfer card information deposits' },
          { type: 'leaf', path: '/admin/settings/sms', label: 'SMS Templates', icon: FileCode, keywords: 'template sms messages placeholders automated text' },
          { type: 'leaf', path: '/admin/settings/backup', label: 'Backup & Restore', icon: HardDriveDownload, keywords: 'backups database sql export import storage' },
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

// Flattens leaf entries for global search index
const getFlatLeaves = (): NavLeaf[] => {
  const leaves: NavLeaf[] = [];
  navGroups.forEach(group => {
    group.entries.forEach(entry => {
      if (entry.type === 'leaf') {
        leaves.push(entry);
      } else {
        entry.items.forEach(item => {
          leaves.push(item);
        });
      }
    });
  });
  return leaves;
};

// ─── SubGroup row (collapsible accordion) ─────────────────────────────────────────────
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

  useEffect(() => {
    if (active) setOpen(true);
  }, [pathname, active]);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative',
          active
            ? 'text-primary font-semibold bg-primary/5'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {active && (
          <div className="absolute left-0 w-1 h-5 rounded-r bg-primary" />
        )}
        <entry.icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-primary")} />
        <span className="flex-1 text-left">{entry.label}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />}
      </button>

      {open && (
        <div className="ml-3 pl-3.5 border-l border-border/50 space-y-0.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {entry.items.map(item => {
            const itemActive = isLeafActive(item.path, pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  itemActive
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold shadow-sm shadow-primary/5'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5 flex-shrink-0", itemActive && "text-primary")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
              'flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-200 group relative',
              active
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <entry.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
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
            'flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-200 group relative',
            active
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <entry.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
        </Link>
      );
    })}
  </div>
);

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
      <div className="py-2 border-b border-border/20 last:border-b-0 space-y-1">
        <CollapsedGroupIcons group={group} pathname={pathname} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <span>{group.label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 opacity-60" />
          : <ChevronRight className="w-3 h-3 opacity-60" />}
      </button>

      {open && (
        <div className="space-y-0.5 animate-in fade-in duration-200">
          {group.entries.map(entry => {
            if (entry.type === 'leaf') {
              const active = isLeafActive(entry.path, pathname);
              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative',
                    active
                      ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold shadow-sm shadow-primary/5'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active && (
                    <div className="absolute left-0 w-1 h-5 rounded-r bg-primary" />
                  )}
                  <entry.icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-primary")} />
                  <span className="flex-1 truncate">{entry.label}</span>
                  {entry.badge && (
                    <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold shadow-sm">
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
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { isAdmin, isModerator, isTeacher, loading, signOut, user } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || 'Admin';

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuickActionOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus search input when open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Click outside listener for quick actions dropdown
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isTeacher && !isAdmin && !isModerator) {
    return <TeacherLayout>{children}</TeacherLayout>;
  }

  if (!isAdmin && !isModerator && !isTeacher) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter leaves for command search
  const flatLeaves = getFlatLeaves();
  const filteredLeaves = flatLeaves.filter(leaf => {
    const q = searchQuery.toLowerCase();
    return (
      leaf.label.toLowerCase().includes(q) ||
      leaf.path.toLowerCase().includes(q) ||
      (leaf.keywords && leaf.keywords.toLowerCase().includes(q))
    );
  });

  const sidebarNav = (
    <div className="space-y-1.5 py-4">
      {navGroups.map(group => (
        <NavGroupSection
          key={group.label}
          group={group}
          collapsed={collapsed}
          pathname={location.pathname}
        />
      ))}
    </div>
  );

  const mobileSidebarNav = (
    <div className="space-y-1.5 py-4">
      {navGroups.map(group => (
        <NavGroupSection
          key={group.label}
          group={group}
          collapsed={false}
          pathname={location.pathname}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-[#070913] flex text-foreground font-sans selection:bg-primary/20">
      
      {/* ─── Ambient Glowing Background Blur Blobs ─── */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-20 left-20 w-[450px] h-[450px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ─── Sidebar — Desktop ─── */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-card/65 backdrop-blur-md border-r border-border/60 transition-all duration-300 ease-in-out flex-shrink-0 z-20 shadow-xl shadow-muted/5',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Sidebar Logo Header */}
        <div className={cn(
          'h-16 flex items-center border-b border-border/40 flex-shrink-0',
          collapsed ? 'justify-center px-1' : 'justify-between px-4',
        )}>
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2.5 min-w-0 transition-transform active:scale-95">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                ) : (
                  <img src="/logo.png" alt={siteName} className="w-full h-full object-cover" />
                )}
              </div>
              <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                {siteName}
              </span>
            </Link>
          )}

          {collapsed && (
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-violet-500 shadow-md shadow-primary/20 overflow-hidden flex-shrink-0">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:bg-muted w-7 h-7 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin space-y-1">
          {sidebarNav}
        </nav>

        {/* Sidebar Footer Operations */}
        <div className="p-3 border-t border-border/40 space-y-1 flex-shrink-0 bg-card/40">
          
          {/* Collapse toggle (only visible when sidebar is collapsed) */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand Sidebar"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted text-muted-foreground mx-auto mb-1 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* View as Student */}
          <button
            onClick={() => {
              sessionStorage.setItem('admin_student_preview', 'true');
              window.location.href = '/dashboard';
            }}
            title="View as Student"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground w-full group relative',
              collapsed && 'justify-center w-10 h-10 mx-auto p-0',
            )}
          >
            <Eye className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="truncate">View as Student</span>}
          </button>

          {/* Theme Switcher Toggle */}
          <div className={cn('flex items-center', collapsed ? 'justify-center py-1.5' : 'gap-2.5 px-3 py-2.5')}>
            <ThemeToggle />
            {!collapsed && <span className="text-sm text-muted-foreground">Theme Mode</span>}
          </div>

          {/* Logout Action */}
          <button
            onClick={async () => { await signOut(); }}
            title="Sign Out"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full group',
              collapsed && 'justify-center w-10 h-10 mx-auto p-0',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content Shell Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* ─── Premium Glass Header Navigation ─── */}
        <header className="sticky top-0 z-30 h-16 bg-card/65 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-4 sm:px-6 shadow-sm shadow-muted/2">
          
          {/* Top Header - Left Part (Mobile toggle, Desktop path indicators) */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-foreground w-9 h-9 rounded-xl hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Desktop Dashboard path indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">Admin Panel</span>
              <span className="opacity-40">/</span>
              <span className="capitalize">{location.pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}</span>
            </div>
          </div>

          {/* Top Header - Right Part (Command Search, Actions, Profile Card) */}
          <div className="flex items-center gap-3">
            
            {/* Global command search activator button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border/60 hover:border-border px-3 py-2 rounded-xl text-xs text-muted-foreground transition-all w-32 sm:w-48 text-left"
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
              <span className="flex-1 truncate">Search...</span>
              <div className="hidden md:flex items-center gap-0.5 bg-background border border-border/80 px-1.5 py-0.5 rounded-lg text-[9px] font-mono opacity-80">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>

            {/* Quick Actions Dropdown container */}
            <div className="relative" ref={quickActionsRef}>
              <Button
                onClick={() => setQuickActionOpen(!quickActionOpen)}
                className="gap-1.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 text-white font-medium text-xs px-3 py-2 h-9 rounded-xl shadow-md shadow-primary/10 transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Action</span>
              </Button>

              {/* Actions Dropdown Card */}
              {quickActionOpen && (
                <div className="absolute right-0 mt-2.5 w-60 bg-card border border-border/80 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest border-b border-border/40 mb-1">
                    Quick Shortcuts
                  </div>
                  <div className="space-y-0.5">
                    <Link
                      to="/admin/classes"
                      onClick={() => setQuickActionOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>Create New Class</span>
                    </Link>
                    <Link
                      to="/admin/papers"
                      onClick={() => setQuickActionOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Add Past Paper</span>
                    </Link>
                    <Link
                      to="/admin/bulk-sms"
                      onClick={() => setQuickActionOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                      <span>Send Bulk SMS Alert</span>
                    </Link>
                    <Link
                      to="/admin/payments"
                      onClick={() => setQuickActionOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                      <span>Approve Payments</span>
                    </Link>
                    <Link
                      to="/admin/settings/branding"
                      onClick={() => setQuickActionOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-muted text-foreground transition-all"
                    >
                      <Palette className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Customize Branding</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Theme Switcher */}
            <div className="hidden sm:block border-l border-border/50 pl-2">
              <ThemeToggle />
            </div>

            {/* Profile Avatar Widget */}
            <div className="flex items-center gap-2 border-l border-border/50 pl-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-primary/10 to-violet-500/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shadow-sm">
                A
              </div>
              <div className="hidden lg:flex flex-col text-left min-w-0">
                <span className="text-xs font-semibold leading-tight truncate">Administrator</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@alstudent.lk'}</span>
              </div>
            </div>

          </div>
        </header>

        {/* ─── Command Search Dialog Overlay (Ctrl + K) ─── */}
        {searchOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#020308]/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[420px] animate-in slide-in-from-top-4 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type a page, section or action keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60 w-full focus:ring-0"
                />
                <kbd className="hidden sm:flex items-center gap-0.5 bg-muted border border-border px-1.5 py-0.5 rounded-lg text-[9px] font-mono text-muted-foreground">
                  <span>ESC</span>
                </kbd>
                <button onClick={() => setSearchOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Matching Search Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
                {filteredLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Sparkles className="w-6 h-6 mb-2 text-primary opacity-50 animate-pulse" />
                    <p className="text-xs">No matching admin pages found</p>
                  </div>
                ) : (
                  filteredLeaves.map(leaf => (
                    <Link
                      key={leaf.path}
                      to={leaf.path}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-150 group"
                    >
                      <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <leaf.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{leaf.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{leaf.path}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                    </Link>
                  ))
                )}
              </div>

              {/* Search Footer info */}
              <div className="px-4 py-2 border-t border-border/40 bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Navigate instantly across 27+ administrative pages</span>
                <span className="flex items-center gap-0.5"><Command className="w-2.5 h-2.5" /> + K to trigger</span>
              </div>

            </div>
          </div>
        )}

        {/* ─── Mobile sidebar drawer menu ─── */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-[#020308]/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Mobile Drawer header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
                <Link
                  to="/admin"
                  className="flex items-center gap-2.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center justify-center w-7.5 h-7.5 rounded-xl overflow-hidden">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt={siteName} className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo.png" alt={siteName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-sidebar-foreground tracking-wide">{siteName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted text-sidebar-foreground/75"
                >
                  <X className="w-4.5 h-4.5" />
                </Button>
              </div>

              {/* Mobile Drawer Navigation list */}
              <nav className="flex-1 px-3 overflow-y-auto scrollbar-none space-y-1">
                {mobileSidebarNav}
              </nav>

              {/* Mobile Drawer operations footer */}
              <div className="p-3 border-t border-sidebar-border flex-shrink-0 bg-sidebar-accent/10 space-y-1">
                <button
                  onClick={() => { setMobileMenuOpen(false); sessionStorage.setItem('admin_student_preview', 'true'); window.location.href = '/dashboard'; }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent w-full"
                >
                  <Eye className="w-4 h-4" />
                  <span>View as Student</span>
                </button>
                <button
                  onClick={async () => { setMobileMenuOpen(false); await signOut(); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/75 hover:bg-destructive/10 hover:text-destructive w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Main Admin content mount area ─── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto z-10 relative">
          <div className="page-container max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
