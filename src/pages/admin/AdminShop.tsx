import { useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  MoreVertical, 
  Edit,
  Trash2,
  Loader2,
  Package,
  FileText,
  Printer,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layouts/AdminLayout';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price_soft: number | null;
  price_printed: number | null;
  price_both: number | null;
  is_active: boolean;
  created_at: string;
  subject_id: string | null;
}

const AdminShop = () => {
  const queryClient = useQueryClient();
  const { isTeacher, isAdmin, isModerator, profile } = useAuth();
  const location = useLocation();
  const isTeacherRoute = location.pathname.startsWith('/teacher');
  const teacherSubjectId = isTeacher && !isAdmin && !isModerator ? profile?.subject_id : null;
  const Layout = isTeacherRoute ? TeacherLayout : AdminLayout;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<string>('BOOK');
  const [priceSoft, setPriceSoft] = useState('');
  const [pricePrinted, setPricePrinted] = useState('');
  const [priceBoth, setPriceBoth] = useState('');

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-shop-products', teacherSubjectId],
    queryFn: async () => {
      let query = supabase
        .from('shop_products')
        .select('*')
        .order('created_at', { ascending: false });
      if (teacherSubjectId) {
        query = query.eq('subject_id', teacherSubjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ShopProduct[];
    },
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shop_products')
        .insert({
          title,
          description: description || null,
          type: productType,
          price_soft: priceSoft ? parseInt(priceSoft) : null,
          price_printed: pricePrinted ? parseInt(pricePrinted) : null,
          price_both: priceBoth ? parseInt(priceBoth) : null,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product created!');
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      const { error } = await supabase
        .from('shop_products')
        .update({
          title,
          description: description || null,
          type: productType,
          price_soft: priceSoft ? parseInt(priceSoft) : null,
          price_printed: pricePrinted ? parseInt(pricePrinted) : null,
          price_both: priceBoth ? parseInt(priceBoth) : null,
        })
        .eq('id', editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('shop_products')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-shop-products'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProductType('BOOK');
    setPriceSoft('');
    setPricePrinted('');
    setPriceBoth('');
  };

  const openEditDialog = (product: ShopProduct) => {
    setEditingProduct(product);
    setTitle(product.title);
    setDescription(product.description || '');
    setProductType(product.type);
    setPriceSoft(product.price_soft?.toString() || '');
    setPricePrinted(product.price_printed?.toString() || '');
    setPriceBoth(product.price_both?.toString() || '');
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingProduct) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'BOOK': return 'Book';
      case 'NOTES': return 'Notes';
      case 'PAPERS': return 'Papers';
      default: return type;
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <AdminPageHeader
        title="Shop Products"
        description="Manage books, notes, and materials"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Shop Products' }]}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        }
      />

        {/* Products Table */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Soft Copy</TableHead>
                  <TableHead>Printed</TableHead>
                  <TableHead>Both</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{product.title}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getProductTypeLabel(product.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.price_soft ? `Rs. ${product.price_soft}` : '-'}
                    </TableCell>
                    <TableCell>
                      {product.price_printed ? `Rs. ${product.price_printed}` : '-'}
                    </TableCell>
                    <TableCell>
                      {product.price_both ? `Rs. ${product.price_both}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={product.is_active ? 'text-green-600' : 'text-muted-foreground'}
                        onClick={() => toggleMutation.mutate({ id: product.id, is_active: !product.is_active })}
                      >
                        {product.is_active ? (
                          <><ToggleRight className="w-5 h-5 mr-1" /> Active</>
                        ) : (
                          <><ToggleLeft className="w-5 h-5 mr-1" /> Hidden</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteId(product.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No products</h3>
                <p className="text-sm text-muted-foreground">Add your first product to the shop</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingProduct(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details' : 'Add a new product to the shop'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Product Title</Label>
              <Input 
                id="title" 
                placeholder="e.g., A/L Physics Complete Notes" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Product description..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Product Type</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOOK">Book</SelectItem>
                  <SelectItem value="NOTES">Notes</SelectItem>
                  <SelectItem value="PAPERS">Papers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Pricing (leave empty if not available)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Soft Copy
                  </Label>
                  <Input 
                    type="number"
                    placeholder="Rs."
                    value={priceSoft}
                    onChange={(e) => setPriceSoft(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Printer className="w-3 h-3" /> Printed
                  </Label>
                  <Input 
                    type="number"
                    placeholder="Rs."
                    value={pricePrinted}
                    onChange={(e) => setPricePrinted(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Package className="w-3 h-3" /> Both
                  </Label>
                  <Input 
                    type="number"
                    placeholder="Rs."
                    value={priceBoth}
                    onChange={(e) => setPriceBoth(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={isPending || !title}
            >
              {isPending ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminShop;
