import { useState, useRef } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle, Loader2, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invokeFunction } from '@/lib/functions';

const DatabaseBackupRestore = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await invokeFunction('database-backup', {
        body: { action: 'backup' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString());
      toast.success('Backup downloaded successfully');
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(error.message || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('Please select a valid JSON backup file');
        return;
      }
      setRestoreFile(file);
      setShowRestoreConfirm(true);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setIsRestoring(true);
    setShowRestoreConfirm(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      // Read the file
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup format
      if (!backupData._meta) {
        throw new Error('Invalid backup file format');
      }

      const response = await invokeFunction('database-backup', {
        body: { action: 'restore', backupData },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Check results
      const results = response.data.results;
      const failed = Object.entries(results).filter(([_, r]: [string, any]) => !r.success);

      if (failed.length > 0) {
        toast.warning(`Restore completed with ${failed.length} table(s) having issues`);
        console.warn('Restore issues:', failed);
      } else {
        toast.success('Database restored successfully');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(error.message || 'Failed to restore database');
    } finally {
      setIsRestoring(false);
      setRestoreFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await invokeFunction('seed-database', {
        body: { action: 'seed' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(response.data.message || 'Database seeded successfully!');
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error(error.message || 'Failed to seed database');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await invokeFunction('seed-database', {
        body: { action: 'clear' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(response.data.message || 'Database cleared successfully!');
    } catch (error: any) {
      console.error('Clear error:', error);
      toast.error(error.message || 'Failed to clear database');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Backup & Restore
        </CardTitle>
        <CardDescription>
          Create backups of your data and restore from previous backups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Notes</AlertTitle>
          <AlertDescription className="text-sm space-y-1">
            <p>• Backups include all table data but NOT schema (tables, functions, RLS policies)</p>
            <p>• Schema changes are managed through migrations</p>
            <p>• Restore will merge/update existing data (upsert operation)</p>
            <p>• Always test restores on a non-production environment first</p>
          </AlertDescription>
        </Alert>

        {/* Backup Section */}
        <div className="space-y-3">
          <h3 className="font-medium">Create Backup</h3>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="gap-2"
            >
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
            </Button>
            {lastBackup && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Last backup: {lastBackup}
              </span>
            )}
          </div>
        </div>

        {/* Restore Section */}
        <div className="space-y-3">
          <h3 className="font-medium">Restore from Backup</h3>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="restore-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="gap-2"
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isRestoring ? 'Restoring...' : 'Select Backup File'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Seed & Clear Section */}
        <div className="space-y-3">
          <h3 className="font-medium">Development Tools</h3>
          <p className="text-sm text-muted-foreground">
            Seed dummy data for testing or clear all data (users preserved)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSeedDatabase}
              disabled={isSeeding || isClearing}
              className="gap-2"
            >
              {isSeeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isSeeding ? 'Seeding...' : 'Add Dummy Data'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowClearConfirm(true)}
              disabled={isSeeding || isClearing}
              className="gap-2"
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Clear All Data will remove everything except user accounts, profiles, and roles.
          </p>
        </div>

        {/* Restore Confirmation Dialog */}
        <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Confirm Database Restore
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>You are about to restore the database from:</p>
                <p className="font-medium">{restoreFile?.name}</p>
                <p className="text-destructive font-medium">
                  This will update existing records with data from the backup file.
                  This action cannot be undone!
                </p>
                <p>Are you sure you want to continue?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestore}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Restore Database
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Database Confirmation Dialog */}
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Clear All Data?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside text-sm space-y-1 my-2">
                  <li>All classes, lessons, and class days</li>
                  <li>All payments and enrollments</li>
                  <li>All rank papers, attempts, and marks</li>
                  <li>All shop products and orders</li>
                  <li>All notifications and SMS logs</li>
                  <li>All coupons and papers</li>
                </ul>
                <p className="font-medium">User accounts, profiles, and roles will be preserved.</p>
                <p className="text-destructive font-medium">This action cannot be undone!</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearDatabase}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Clear Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DatabaseBackupRestore;
