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
  X
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
        
        setSiteName(settings['site_name'] || 'ICT Academy');
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
            <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
            <TabsTrigger value="sms">SMS Templates</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
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
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Section Visibility</CardTitle>
                <CardDescription>Show or hide sections for students. Changes take effect immediately.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: 'Classes', desc: 'Class listings and enrollments', state: sectionClasses, set: setSectionClasses, key: 'section_classes' },
                  { label: 'Rank Papers', desc: 'Quizzes and rank paper attempts', state: sectionRankPapers, set: setSectionRankPapers, key: 'section_rank_papers' },
                  { label: 'Papers', desc: 'Past paper downloads library', state: sectionPapers, set: setSectionPapers, key: 'section_papers' },
                  { label: 'Shop', desc: 'Materials shop for students', state: sectionShop, set: setSectionShop, key: 'section_shop' },
                  { label: 'Playground', desc: 'ICT code playground', state: sectionPlayground, set: setSectionPlayground, key: 'section_playground' },
                  { label: 'Notifications', desc: 'In-app notification bell', state: sectionNotifications, set: setSectionNotifications, key: 'section_notifications' },
                ].map(({ label, desc, state, set, key }, i, arr) => (
                  <div key={key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <Label>{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
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
