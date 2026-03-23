import { useState, useEffect } from 'react';
import { Globe, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AdminSettingsContact = () => {
  const queryClient = useQueryClient();
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('site_settings').select('key, value');
      const m: Record<string, string> = {};
      data?.forEach((s: any) => { m[s.key] = s.value; });
      setContactPhone(m['contact_phone'] || '');
      setContactEmail(m['contact_email'] || '');
    })();
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      for (const e of [{ key: 'contact_phone', value: contactPhone }, { key: 'contact_email', value: contactEmail }]) {
        const { error } = await (supabase as any).from('site_settings').upsert({ key: e.key, value: e.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      toast.success('Contact info saved!');
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Globe className="w-6 h-6" /> Contact Info</h1>
          <p className="text-muted-foreground">Update your public contact details</p>
        </div>
        <Card className="card-elevated">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="07X XXX XXXX" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="info@example.com" />
            </div>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsContact;
