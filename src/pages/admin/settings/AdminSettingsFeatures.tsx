import { useState, useEffect } from 'react';
import {
  Monitor, Eye, BookOpen, Award, FileText, ShoppingBag, Code2, Bell, Wand2,
  GraduationCap, LayoutDashboard, Package, MessageCircle, User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AdminSettingsFeatures = () => {
  const queryClient = useQueryClient();
  const [sectionClasses, setSectionClasses] = useState(true);
  const [sectionRankPapers, setSectionRankPapers] = useState(true);
  const [sectionPapers, setSectionPapers] = useState(true);
  const [sectionShop, setSectionShop] = useState(true);
  const [sectionPlayground, setSectionPlayground] = useState(true);
  const [sectionNotifications, setSectionNotifications] = useState(true);
  const [sectionPaperGenerator, setSectionPaperGenerator] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('site_settings').select('key, value');
      const m: Record<string, string> = {};
      data?.forEach((s: any) => { m[s.key] = s.value; });
      const flag = (k: string) => m[k] !== 'false';
      setSectionClasses(flag('section_classes'));
      setSectionRankPapers(flag('section_rank_papers'));
      setSectionPapers(flag('section_papers'));
      setSectionShop(flag('section_shop'));
      setSectionPlayground(flag('section_playground'));
      setSectionNotifications(flag('section_notifications'));
      setSectionPaperGenerator(flag('section_paper_generator'));
    })();
  }, []);

  const save = async (key: string, value: boolean) => {
    try {
      const { error } = await (supabase as any).from('site_settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) { toast.error(err.message); }
  };

  const sections = [
    { label: 'Classes', desc: 'Class listings and enrollments', state: sectionClasses, set: setSectionClasses, key: 'section_classes', icon: BookOpen },
    { label: 'Rank Papers', desc: 'Quizzes and rank paper attempts', state: sectionRankPapers, set: setSectionRankPapers, key: 'section_rank_papers', icon: Award },
    { label: 'Past Papers', desc: 'Past paper downloads library', state: sectionPapers, set: setSectionPapers, key: 'section_papers', icon: FileText },
    { label: 'Paper Generator', desc: 'Custom paper generation tool', state: sectionPaperGenerator, set: setSectionPaperGenerator, key: 'section_paper_generator', icon: Wand2 },
    { label: 'Shop', desc: 'Materials shop for students', state: sectionShop, set: setSectionShop, key: 'section_shop', icon: ShoppingBag },
    { label: 'Playground', desc: 'ICT code playground', state: sectionPlayground, set: setSectionPlayground, key: 'section_playground', icon: Code2 },
    { label: 'Notifications', desc: 'In-app notification bell', state: sectionNotifications, set: setSectionNotifications, key: 'section_notifications', icon: Bell },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Monitor className="w-6 h-6" /> Navigation & Features</h1>
          <p className="text-muted-foreground">Toggle which sections are visible to students</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Toggles */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Section Visibility</CardTitle>
              <CardDescription>Changes apply instantly for all students.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {sections.map(({ label, desc, state, set, key, icon: Icon }, i, arr) => (
                <div key={key}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${state ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <Label className={state ? '' : 'text-muted-foreground line-through'}>{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch checked={state} onCheckedChange={val => { set(val); save(key, val); }} />
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live Nav Preview */}
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Live Preview — Student Nav</CardTitle>
              <CardDescription>Real-time preview of how the student navigation will appear.</CardDescription>
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
                  <div className="flex items-center gap-1 overflow-x-auto flex-1 justify-center">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium whitespace-nowrap">
                      <LayoutDashboard className="w-2.5 h-2.5" /> Dashboard
                    </div>
                    {sectionClasses && <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-[10px] font-medium whitespace-nowrap hover:bg-muted"><BookOpen className="w-2.5 h-2.5" /> Classes</div>}
                    {sectionRankPapers && <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-[10px] font-medium whitespace-nowrap hover:bg-muted"><Award className="w-2.5 h-2.5" /> Rank Papers</div>}
                    {sectionShop && <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-[10px] font-medium whitespace-nowrap hover:bg-muted"><ShoppingBag className="w-2.5 h-2.5" /> Shop</div>}
                    {sectionPlayground && <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-[10px] font-medium whitespace-nowrap hover:bg-muted"><Code2 className="w-2.5 h-2.5" /> Playground</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {sectionShop && <div className="w-6 h-6 rounded flex items-center justify-center bg-muted"><Package className="w-3 h-3 text-muted-foreground" /></div>}
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-muted"><MessageCircle className="w-3 h-3 text-muted-foreground" /></div>
                    {sectionNotifications && (
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
                    {sectionClasses && <div className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-primary" /><span className="text-[9px] font-medium">Classes</span></div>}
                    {sectionRankPapers && <div className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5"><Award className="w-3 h-3 text-primary" /><span className="text-[9px] font-medium">Rank Papers</span></div>}
                    {sectionPapers && <div className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5"><FileText className="w-3 h-3 text-primary" /><span className="text-[9px] font-medium">Past Papers</span></div>}
                    {sectionShop && <div className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5"><ShoppingBag className="w-3 h-3 text-primary" /><span className="text-[9px] font-medium">Shop</span></div>}
                    {sectionPlayground && <div className="rounded-lg bg-card border px-2 py-1.5 flex items-center gap-1.5"><Code2 className="w-3 h-3 text-primary" /><span className="text-[9px] font-medium">Playground</span></div>}
                    {!sectionClasses && !sectionRankPapers && !sectionPapers && !sectionShop && !sectionPlayground && (
                      <div className="col-span-3 text-center py-2 text-[10px] text-muted-foreground">All sections hidden</div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" /> Past Papers &amp; Paper Generator appear only on the dashboard, not in the top nav.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsFeatures;
