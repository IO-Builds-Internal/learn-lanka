import { useState, useEffect } from 'react';
import {
  Monitor, Eye, BookOpen, Award, FileText, ShoppingBag, Code2, Bell, Wand2,
  GraduationCap, LayoutDashboard, Package, MessageCircle, User, GripVertical,
  EyeOff, Ban,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// All sortable nav items (excluding Dashboard which is always first)
const ALL_SORTABLE_ITEMS = [
  { key: 'classes',         label: 'Classes',         icon: BookOpen,    sectionFlag: 'section_classes',         hiddenFlag: 'nav_hidden_classes' },
  { key: 'rank-papers',     label: 'Rank Papers',     icon: Award,       sectionFlag: 'section_rank_papers',     hiddenFlag: 'nav_hidden_rank_papers' },
  { key: 'papers',          label: 'Past Papers',     icon: FileText,    sectionFlag: 'section_papers',          hiddenFlag: 'nav_hidden_papers' },
  { key: 'paper-generator', label: 'Paper Generator', icon: Wand2,       sectionFlag: 'section_paper_generator', hiddenFlag: 'nav_hidden_paper_generator' },
  { key: 'shop',            label: 'Shop',            icon: ShoppingBag, sectionFlag: 'section_shop',            hiddenFlag: 'nav_hidden_shop' },
  { key: 'playground',      label: 'Playground',      icon: Code2,       sectionFlag: 'section_playground',      hiddenFlag: 'nav_hidden_playground' },
];

// Sortable row with two separate toggles
const SortableRow = ({ id, label, Icon, hidden, disabled, onToggleHidden, onToggleDisabled }: {
  id: string;
  label: string;
  Icon: React.ElementType;
  hidden: boolean;     // nav_hidden_* — hides from nav, page still accessible
  disabled: boolean;   // section_* false — totally blocks access
  onToggleHidden: (val: boolean) => void;
  onToggleDisabled: (val: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const isEnabled = !disabled; // section flag is "enabled" = true means page is ON

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-shadow',
        isDragging ? 'shadow-lg border-primary/40 z-10' : 'border-border',
        disabled && 'opacity-60',
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-0.5 shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Icon */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        disabled ? 'bg-destructive/10 text-destructive' : hidden ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Label + status */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-tight', disabled && 'line-through text-muted-foreground')}>{label}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {disabled ? '🚫 Totally disabled — no access' : hidden ? '👁 Hidden from nav — page accessible' : '✅ Visible in nav'}
        </p>
      </div>

      {/* Two toggles */}
      <div className="flex items-center gap-3 shrink-0">
        <TooltipProvider delayDuration={200}>
          {/* Hide from nav toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-0.5">
                <EyeOff className="w-3 h-3 text-muted-foreground" />
                <Switch
                  checked={hidden}
                  onCheckedChange={onToggleHidden}
                  disabled={disabled}
                  className="scale-75 origin-center"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">Hide from Nav</p>
              <p className="text-muted-foreground">Page still accessible via URL</p>
            </TooltipContent>
          </Tooltip>

          {/* Total disable toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-0.5">
                <Ban className="w-3 h-3 text-muted-foreground" />
                <Switch
                  checked={!isEnabled}
                  onCheckedChange={val => onToggleDisabled(!val)}
                  className="scale-75 origin-center data-[state=checked]:bg-destructive"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">Totally Disable</p>
              <p className="text-muted-foreground">Blocks all access, redirects to dashboard</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const AdminSettingsFeatures = () => {
  const queryClient = useQueryClient();

  const [flags, setFlags] = useState<Record<string, boolean>>({
    section_classes: true,
    section_rank_papers: true,
    section_papers: true,
    section_paper_generator: true,
    section_shop: true,
    section_playground: true,
    section_notifications: true,
    nav_hidden_classes: false,
    nav_hidden_rank_papers: false,
    nav_hidden_papers: false,
    nav_hidden_paper_generator: false,
    nav_hidden_shop: false,
    nav_hidden_playground: false,
  });

  const [navOrder, setNavOrder] = useState<string[]>(ALL_SORTABLE_ITEMS.map(i => i.key));

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('site_settings').select('key, value');
      const m: Record<string, string> = {};
      data?.forEach((s: any) => { m[s.key] = s.value; });

      setFlags({
        section_classes: m['section_classes'] !== 'false',
        section_rank_papers: m['section_rank_papers'] !== 'false',
        section_papers: m['section_papers'] !== 'false',
        section_paper_generator: m['section_paper_generator'] !== 'false',
        section_shop: m['section_shop'] !== 'false',
        section_playground: m['section_playground'] !== 'false',
        section_notifications: m['section_notifications'] !== 'false',
        nav_hidden_classes: m['nav_hidden_classes'] === 'true',
        nav_hidden_rank_papers: m['nav_hidden_rank_papers'] === 'true',
        nav_hidden_papers: m['nav_hidden_papers'] === 'true',
        nav_hidden_paper_generator: m['nav_hidden_paper_generator'] === 'true',
        nav_hidden_shop: m['nav_hidden_shop'] === 'true',
        nav_hidden_playground: m['nav_hidden_playground'] === 'true',
      });

      if (m['nav_order']) {
        try {
          const saved = JSON.parse(m['nav_order']) as string[];
          const merged = [
            ...saved.filter(k => ALL_SORTABLE_ITEMS.find(i => i.key === k)),
            ...ALL_SORTABLE_ITEMS.filter(i => !saved.includes(i.key)).map(i => i.key),
          ];
          setNavOrder(merged);
        } catch (_) {}
      }
    })();
  }, []);

  const saveFlag = async (key: string, value: boolean) => {
    try {
      const { error } = await (supabase as any).from('site_settings').upsert(
        { key, value: String(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveOrder = async (order: string[]) => {
    try {
      const { error } = await (supabase as any).from('site_settings').upsert(
        { key: 'nav_order', value: JSON.stringify(order), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Nav order saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleFlag = (key: string, val: boolean) => {
    setFlags(prev => ({ ...prev, [key]: val }));
    saveFlag(key, val);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navOrder.indexOf(active.id as string);
    const newIndex = navOrder.indexOf(over.id as string);
    const newOrder = arrayMove(navOrder, oldIndex, newIndex);
    setNavOrder(newOrder);
    saveOrder(newOrder);
  };

  const orderedItems = navOrder.map(k => ALL_SORTABLE_ITEMS.find(i => i.key === k)!).filter(Boolean);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="w-6 h-6" /> Navigation & Features
          </h1>
          <p className="text-muted-foreground">
            Control section visibility, nav bar ordering, and page access.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5 text-warning" /> <strong>Hide from Nav</strong> — removes from nav bar, but users can still visit the page directly</span>
          <span className="flex items-center gap-1.5"><Ban className="w-3.5 h-3.5 text-destructive" /> <strong>Totally Disable</strong> — blocks page access entirely, redirects to dashboard</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Order + Toggles */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Nav Items — Order & Visibility</CardTitle>
              <CardDescription>
                Drag to reorder · <EyeOff className="w-3 h-3 inline" /> Hide from nav · <Ban className="w-3 h-3 inline" /> Totally disable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Dashboard (fixed) */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                <div className="text-muted-foreground p-0.5 shrink-0">
                  <GripVertical className="w-4 h-4 opacity-30" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Dashboard</p>
                  <p className="text-[11px] text-muted-foreground">Always visible — cannot hide</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 opacity-40">
                  <div className="flex flex-col items-center gap-0.5">
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                    <Switch checked={false} disabled className="scale-75 origin-center" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Ban className="w-3 h-3 text-muted-foreground" />
                    <Switch checked={false} disabled className="scale-75 origin-center" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sortable items */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={navOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {orderedItems.map(item => (
                      <SortableRow
                        key={item.key}
                        id={item.key}
                        label={item.label}
                        Icon={item.icon}
                        hidden={flags[item.hiddenFlag] === true}
                        disabled={flags[item.sectionFlag] === false}
                        onToggleHidden={val => toggleFlag(item.hiddenFlag, val)}
                        onToggleDisabled={val => toggleFlag(item.sectionFlag, val)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Notifications */}
              <Separator />
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
                <div className="p-0.5 text-muted-foreground shrink-0">
                  <GripVertical className="w-4 h-4 opacity-30" />
                </div>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  flags.section_notifications ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}>
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', !flags.section_notifications && 'line-through text-muted-foreground')}>Notifications</p>
                  <p className="text-[11px] text-muted-foreground">Bell icon in top-right bar</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-0.5">
                          <Ban className="w-3 h-3 text-muted-foreground" />
                          <Switch
                            checked={!flags.section_notifications}
                            onCheckedChange={val => toggleFlag('section_notifications', !val)}
                            className="scale-75 origin-center data-[state=checked]:bg-destructive"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Totally Disable</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Live preview */}
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" /> Live Preview — Student Nav
              </CardTitle>
              <CardDescription>Shows nav items that are visible (not hidden, not disabled).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
                {/* Mock header */}
                <div className="flex items-center justify-between px-3 h-11 border-b bg-card gap-2">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                      <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xs text-foreground">Site</span>
                  </div>
                  <div className="flex items-center gap-0.5 overflow-x-auto flex-1 justify-center">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium whitespace-nowrap">
                      <LayoutDashboard className="w-2.5 h-2.5" /> Dashboard
                    </div>
                    {orderedItems
                      .filter(i => flags[i.sectionFlag] !== false && !flags[i.hiddenFlag])
                      .map(item => (
                        <div key={item.key} className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-[10px] font-medium whitespace-nowrap hover:bg-muted">
                          <item.icon className="w-2.5 h-2.5" /> {item.label}
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {flags.section_shop && <div className="w-6 h-6 rounded flex items-center justify-center bg-muted"><Package className="w-3 h-3 text-muted-foreground" /></div>}
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-muted"><MessageCircle className="w-3 h-3 text-muted-foreground" /></div>
                    {flags.section_notifications && (
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-muted relative">
                        <Bell className="w-3 h-3 text-muted-foreground" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive text-[7px] text-destructive-foreground flex items-center justify-center">2</span>
                      </div>
                    )}
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-muted"><User className="w-3 h-3 text-muted-foreground" /></div>
                  </div>
                </div>

                {/* Dashboard quick-access grid */}
                <div className="p-3 bg-muted/20">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Dashboard Quick Access</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {orderedItems.filter(i => flags[i.sectionFlag] !== false && !flags[i.hiddenFlag]).map(item => (
                      <div key={item.key} className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5">
                        <item.icon className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-medium truncate">{item.label}</span>
                      </div>
                    ))}
                    {orderedItems.filter(i => flags[i.sectionFlag] !== false && !flags[i.hiddenFlag]).length === 0 && (
                      <div className="col-span-3 text-center py-2 text-[10px] text-muted-foreground">All sections hidden</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsFeatures;
