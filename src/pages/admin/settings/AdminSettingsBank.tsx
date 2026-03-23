import { Landmark } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import BankAccountManager from '@/components/admin/BankAccountManager';

const AdminSettingsBank = () => (
  <AdminLayout>
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Landmark className="w-6 h-6" /> Bank Accounts</h1>
        <p className="text-muted-foreground">Manage bank accounts shown to students for payments</p>
      </div>
      <BankAccountManager />
    </div>
  </AdminLayout>
);

export default AdminSettingsBank;
