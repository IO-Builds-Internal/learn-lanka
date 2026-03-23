import { useState } from 'react';
import {
  DollarSign, BookOpen, Award, ShoppingBag, KeyRound, Edit2, Check, X, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Inline price cell ────────────────────────────────────────────────────────
const PriceCell = ({
  value,
  onSave,
  placeholder = 'Free',
}: {
  value: number | null;
  onSave: (val: number | null) => Promise<void>;
  placeholder?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setInput(value != null ? String(value) : '');
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      const parsed = input.trim() === '' ? null : parseInt(input, 10);
      if (input.trim() !== '' && (isNaN(parsed!) || parsed! < 0)) {
        toast.error('Enter a valid positive number');
        return;
      }
      await onSave(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Rs.</span>
        <Input
          autoFocus
          type="number"
          min="0"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="h-7 w-24 text-sm"
        />
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save}><Check className="w-3.5 h-3.5 text-success" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel}><X className="w-3.5 h-3.5 text-destructive" /></Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className={value != null ? 'font-semibold text-foreground' : 'text-muted-foreground text-sm italic'}>
        {value != null ? `Rs. ${value.toLocaleString()}` : placeholder}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={startEdit}
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const AdminPrices = () => {
  const queryClient = useQueryClient();

  // ── Classes ──
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['price-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, title, grade_min, grade_max, monthly_fee_amount, is_private')
        .order('grade_min');
      if (error) throw error;
      return data;
    },
  });

  const updateClassFee = async (id: string, val: number | null) => {
    const { error } = await supabase
      .from('classes')
      .update({ monthly_fee_amount: val ?? 0 })
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['price-classes'] });
    toast.success('Class fee updated');
  };

  // ── Rank Papers ──
  const { data: rankPapers = [], isLoading: loadingRank } = useQuery({
    queryKey: ['price-rank-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_papers')
        .select('id, title, grade, fee_amount, class_id')
        .order('grade');
      if (error) throw error;
      return data;
    },
  });

  const updateRankFee = async (id: string, val: number | null) => {
    const { error } = await supabase
      .from('rank_papers')
      .update({ fee_amount: val })
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['price-rank-papers'] });
    toast.success('Rank paper fee updated');
  };

  // ── Shop Products ──
  const { data: products = [], isLoading: loadingShop } = useQuery({
    queryKey: ['price-shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_products')
        .select('id, title, type, price_soft, price_printed, price_both, is_active')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const updateProductPrice = async (id: string, field: string, val: number | null) => {
    const { error } = await supabase
      .from('shop_products')
      .update({ [field]: val })
      .eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['price-shop-products'] });
    toast.success('Product price updated');
  };

  // ── Answer Access Fee ──
  const { data: answerFee, isLoading: loadingFee } = useQuery({
    queryKey: ['price-answer-access-fee'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('site_settings')
        .select('value')
        .eq('key', 'answer_access_fee')
        .maybeSingle();
      return data ? parseInt(data.value, 10) || 2000 : 2000;
    },
  });

  const updateAnswerFee = async (val: number | null) => {
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({ key: 'answer_access_fee', value: String(val ?? 2000), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['price-answer-access-fee'] });
    toast.success('Answer access fee updated');
  };

  const isLoading = loadingClasses || loadingRank || loadingShop || loadingFee;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <AdminPageHeader
          title="Price Management"
          description="View and edit all prices from one place. Hover a price to edit it inline."
          breadcrumbs={[{ label: 'Finance' }, { label: 'Prices' }]}
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">

            {/* Answer Access Fee (single value) */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" /> Answer Access (Lifetime Fee)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">One-time lifetime access to paper answers</p>
                    <p className="text-xs text-muted-foreground">Charged once per student for permanent answer viewing</p>
                  </div>
                  <PriceCell value={answerFee ?? 2000} onSave={updateAnswerFee} />
                </div>
              </CardContent>
            </Card>

            {/* Classes */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Class Monthly Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {classes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No classes found</p>
                  )}
                  {classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cls.title}</p>
                        <p className="text-xs text-muted-foreground">Grade {cls.grade_min}–{cls.grade_max}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {cls.is_private && <Badge variant="secondary" className="text-[10px]">Private</Badge>}
                        <PriceCell
                          value={cls.monthly_fee_amount || null}
                          placeholder="Free"
                          onSave={val => updateClassFee(cls.id, val)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rank Papers */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> Rank Paper Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {rankPapers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No rank papers found</p>
                  )}
                  {rankPapers.map(paper => (
                    <div key={paper.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">Grade {paper.grade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {paper.class_id && <Badge variant="secondary" className="text-[10px]">Class</Badge>}
                        <PriceCell
                          value={paper.fee_amount}
                          placeholder="Free"
                          onSave={val => updateRankFee(paper.id, val)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shop Products */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" /> Shop Product Prices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Product</span>
                  <span className="w-28 text-center">Soft Copy</span>
                  <span className="w-28 text-center">Printed</span>
                  <span className="w-28 text-center">Both</span>
                </div>
                <div className="divide-y divide-border">
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No products found</p>
                  )}
                  {products.map(product => (
                    <div key={product.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{product.type}</Badge>
                          {!product.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                        </div>
                      </div>
                      <div className="w-28 flex justify-center">
                        <PriceCell value={product.price_soft} onSave={val => updateProductPrice(product.id, 'price_soft', val)} />
                      </div>
                      <div className="w-28 flex justify-center">
                        <PriceCell value={product.price_printed} onSave={val => updateProductPrice(product.id, 'price_printed', val)} />
                      </div>
                      <div className="w-28 flex justify-center">
                        <PriceCell value={product.price_both} onSave={val => updateProductPrice(product.id, 'price_both', val)} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPrices;
