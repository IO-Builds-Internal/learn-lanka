import { HardDriveDownload } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import DatabaseBackupRestore from '@/components/admin/DatabaseBackupRestore';

const AdminSettingsBackup = () => (
  <AdminLayout>
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><HardDriveDownload className="w-6 h-6" /> Backup &amp; Restore</h1>
        <p className="text-muted-foreground">Download a backup of your database or restore from a previous backup</p>
      </div>
      <DatabaseBackupRestore />
    </div>
  </AdminLayout>
);

export default AdminSettingsBackup;
