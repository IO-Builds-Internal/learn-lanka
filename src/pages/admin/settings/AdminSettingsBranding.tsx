import { useState, useEffect, useRef } from 'react';
import { GraduationCap, Palette, Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const BUCKET = 'site-assets';

const AdminSettingsBranding = () => {
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loginBgUrl, setLoginBgUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLoginBg, setUploadingLoginBg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);

  const getPublicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('site_settings').select('key, value');
      const m: Record<string, string> = {};
      data?.forEach((s: any) => { m[s.key] = s.value; });
      setSiteName(m['site_name'] || 'A/L Student Academy');
      if (m['logo_url']) setLogoUrl(m['logo_url']);
      if (m['favicon_url']) setFaviconUrl(m['favicon_url']);
      if (m['login_bg_url']) setLoginBgUrl(m['login_bg_url']);
      setIsLoading(false);
    })();
  }, []);

  const saveSettings = async (entries: { key: string; value: string }[]) => {
    setIsSaving(true);
    try {
      for (const e of entries) {
        const { error } = await (supabase as any).from('site_settings').upsert({ key: e.key, value: e.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      toast.success('Settings saved!');
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  const uploadFile = async (file: File, path: string, key: string, setUrl: (u: string) => void, setUploading: (v: boolean) => void) => {
    setUploading(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const url = getPublicUrl(path);
      setUrl(url);
      await saveSettings([{ key, value: url }]);
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Palette className="w-6 h-6" /> Branding</h1>
          <p className="text-muted-foreground">Customize how your site looks</p>
        </div>
        <Card className="card-elevated">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Your site name" />
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <GraduationCap className="w-8 h-8 text-primary" />}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'logo.png', 'logo_url', setLogoUrl, setUploadingLogo); }} />
                <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Recommended: 512×512px PNG</p>
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                  {faviconUrl ? <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" /> : <GraduationCap className="w-4 h-4 text-primary" />}
                </div>
                <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'favicon.png', 'favicon_url', setFaviconUrl, setUploadingFavicon); }} />
                <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
                  {uploadingFavicon ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadingFavicon ? 'Uploading…' : 'Upload Favicon'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Recommended: 32×32px ICO or PNG</p>
            </div>

            {/* Login Background */}
            <div className="space-y-2">
              <Label>Login Background</Label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                  {loginBgUrl ? <img src={loginBgUrl} alt="Login Background" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                </div>
                <input ref={loginBgInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'login-bg.jpg', 'login_bg_url', setLoginBgUrl, setUploadingLoginBg); }} />
                <Button variant="outline" onClick={() => loginBgInputRef.current?.click()} disabled={uploadingLoginBg}>
                  {uploadingLoginBg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadingLoginBg ? 'Uploading…' : 'Upload Image'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Recommended: 1920×1080px JPG</p>
            </div>

            <Button onClick={() => saveSettings([{ key: 'site_name', value: siteName }])} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsBranding;
