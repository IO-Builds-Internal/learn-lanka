import { useState, useEffect } from 'react';
import {
  Monitor, Eye, BookOpen, Award, FileText, ShoppingBag, Code2, Bell, Wand2,
  GraduationCap, LayoutDashboard, Package, MessageCircle, User, GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  { key: 'classes',        label: 'Classes',         icon: BookOpen,   flag: 'section_classes' },
  { key: 'rank-papers',    label: 'Rank Papers',      icon: Award,      flag: 'section_rank_papers' },
  { key: 'papers',         label: 'Past Papers',      icon: FileText,   flag: 'section_papers' },
  { key: 'paper-generator',label: 'Paper Generator',  icon: Wand2,      flag: 'section_paper_generator' },
  { key: 'shop',           label: 'Shop',             icon: ShoppingBag,flag: 'section_shop' },
  { key: 'playground',     label: 'Playground',       icon: Code2,      flag: 'section_playground' },
];

// Sortable row component
const SortableRow = ({ id, label, Icon, enabled, onToggle }: {
  id: string; label: string; Icon: React.ElementType; enabled: boolean; onToggle: (val: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border bg-card transition-shadow',
        isDragging ? 'shadow-lg border-primary/40 z-10' : 'border-border'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-0.5"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', !enabled && 'text-muted-foreground line-through')}>{label}</p>
        <p className="text-xs text-muted-foreground">{enabled ? 'Visible in nav' : 'Hidden'}</p>
      </div>

      {/* Toggle */}
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
};

const AdminSettingsFeatures = () => {
  const queryClient = useQueryClient();

  // Feature flags state
  const [flags, setFlags] = useState<Record<string, boolean>>({
    section_classes: true,
    section_rank_papers: true,
    section_papers: true,
    section_paper_generator: true,
    section_shop: true,
    section_playground: true,
    section_notifications: true,
  });

  // Nav order state (array of item keys)
  const [navOrder, setNavOrder] = useState<string[]>(ALL_SORTABLE_ITEMS.map(i => i.key));

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('site_settings').select('key, value');
      const m: Record<string, string> = {};
      data?.forEach((s: any) => { m[s.key] = s.value; });

      const flag = (k: string) => m[k] !== 'false';
      setFlags({
        section_classes: flag('section_classes'),
        section_rank_papers: flag('section_rank_papers'),
        section_papers: flag('section_papers'),
        section_paper_generator: flag('section_paper_generator'),
        section_shop: flag('section_shop'),
        section_playground: flag('section_playground'),
        section_notifications: flag('section_notifications'),
      });

      // Load nav order
      if (m['nav_order']) {
        try {
          const saved = JSON.parse(m['nav_order']) as string[];
          // Merge: keep saved order but add any new items not in saved
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

  // DnD sensors
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

  // Ordered items for preview
  const orderedItems = navOrder.map(k => ALL_SORTABLE_ITEMS.find(i => i.key === k)!).filter(Boolean);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="w-6 h-6" /> Navigation & Features
          </h1>
          <p className="text-muted-foreground">
            Control which sections are visible and in what order they appear in the student navigation bar.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Order + Toggle combined */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Nav Items — Order & Visibility</CardTitle>
              <CardDescription>
                Drag to reorder · Toggle to show/hide · Dashboard is always first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Dashboard (fixed, not draggable) */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-muted/30">
                <div className="text-muted-foreground p-0.5">
                  <GripVertical className="w-4 h-4 opacity-30" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Dashboard</p>
                  <p className="text-xs text-muted-foreground">Always visible — cannot hide</p>
                </div>
                <Switch checked={true} disabled />
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
                        enabled={flags[item.flag] !== false}
                        onToggle={val => toggleFlag(item.flag, val)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Notifications (icon-only, not in main nav) */}
              <Separator />
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-card">
                <div className="p-0.5 text-muted-foreground">
                  <GripVertical className="w-4 h-4 opacity-30" />
                </div>
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  flags.section_notifications ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', !flags.section_notifications && 'text-muted-foreground line-through')}>Notifications</p>
                  <p className="text-xs text-muted-foreground">Bell icon in top-right bar</p>
                </div>
                <Switch
                  checked={flags.section_notifications}
                  onCheckedChange={val => toggleFlag('section_notifications', val)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right: Live preview */}
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" /> Live Preview — Student Nav
              </CardTitle>
              <CardDescription>Updates as you toggle and reorder.</CardDescription>
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
                    {/* Dashboard always first */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium whitespace-nowrap">
                      <LayoutDashboard className="w-2.5 h-2.5" /> Dashboard
                    </div>
                    {orderedItems.filter(i => flags[i.flag] !== false).map(item => (
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
                    {orderedItems.filter(i => flags[i.flag] !== false).map(item => (
                      <div key={item.key} className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5">
                        <item.icon className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-medium truncate">{item.label}</span>
                      </div>
                    ))}
                    {orderedItems.filter(i => flags[i.flag] !== false).length === 0 && (
                      <div className="col-span-3 text-center py-2 text-[10px] text-muted-foreground">All sections hidden</div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" /> Drag the grip handle to reorder · Toggle to show or hide each item.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsFeatures;
