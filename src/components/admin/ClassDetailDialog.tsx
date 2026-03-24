import { 
  BookOpen, 
  Users,
  Lock,
  Calendar,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ClassEnrollmentsManager from './ClassEnrollmentsManager';

interface ClassData {
  id: string;
  title: string;
  description: string | null;
  grade_min: number;
  grade_max: number;
  monthly_fee_amount: number;
  is_private: boolean;
  private_code: string | null;
  max_students: number | null;
  image_url: string | null;
  created_at: string;
}

interface ClassDetailDialogProps {
  classData: ClassData | null;
  enrollmentCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CLASS_IMAGE = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';

const ClassDetailDialog = ({ classData, enrollmentCount, open, onOpenChange }: ClassDetailDialogProps) => {
  if (!classData) return null;

  const copyCode = () => {
    if (classData.private_code) {
      navigator.clipboard.writeText(classData.private_code);
      toast.success('Invite code copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {classData.title}
          </DialogTitle>
          <DialogDescription>
            Class details and enrollment management
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="enrollments">
              <Users className="w-4 h-4 mr-2" />
              Enrollments
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <ClassDetailsContent 
              classData={classData} 
              enrollmentCount={enrollmentCount}
              copyCode={copyCode}
            />
          </TabsContent>
          
          <TabsContent value="enrollments" className="mt-4">
            <ClassEnrollmentsManager 
              classId={classData.id} 
              className={classData.title}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Extracted details content component
const ClassDetailsContent = ({ 
  classData, 
  enrollmentCount,
  copyCode 
}: { 
  classData: ClassData; 
  enrollmentCount: number;
  copyCode: () => void;
}) => (
  <>
    {/* Class Image */}
    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
      <img 
        src={classData.image_url || DEFAULT_CLASS_IMAGE} 
        alt={classData.title}
        className="w-full h-full object-cover"
      />
    </div>

    {/* Description */}
    {classData.description && (
      <p className="text-sm text-muted-foreground">{classData.description}</p>
    )}

    {/* Info Grid */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Grade Range</p>
        <p className="font-medium">
          {classData.grade_min === classData.grade_max 
            ? `Grade ${classData.grade_min}` 
            : `Grade ${classData.grade_min} - ${classData.grade_max}`}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Monthly Fee</p>
        <p className="font-medium">
          {classData.is_private ? 'Free (Private)' : `Rs. ${classData.monthly_fee_amount.toLocaleString()}`}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Enrolled Students</p>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {enrollmentCount}
            {classData.max_students && ` / ${classData.max_students}`}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Created</p>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {format(new Date(classData.created_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>

    {/* Private Class Info */}
    {classData.is_private && (
      <div className="p-4 bg-muted rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-warning" />
          <span className="font-medium">Private Class</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Invite Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-background rounded font-mono text-lg font-bold tracking-wider">
              {classData.private_code || 'N/A'}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {classData.max_students && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Student Limit</span>
            <Badge variant="outline">{classData.max_students} max</Badge>
          </div>
        )}
      </div>
    )}
  </>
);

export default ClassDetailDialog;
