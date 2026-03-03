import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (settings?.site_name) document.title = settings.site_name;
  }, [settings?.site_name]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || phone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedPhone = phone.replace(/\D/g, '');
      const phoneEmail = `${formattedPhone}@phone.alict.lk`;

      const { error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password,
      });

      if (error) throw error;

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const siteName = settings?.site_name || 'A/L ICT';

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={
        settings?.login_bg_url
          ? { backgroundImage: `url(${settings.login_bg_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, hsl(215 25% 10%), hsl(215 25% 18%), hsl(174 62% 15%))' }
      }
    >
      {/* Overlay */}
      {settings?.login_bg_url && <div className="absolute inset-0 bg-black/60 z-0" />}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
        {/* Logo & title - compact on mobile */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="flex items-center justify-center mb-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={siteName} className="w-14 h-14 sm:w-20 sm:h-20 object-contain rounded-xl" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1">
            {siteName}
          </h1>
          <p className="text-white/70 text-sm sm:text-base">Advanced Level ICT Education</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-5 sm:p-8 shadow-2xl border border-border/30">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-1">
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-5">
              Sign in to continue learning
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="07XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-11"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right -mt-1">
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Register Link */}
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:text-primary/80 font-semibold">
                  Create Account
                </Link>
              </div>
            </form>

            {/* Quick links */}
            <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => window.open('/playground', '_blank', 'noopener,noreferrer')}
              >
                🖥️ Playground
              </Button>
              <Link to="/papers" className="block">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  📄 Past Papers
                </Button>
              </Link>
            </div>

            {/* Footer links */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <span>•</span>
              <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund</Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 py-4 px-4 text-center">
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
