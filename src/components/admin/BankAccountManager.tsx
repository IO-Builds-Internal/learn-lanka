import { useState } from 'react';
import { Plus, Edit, Trash2, Loader2, CreditCard, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  is_active: boolean;
}

const BankAccountManager = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form state
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Fetch all bank accounts (including inactive)
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['admin-bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BankAccount[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const accountData = {
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        branch,
        is_active: isActive,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert(accountData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingAccount ? 'Bank account updated!' : 'Bank account added!');
      queryClient.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save bank account');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bank account deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete bank account');
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const resetForm = () => {
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setBranch('');
    setIsActive(true);
    setEditingAccount(null);
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setBankName(account.bank_name);
    setAccountName(account.account_name);
    setAccountNumber(account.account_number);
    setBranch(account.branch);
    setIsActive(account.is_active);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bank Accounts
          </CardTitle>
          <CardDescription>Manage bank accounts for payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <div 
              key={account.id} 
              className={`p-4 rounded-lg border space-y-3 ${!account.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{account.bank_name}</h4>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: account.id, isActive: checked })
                    }
                  />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(account)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Account: </span>
                  <span className="font-mono">{account.account_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Branch: </span>
                  <span>{account.branch}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span>{account.account_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className={account.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bank accounts configured
            </p>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => { resetForm(); setDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update bank account details' : 'Add a new bank account for payments'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g., Bank of Ceylon"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="e.g., 12345678901234"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Holder Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., A/L Student Academy"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                placeholder="e.g., Colombo Main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Active (visible to students)</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !bankName || !accountNumber || !accountName || !branch}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingAccount ? 'Save Changes' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bank account. Students will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BankAccountManager;
