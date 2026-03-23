import { MessageSquare } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import SmsTemplatesManager from '@/components/admin/SmsTemplatesManager';

const AdminSettingsSms = () => (
  <AdminLayout>
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-6 h-6" /> SMS Templates</h1>
        <p className="text-muted-foreground">Manage reusable SMS message templates</p>
      </div>
      <SmsTemplatesManager />
    </div>
  </AdminLayout>
);

export default AdminSettingsSms;
