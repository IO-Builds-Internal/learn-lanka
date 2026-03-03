import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';

type Step = 'phone' | 'otp' | 'details';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>('phone');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: settings } = useSiteSettings();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alreadyRegisteredError, setAlreadyRegisteredError] = useState(false);

  const siteName = settings?.site_name || 'A/L ICT';

  useEffect(() => {
    const state = location.state as { phone?: string; otpVerified?: boolean } | null;
    if (state?.phone && state?.otpVerified) {
      setPhone(state.phone);
      setStep('details');
    }
  }, [location.state]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlreadyRegisteredError(false);
    if (!phone || phone.length < 9) { toast.error('Please enter a valid phone number'); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', { body: { phone, purpose: 'REGISTER' } });
      if (error) throw error;
      if (data.alreadyRegistered) { setAlreadyRegisteredError(true); toast.error('This phone number is already registered'); return; }
      if (data.success) { toast.success('OTP sent successfully!'); setStep('otp'); }
      else throw new Error(data.error || 'Failed to send OTP');
    } catch (error: any) {
      if (error?.message?.includes('already registered')) setAlreadyRegisteredError(true);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { toast.error('Please enter a 6-digit OTP'); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', { body: { phone, otp, purpose: 'REGISTER' } });
      if (error) throw error;
      if (data.success && data.verified) {
        if (data.userExists) { toast.info('Account already exists. Please login.'); navigate('/login'); }
        else setStep('details');
      } else throw new Error(data.error || 'Invalid OTP');
    } catch (error: any) { toast.error(error.message || 'Failed to verify OTP'); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const formattedPhone = phone.replace(/\D/g, '');
      const phoneEmail = `${formattedPhone}@phone.alict.lk`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: phoneEmail,
        password,
        options: { data: { first_name: firstName, last_name: lastName, phone: formattedPhone, school_name: schoolName, birthday, address, grade: parseInt(grade) } },
      });
      if (authError) throw authError;
      if (authData.user) {
        await supabase.from('profiles').update({ first_name: firstName, last_name: lastName, phone: formattedPhone, school_name: schoolName, birthday, address, grade: parseInt(grade) }).eq('id', authData.user.id);
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) { toast.error(error.message || 'Failed to create account'); }
    finally { setIsLoading(false); }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await supabase.functions.invoke('send-otp', { body: { phone, purpose: 'REGISTER' } });
      toast.success('OTP resent successfully!');
    } catch { toast.error('Failed to resend OTP'); }
    finally { setIsLoading(false); }
  };

  const stepOrder: Step[] = ['phone', 'otp', 'details'];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-5">
      {stepOrder.map((s, index) => (
        <div key={s} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            step === s ? 'bg-primary text-primary-foreground'
              : index < stepOrder.indexOf(step) ? 'bg-success text-success-foreground'
              : 'bg-muted text-muted-foreground'
          }`}>
            {index < stepOrder.indexOf(step) ? <Check className="w-3.5 h-3.5" /> : index + 1}
          </div>
          {index < 2 && <div className={`w-6 h-0.5 mx-1 ${index < stepOrder.indexOf(step) ? 'bg-success' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(215 25% 10%), hsl(215 25% 18%), hsl(174 62% 15%))' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
        {/* Compact branding */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center mb-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={siteName} className="w-12 h-12 object-contain rounded-xl" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary-foreground" />
              </div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{siteName}</h1>
          <p className="text-white/60 text-xs sm:text-sm">Advanced Level ICT Education</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-5 sm:p-8 shadow-2xl border border-border/30">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-1">Create Account</h2>
            <p className="text-muted-foreground text-center text-sm mb-4">
              {step === 'phone' && 'Enter your phone number to get started'}
              {step === 'otp' && 'Enter the OTP sent to your phone'}
              {step === 'details' && 'Complete your profile'}
            </p>

            {renderStepIndicator()}

            {/* Step 1: Phone */}
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07XXXXXXXX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setAlreadyRegisteredError(false); }}
                      className={`pl-9 h-11 ${alreadyRegisteredError ? 'border-destructive' : ''}`}
                      required
                    />
                  </div>
                  {alreadyRegisteredError && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-1">
                      <p className="text-warning-foreground text-sm font-medium">Phone number already registered</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Please sign in with your existing account.</p>
                      <Link to="/login" className="inline-flex items-center gap-1 text-primary font-medium text-sm mt-1.5">
                        Go to Sign In <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</> : <>Send OTP <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-xl tracking-[0.5em] font-mono h-11"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">OTP sent to {phone}. Expires in 5 minutes.</p>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep('phone')} className="flex-1 h-11">
                    <ArrowLeft className="w-4 h-4 mr-2" />Back
                  </Button>
                  <Button type="submit" className="flex-1 h-11" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
                <button type="button" onClick={handleResendOtp} disabled={isLoading}
                  className="w-full text-sm text-primary hover:text-primary/80 font-medium">
                  Resend OTP
                </button>
              </form>
            )}

            {/* Step 3: Details */}
            {step === 'details' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input id="firstName" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input id="lastName" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="schoolName" className="text-sm">School Name</Label>
                  <Input id="schoolName" placeholder="Your school name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="birthday" className="text-sm">Birthday</Label>
                    <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="grade" className="text-sm">Grade</Label>
                    <Select value={grade} onValueChange={setGrade} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {[6,7,8,9,10,11,12,13].map((g) => (
                          <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="address" className="text-sm">Address</Label>
                  <Input id="address" placeholder="Your address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>

                <Button type="submit" className="w-full h-11 mt-1" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account...</> : 'Create Account'}
                </Button>
              </form>
            )}

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:text-primary/80">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 px-4 text-center">
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Register;
