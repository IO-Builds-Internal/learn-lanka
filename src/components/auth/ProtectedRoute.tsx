import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

// Student-only routes — admin/mod should not land here
const STUDENT_ONLY_PATHS = ['/dashboard', '/classes', '/rank-papers', '/shop', '/checkout', '/notifications', '/papers', '/playground', '/profile'];

const ProtectedRoute = ({ children, requireAdmin, requireModerator }: ProtectedRouteProps) => {
  const { user, loading, rolesLoading, isAdmin, isModerator } = useAuth();
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
  if ((isAdmin || isModerator) && !requireAdmin && !requireModerator) {
    const isStudentOnly = STUDENT_ONLY_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (isStudentOnly) {
      return <Navigate to="/admin" replace />;
    }
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (requireModerator && !isModerator) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
