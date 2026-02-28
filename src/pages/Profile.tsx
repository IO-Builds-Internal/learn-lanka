import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  School, 
  MapPin, 
  Calendar, 
  GraduationCap,
  Edit,
  LogOut,
  ChevronRight,
  Award,
  BookOpen,
  CreditCard,
  Loader2,
  Camera,
  Tag,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StudentLayout from '@/components/layouts/StudentLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import EditProfileDialog from '@/components/profile/EditProfileDialog';
import { format } from 'date-fns';

const Profile = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, profile, signOut, loading, refreshProfile } = auth;
  const currentYearMonth = new Date().toISOString().slice(0, 7);

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'APPROVED');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch available coupons (not yet used by this user)
  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['available-coupons', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get all active coupons
      const { data: coupons, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true);
      
      if (couponsError) throw couponsError;
      
      // Get user's used coupons
      const { data: usedCoupons, error: usedError } = await supabase
        .from('coupon_usages')
        .select('coupon_id')
        .eq('user_id', user.id);
      
      if (usedError) throw usedError;
      
      const usedCouponIds = new Set(usedCoupons?.map(u => u.coupon_id) || []);
      const now = new Date();
      
      // Filter available coupons
      return (coupons || []).filter(coupon => {
        // Not already used
        if (usedCouponIds.has(coupon.id)) return false;
        
        // Not expired
        if (coupon.valid_until && new Date(coupon.valid_until) < now) return false;
        
        // Already valid (or no start date)
        if (coupon.valid_from && new Date(coupon.valid_from) > now) return false;
        
        // Not exceeded max uses
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return false;
        
        return true;
      });
    },
    enabled: !!user,
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Coupon code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Extract just phone number from synthetic email
  const getPhoneDisplay = () => {
    if (profile?.phone) {
      // Remove any @phone.*.lk suffix
      return profile.phone.replace(/@phone\.[^@]+$/i, '');
    }
    return '';
  };


  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG or WebP image');
      return;
    }

    // Validate file size (2MB max for avatars)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file (will overwrite if exists)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL (add cache buster)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl } as any)
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile photo updated!');
      refreshProfile();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!profile) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Please log in to view your profile</p>
          <Link to="/login">
            <Button>Log In</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  return (
    <StudentLayout>
      <div className="section-spacing max-w-2xl mx-auto">
        {/* Profile Header */}
        <Card className="card-elevated">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Avatar with upload */}
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Avatar 
                  className="w-14 h-14 sm:w-20 sm:h-20 cursor-pointer border-2 border-primary/20"
                  onClick={handleAvatarClick}
                >
                  <AvatarImage src={(profile as any).avatar_url} alt={profile.first_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl font-semibold">
                    {initials || <User className="w-6 h-6 sm:w-8 sm:h-8" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {profile.grade ? `Grade ${profile.grade}` : 'Student'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    {getPhoneDisplay()}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)} className="shrink-0">
                <Edit className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>

              <EditProfileDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                profile={profile}
                onSuccess={refreshProfile}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-accent mx-auto mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4 text-center">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-success mx-auto mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{payments.length}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <School className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">School</p>
                  <p className="font-medium">{profile.school_name || 'Not specified'}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-medium">{profile.grade ? `Grade ${profile.grade}` : 'Not specified'}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Birthday</p>
                  <p className="font-medium">
                    {profile.birthday 
                      ? new Date(profile.birthday).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{profile.address || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Coupons */}
        {availableCoupons.length > 0 && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-success" />
                Available Coupons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableCoupons.map((coupon) => (
                <div 
                  key={coupon.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-success">{coupon.code}</span>
                      <Badge variant="outline" className="text-xs">
                        {coupon.discount_type === 'PERCENT' 
                          ? `${coupon.discount_value}% off` 
                          : coupon.discount_type === 'FULL' 
                            ? 'Free' 
                            : `Rs. ${coupon.discount_value} off`}
                      </Badge>
                    </div>
                    {coupon.valid_until && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {format(new Date(coupon.valid_until), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCoupon(coupon.code)}
                    className="shrink-0"
                  >
                    {copiedCode === coupon.code ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Use these codes at checkout to get discounts
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            <Link 
              to="/rank-papers" 
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-accent" />
                <span className="font-medium">Rank Papers</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Separator />
            <Link 
              to="/papers" 
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-medium">Past Papers</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Separator />
            <Link 
              to="/notifications" 
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-success" />
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </StudentLayout>
  );
};

export default Profile;
