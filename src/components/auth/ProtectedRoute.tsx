import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
  requireTeacher?: boolean;
}

// Student-only routes — admin/mod/teacher should not land here
const STUDENT_ONLY_PATHS = ['/dashboard', '/classes', '/rank-papers', '/shop', '/checkout', '/notifications', '/papers', '/playground', '/profile'];

const ProtectedRoute = ({ children, requireAdmin, requireModerator, requireTeacher }: ProtectedRouteProps) => {
  const { user, loading, rolesLoading, isAdmin, isModerator, isTeacher } = useAuth();
  const location = useLocation();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins/mods visiting student-only routes → send to admin panel
  const isStudentPreview = sessionStorage.getItem('admin_student_preview') === 'true';
  if ((isAdmin || isModerator) && !requireAdmin && !requireModerator && !requireTeacher && !isStudentPreview) {
    const isStudentOnly = STUDENT_ONLY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (isStudentOnly) {
      return <Navigate to="/admin" replace />;
    }
  }

  // Teachers visiting student-only routes → send to teacher panel
  if (isTeacher && !isAdmin && !isModerator && !requireTeacher && !isStudentPreview) {
    const isStudentOnly = STUDENT_ONLY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (isStudentOnly) {
      return <Navigate to="/teacher" replace />;
    }
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/admin" replace />;
  }

  if (requireTeacher && !isTeacher && !isAdmin && !isModerator) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
