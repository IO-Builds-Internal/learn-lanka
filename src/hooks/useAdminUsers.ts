import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithDetails {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  school_name: string | null;
  grade: number | null;
  status: string;
  created_at: string;
  roles: string[];
  enrolled_classes: number;
}

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin-users'],
    staleTime: 30_000, // Cache for 30s to avoid re-fetching on every render
    queryFn: async (): Promise<UserWithDetails[]> => {
      // Parallel fetch all three sources at once
      const [profilesRes, rolesRes, enrollmentsRes] = await Promise.all([
        supabase.from('profiles').select('id,phone,first_name,last_name,school_name,grade,status,created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('user_roles').select('user_id,role'),
        supabase.from('class_enrollments').select('user_id').eq('status', 'ACTIVE'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;

      // Build lookup maps
      const rolesMap = new Map<string, string[]>();
      rolesRes.data?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      const enrollmentCountMap = new Map<string, number>();
      enrollmentsRes.data?.forEach(e => {
        enrollmentCountMap.set(e.user_id, (enrollmentCountMap.get(e.user_id) || 0) + 1);
      });

      return (profilesRes.data || []).map(profile => ({
        id: profile.id,
        phone: profile.phone,
        first_name: profile.first_name,
        last_name: profile.last_name,
        school_name: profile.school_name,
        grade: profile.grade,
        status: profile.status,
        created_at: profile.created_at,
        roles: rolesMap.get(profile.id) || ['student'],
        enrolled_classes: enrollmentCountMap.get(profile.id) || 0,
      }));
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    },
  });
};

export const useAddModeratorRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', 'moderator').maybeSingle();
      if (existing) throw new Error('User already has moderator role');
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'moderator' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Moderator role added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add moderator role');
    },
  });
};

export const useRemoveModeratorRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'moderator');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Moderator role removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove moderator role');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      phone: string;
      first_name: string;
      last_name: string;
      password: string;
      grade?: number | null;
      school_name?: string | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(params),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
};
