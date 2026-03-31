import { useParams } from 'react-router-dom';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

// Reuse AdminClassContent but wrapped in TeacherLayout
// We lazy-import the content component
import AdminClassContentInner from '@/pages/admin/AdminClassContent';

const TeacherClassContent = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Verify teacher owns this class
  const { data: classData, isLoading } = useQuery({
    queryKey: ['teacher-class-verify', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await supabase
        .from('classes')
        .select('id, teacher_id, approval_status')
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single();
      return data;
    },
    enabled: !!id && !!user,
  });

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </TeacherLayout>
    );
  }

  if (!classData) {
    return <Navigate to="/teacher/classes" replace />;
  }

  // Render the admin class content page - it uses its own layout internally
  // So we just render it directly (it wraps with AdminLayout)
  // Instead, we need a shared content component. For now redirect to admin route
  // which the teacher has access to via can_manage_class
  return <Navigate to={`/admin/classes/${id}/content`} replace />;
};

export default TeacherClassContent;
