import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  GraduationCap, 
  Palette, 
  Bell, 
  Upload,
  Save,
  Globe,
  Image as ImageIcon,
  Database,
  Loader2,
  X,
  FileText,
  LayoutDashboard,
  BookOpen,
  Award,
  ShoppingBag,
  Code2,
  MessageCircle,
  Package,
  User,
  Monitor,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/layouts/AdminLayout';
import BankAccountManager from '@/components/admin/BankAccountManager';
import DatabaseBackupRestore from '@/components/admin/DatabaseBackupRestore';
import SmsTemplatesManager from '@/components/admin/SmsTemplatesManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const BUCKET = 'site-assets';

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'branding';
  const [siteName, setSiteName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Paper template state
  const [paperSchoolName, setPaperSchoolName] = useState('');
  const [paperInstructionsDaily, setPaperInstructionsDaily] = useState('');
  const [paperInstructionsFull, setPaperInstructionsFull] = useState('');
  const [paperFooter, setPaperFooter] = useState('');
  const [answerAccessFee, setAnswerAccessFee] = useState('2000');

  // Section feature toggles
  const [sectionClasses, setSectionClasses] = useState(true);
  const [sectionRankPapers, setSectionRankPapers] = useState(true);
  const [sectionPapers, setSectionPapers] = useState(true);
  const [sectionShop, setSectionShop] = useState(true);
  const [sectionPlayground, setSectionPlayground] = useState(true);
  const [sectionNotifications, setSectionNotifications] = useState(true);

  // Asset URLs
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loginBgUrl, setLoginBgUrl] = useState<string | null>(null);

  // Upload loading states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLoginBg, setUploadingLoginBg] = useState(false);

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('site_settings')
          .select('key, value');
        
        if (error) throw error;
        
        const settings: Record<string, string> = {};
        data?.forEach((s: any) => { settings[s.key] = s.value; });
        
        setSiteName(settings['site_name'] || 'A/L Student Academy');
        setContactPhone(settings['contact_phone'] || '');
        setContactEmail(settings['contact_email'] || '');
        if (settings['logo_url']) setLogoUrl(settings['logo_url']);
        if (settings['favicon_url']) setFaviconUrl(settings['favicon_url']);
        if (settings['login_bg_url']) setLoginBgUrl(settings['login_bg_url']);
        const flag = (key: string) => settings[key] !== 'false';
        setSectionClasses(flag('section_classes'));
        setSectionRankPapers(flag('section_rank_papers'));
        setSectionPapers(flag('section_papers'));
        setSectionShop(flag('section_shop'));
        setSectionPlayground(flag('section_playground'));
        setSectionNotifications(flag('section_notifications'));
        // Paper template settings
        setPaperSchoolName(settings['paper_template_school_name'] || 'A/L Student Academy');
        setPaperInstructionsDaily(settings['paper_template_instructions_daily'] || '');
        setPaperInstructionsFull(settings['paper_template_instructions_full'] || '');
        setPaperFooter(settings['paper_template_footer'] || '');
        setAnswerAccessFee(settings['answer_access_fee'] || '2000');
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (entries: { key: string; value: string }[]) => {
    setIsSaving(true);
    try {
      for (const entry of entries) {
        const { error } = await (supabase as any)
          .from('site_settings')
          .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    }
  };

  const uploadFile = async (
    file: File,
    path: string,
    settingKey: string,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      setUrl(publicUrl);

      await saveSettings([{ key: settingKey, value: publicUrl }]);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, 'logo.png', 'logo_url', setLogoUrl, setUploadingLogo);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, 'favicon.png', 'favicon_url', setFaviconUrl, setUploadingFavicon);
  };

  const handleLoginBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, 'login-bg.jpg', 'login_bg_url', setLoginBgUrl, setUploadingLoginBg);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your platform settings</p>
        </div>

        <Tabs value={defaultTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="paper-template">Paper Template</TabsTrigger>
            <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
            <TabsTrigger value="sms">SMS Templates</TabsTrigger>
            <TabsTrigger value="backup">Backup &amp; Restore</TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Site Branding
                </CardTitle>
                <CardDescription>Customize how your site looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Your site name"
                  />
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <GraduationCap className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended: 512x512px PNG</p>
                </div>

                {/* Favicon */}
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*,.ico"
                      className="hidden"
                      onChange={handleFaviconUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                    >
                      {uploadingFavicon ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended: 32x32px ICO or PNG</p>
                </div>

                {/* Login Background */}
                <div className="space-y-2">
                  <Label>Login Background</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                      {loginBgUrl ? (
                        <img src={loginBgUrl} alt="Login Background" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={loginBgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLoginBgUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => loginBgInputRef.current?.click()}
                      disabled={uploadingLoginBg}
                    >
                      {uploadingLoginBg ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLoginBg ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended: 1920x1080px JPG</p>
                </div>

                <Button className="mt-4" onClick={() => saveSettings([{ key: 'site_name', value: siteName }])} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Toggles */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Navigation Visibility
                  </CardTitle>
                  <CardDescription>Toggle which sections students see in their nav bar. Changes apply instantly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {[
                    { label: 'Classes', desc: 'Class listings and enrollments', state: sectionClasses, set: setSectionClasses, key: 'section_classes', icon: BookOpen },
                    { label: 'Rank Papers', desc: 'Quizzes and rank paper attempts', state: sectionRankPapers, set: setSectionRankPapers, key: 'section_rank_papers', icon: Award },
                    { label: 'Past Papers', desc: 'Past paper downloads library', state: sectionPapers, set: setSectionPapers, key: 'section_papers', icon: FileText },
                    { label: 'Shop', desc: 'Materials shop for students', state: sectionShop, set: setSectionShop, key: 'section_shop', icon: ShoppingBag },
                    { label: 'Playground', desc: 'ICT code playground', state: sectionPlayground, set: setSectionPlayground, key: 'section_playground', icon: Code2 },
                    { label: 'Notifications', desc: 'In-app notification bell', state: sectionNotifications, set: setSectionNotifications, key: 'section_notifications', icon: Bell },
                  ].map(({ label, desc, state, set, key, icon: Icon }, i, arr) => (
                    <div key={key}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${state ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className={state ? '' : 'text-muted-foreground line-through'}>{label}</Label>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={state}
                          onCheckedChange={(val) => {
                            set(val);
                            saveSettings([{ key, value: String(val) }]);
                          }}
                        />
                      </div>
                      {i < arr.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Live Nav Preview */}
              <div className="space-y-4">
                <Card className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Live Preview — Student Nav Bar
                    </CardTitle>
                    <CardDescription>This is how the student navigation will look.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Mock Nav Bar */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      {/* Header strip */}
                      <div className="flex items-center justify-between px-4 h-12 border-b bg-card/80 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <span className="font-bold text-sm text-foreground">Site</span>
                        </div>
                        {/* Nav items preview */}
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {/* Dashboard always shown */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap">
                            <LayoutDashboard className="w-3 h-3" />
                            Dashboard
                          </div>
                          {sectionClasses && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground text-xs font-medium whitespace-nowrap hover:bg-muted">
                              <BookOpen className="w-3 h-3" />
                              Classes
                            </div>
                          )}
                          {sectionRankPapers && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground text-xs font-medium whitespace-nowrap hover:bg-muted">
                              <Award className="w-3 h-3" />
                              Rank Papers
                            </div>
                          )}
                          {sectionShop && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground text-xs font-medium whitespace-nowrap hover:bg-muted">
                              <ShoppingBag className="w-3 h-3" />
                              Shop
                            </div>
                          )}
                          {sectionPlayground && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground text-xs font-medium whitespace-nowrap hover:bg-muted">
                              <Code2 className="w-3 h-3" />
                              Playground
                            </div>
                          )}
                        </div>
                        {/* Right icons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {sectionShop && <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted"><Package className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /></div>
                          {sectionNotifications && <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted relative"><Bell className="w-3.5 h-3.5 text-muted-foreground" /><span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive text-[8px] text-destructive-foreground flex items-center justify-center">2</span></div>}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted"><User className="w-3.5 h-3.5 text-muted-foreground" /></div>
                        </div>
                      </div>

                      {/* Dashboard quick-access grid (always shown) */}
                      <div className="p-3 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Dashboard Quick Access Cards</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {sectionClasses && (
                            <div className="rounded-lg bg-card border border-border px-2 py-2 flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium">Classes</span>
                            </div>
                          )}
                          {sectionRankPapers && (
                            <div className="rounded-lg bg-card border border-border px-2 py-2 flex items-center gap-1.5">
                              <Award className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium">Rank Papers</span>
                            </div>
                          )}
                          {sectionPapers && (
                            <div className="rounded-lg bg-card border border-border px-2 py-2 flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium">Past Papers</span>
                            </div>
                          )}
                          {sectionShop && (
                            <div className="rounded-lg bg-card border border-border px-2 py-2 flex items-center gap-1.5">
                              <ShoppingBag className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium">Shop</span>
                            </div>
                          )}
                          {sectionPlayground && (
                            <div className="rounded-lg bg-card border border-border px-2 py-2 flex items-center gap-1.5">
                              <Code2 className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-medium">Playground</span>
                            </div>
                          )}
                          {!sectionClasses && !sectionRankPapers && !sectionPapers && !sectionShop && !sectionPlayground && (
                            <div className="col-span-3 text-center py-3 text-xs text-muted-foreground">All sections hidden — enable some above</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Note: Past Papers & Paper Generator appear as dashboard cards, not in the main nav bar.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>Update your contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="info@example.com"
                  />
                </div>
                <Button className="mt-4" onClick={() => saveSettings([
                  { key: 'contact_phone', value: contactPhone },
                  { key: 'contact_email', value: contactEmail }
                ])} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Accounts Tab */}
          <TabsContent value="bank" className="space-y-6">
            <BankAccountManager />
          </TabsContent>

          {/* SMS Templates Tab */}
          <TabsContent value="sms" className="space-y-6">
            <SmsTemplatesManager />
          </TabsContent>

          {/* Paper Template Tab */}
          <TabsContent value="paper-template" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Paper PDF Template
                </CardTitle>
                <CardDescription>Customize the header, instructions, and footer printed on generated papers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="paperSchoolName">School / Institute Name (Header)</Label>
                  <Input
                    id="paperSchoolName"
                    value={paperSchoolName}
                    onChange={e => setPaperSchoolName(e.target.value)}
                    placeholder="e.g. A/L Student Academy"
                  />
                  <p className="text-xs text-muted-foreground">Shown as the main title in the paper header</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="instrDaily">Instructions — Daily Paper</Label>
                  <textarea
                    id="instrDaily"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    rows={3}
                    value={paperInstructionsDaily}
                    onChange={e => setPaperInstructionsDaily(e.target.value)}
                    placeholder="Instructions printed on daily papers..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instrFull">Instructions — Full Paper (50 MCQ + essays)</Label>
                  <textarea
                    id="instrFull"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    rows={3}
                    value={paperInstructionsFull}
                    onChange={e => setPaperInstructionsFull(e.target.value)}
                    placeholder="Instructions printed on full papers..."
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="paperFooter">Footer Text</Label>
                  <Input
                    id="paperFooter"
                    value={paperFooter}
                    onChange={e => setPaperFooter(e.target.value)}
                    placeholder="e.g. Generated by ICT Academy | www.ictacademy.lk"
                  />
                  <p className="text-xs text-muted-foreground">Shown at the bottom of every generated paper</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="answerFee">Answer Access Fee (LKR) — One-time lifetime</Label>
                  <Input
                    id="answerFee"
                    type="number"
                    value={answerAccessFee}
                    onChange={e => setAnswerAccessFee(e.target.value)}
                    placeholder="2000"
                  />
                  <p className="text-xs text-muted-foreground">Students without class enrollment pay this once for lifetime answer access</p>
                </div>
                <Button onClick={() => saveSettings([
                  { key: 'paper_template_school_name', value: paperSchoolName },
                  { key: 'paper_template_instructions_daily', value: paperInstructionsDaily },
                  { key: 'paper_template_instructions_full', value: paperInstructionsFull },
                  { key: 'paper_template_footer', value: paperFooter },
                  { key: 'answer_access_fee', value: answerAccessFee },
                ])} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Template Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Restore Tab */}
          <TabsContent value="backup" className="space-y-6">
            <DatabaseBackupRestore />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
