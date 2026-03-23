import { Link } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StudentPreviewBanner = () => {
  const handleReturn = () => {
    sessionStorage.removeItem('admin_student_preview');
    window.location.href = '/admin';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground flex items-center justify-between px-4 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="font-medium">You are viewing the site as a student</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs gap-1.5"
        onClick={handleReturn}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Admin
      </Button>
    </div>
  );
};

export default StudentPreviewBanner;
