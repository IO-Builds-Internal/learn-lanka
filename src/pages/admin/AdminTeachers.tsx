import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { GraduationCap, Search, UserPlus, Trash2, BookOpen, Upload, Image } from 'lucide-react';

const AdminTeachers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit image dialog
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Change subject dialog
  const [changeSubjectOpen, setChangeSubjectOpen] = useState(false);
  const [changeSubjectTeacher, setChangeSubjectTeacher] = useState<any>(null);
  const [newSubjectId, setNewSubjectId] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      if (!teacherRoles?.length) return [];
      const ids = teacherRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      const { data: classes } = await supabase
        .from('classes')
        .select('id, teacher_id, approval_status')
        .in('teacher_id', ids);
      return (profiles || []).map((p: any) => {
        const subj = subjects.find((s: any) => s.id === (p as any).subject_id);
        return {
          ...p,
          subjectName: subj?.name || null,
          subjectColor: subj?.color || null,
          classCount: (classes || []).filter((c: any) => c.teacher_id === p.id).length,
          pendingClasses: (classes || []).filter((c: any) => c.teacher_id === p.id && c.approval_status === 'PENDING').length,
        };
      });
    },
    enabled: subjects.length > 0,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['teacher-promote-search', promoteSearch],
    queryFn: async () => {
      if (!promoteSearch || promoteSearch.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${promoteSearch}%,last_name.ilike.%${promoteSearch}%,phone.ilike.%${promoteSearch}%`)
        .limit(10);
      const teacherIds = teachers.map((t: any) => t.id);
      return (data || []).filter((p: any) => !teacherIds.includes(p.id));
    },
    enabled: promoteSearch.length >= 2,
  });

  const handleImageSelect = (file: File, setFile: (f: File | null) => void, setPreview: (s: string | null) => void) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File, userId: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `teacher-images/${userId}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !imageFile || !selectedSubjectId) throw new Error('Please select a user, subject, and upload an image');
      setUploading(true);
      const imageUrl = await uploadImage(imageFile, selectedUser.id);
      await supabase.from('profiles').update({ teacher_image_url: imageUrl, subject_id: selectedSubjectId }).eq('id', selectedUser.id);
      const { error } = await supabase.from('user_roles').insert({ user_id: selectedUser.id, role: 'teacher' as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User promoted to teacher');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      setPromoteOpen(false);
      setPromoteSearch('');
      setSelectedUser(null);
      setSelectedSubjectId('');
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setUploading(false);
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async () => {
      if (!editTeacher || !editImageFile) throw new Error('Select an image');
      const imageUrl = await uploadImage(editImageFile, editTeacher.id);
      await supabase.from('profiles').update({ teacher_image_url: imageUrl }).eq('id', editTeacher.id);
    },
    onSuccess: () => {
      toast.success('Teacher image updated');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      setEditImageOpen(false);
      setEditTeacher(null);
      setEditImageFile(null);
      setEditImagePreview(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const changeSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!changeSubjectTeacher || !newSubjectId) throw new Error('Select a subject');
      const { error } = await supabase.from('profiles').update({ subject_id: newSubjectId }).eq('id', changeSubjectTeacher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teacher subject updated');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      setChangeSubjectOpen(false);
      setChangeSubjectTeacher(null);
      setNewSubjectId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'teacher' as any);
      if (error) throw error;
      // Clear subject assignment
      await supabase.from('profiles').update({ subject_id: null } as any).eq('id', userId);
    },
    onSuccess: () => {
      toast.success('Teacher role removed');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredTeachers = teachers.filter((t: any) =>
    `${t.first_name} ${t.last_name} ${t.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <AdminPageHeader title="Teachers" description="Manage teacher accounts, subjects, and class permissions" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setPromoteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Promote to Teacher
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredTeachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium">No teachers yet</h3>
            <p className="text-sm text-muted-foreground">Promote a user to teacher role to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTeachers.map((teacher: any) => (
            <Card key={teacher.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {teacher.teacher_image_url ? (
                      <img src={teacher.teacher_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{teacher.first_name} {teacher.last_name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                    {teacher.subjectName && (
                      <Badge className="mt-1 text-xs" style={{ backgroundColor: `${teacher.subjectColor}20`, color: teacher.subjectColor, borderColor: `${teacher.subjectColor}30` }}>
                        {teacher.subjectName}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm mr-2">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{teacher.classCount} classes</span>
                    </div>
                    {teacher.pendingClasses > 0 && (
                      <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                        {teacher.pendingClasses} pending
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      setChangeSubjectTeacher(teacher);
                      setNewSubjectId((teacher as any).subject_id || '');
                      setChangeSubjectOpen(true);
                    }}
                  >
                    Subject
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => {
                      setEditTeacher(teacher);
                      setEditImagePreview(teacher.teacher_image_url || null);
                      setEditImageOpen(true);
                    }}
                    className="text-muted-foreground hover:bg-muted"
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => {
                      if (confirm('Remove teacher role from this user?')) {
                        removeMutation.mutate(teacher.id);
                      }
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={(o) => { setPromoteOpen(o); if (!o) { setSelectedUser(null); setSelectedSubjectId(''); setImageFile(null); setImagePreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote User to Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedUser ? (
              <>
                <Input
                  placeholder="Search by name or phone..."
                  value={promoteSearch}
                  onChange={e => setPromoteSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                      </div>
                      <Button size="sm" onClick={() => setSelectedUser(user)}>
                        Select
                      </Button>
                    </div>
                  ))}
                  {promoteSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div>
                    <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setSelectedUser(null); setImageFile(null); setImagePreview(null); }}>
                    Change
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assign Subject *</label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Teacher Image (Required, 9:16 ratio recommended)</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageSelect(f, setImageFile, setImagePreview);
                    }}
                  />
                  {imagePreview ? (
                    <div className="relative w-32 mx-auto">
                      <div className="aspect-[9/16] rounded-lg overflow-hidden border">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <Button
                        variant="outline" size="sm"
                        className="w-full mt-2"
                        onClick={() => fileRef.current?.click()}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload teacher image</p>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => promoteMutation.mutate()}
                  disabled={!imageFile || !selectedSubjectId || uploading}
                >
                  {uploading ? 'Uploading...' : 'Promote to Teacher'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={editImageOpen} onOpenChange={(o) => { setEditImageOpen(o); if (!o) { setEditTeacher(null); setEditImageFile(null); setEditImagePreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Teacher Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageSelect(f, setEditImageFile, setEditImagePreview);
              }}
            />
            {editImagePreview ? (
              <div className="relative w-32 mx-auto">
                <div className="aspect-[9/16] rounded-lg overflow-hidden border">
                  <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <Button
                  variant="outline" size="sm"
                  className="w-full mt-2"
                  onClick={() => editFileRef.current?.click()}
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => editFileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload new image</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => updateImageMutation.mutate()}
              disabled={!editImageFile || updateImageMutation.isPending}
            >
              {updateImageMutation.isPending ? 'Uploading...' : 'Save Image'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Subject Dialog */}
      <Dialog open={changeSubjectOpen} onOpenChange={(o) => { setChangeSubjectOpen(o); if (!o) { setChangeSubjectTeacher(null); setNewSubjectId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Teacher Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {changeSubjectTeacher && (
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="font-medium">{changeSubjectTeacher.first_name} {changeSubjectTeacher.last_name}</p>
                <p className="text-sm text-muted-foreground">Current: {changeSubjectTeacher.subjectName || 'None'}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Subject</label>
              <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => changeSubjectMutation.mutate()}
              disabled={!newSubjectId || changeSubjectMutation.isPending}
            >
              {changeSubjectMutation.isPending ? 'Updating...' : 'Update Subject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeachers;
