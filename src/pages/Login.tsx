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
      // Format phone for email-like login
      const formattedPhone = phone.replace(/\D/g, '');
      const phoneEmail = `${formattedPhone}@phone.alict.lk`;

      const { error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password,
      });

      if (error) throw error;

      toast.success('Login successful!');
      // Redirect handled by PublicOnlyRoute on next render
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const siteName = settings?.site_name || 'A/L ICT';
  const bgStyle = settings?.login_bg_url
    ? { backgroundImage: `url(${settings.login_bg_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="relative min-h-screen flex flex-col" style={settings?.login_bg_url ? { backgroundImage: `url(${settings.login_bg_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)' }}>
      {/* Overlay */}
      {settings?.login_bg_url && <div className="absolute inset-0 bg-black/60 z-0" />}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-4 py-8 gap-12">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left lg:flex-1 lg:max-w-lg">
          <div className="mb-6">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={siteName} className="w-20 h-20 object-contain mx-auto lg:mx-0 mb-4 rounded-xl" />
            ) : (
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
              {siteName}
            </h1>
            <p className="text-lg md:text-xl text-slate-300">
              Advanced Level ICT Education
            </p>
          </div>
          <p className="text-slate-400 text-sm md:text-base max-w-md">
            Master Information & Communication Technology with comprehensive lessons, practice papers, and expert guidance.
          </p>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-sm">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-2xl p-8 shadow-2xl dark:text-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
              Sign in to continue learning
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="07XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-12 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Register Link */}
              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Create Account
                </Link>
              </div>
            </form>

            {/* Papers & Playground Buttons */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full dark:border-slate-600 dark:text-slate-300 gap-2 text-sm"
                onClick={() => window.open('/playground', '_blank', 'noopener,noreferrer')}
              >
                🖥️ Playground
              </Button>
              <Link to="/papers" className="block">
                <Button variant="outline" className="w-full dark:border-slate-600 dark:text-slate-300 text-sm">
                  📄 Past Papers
                </Button>
              </Link>
            </div>

            {/* Footer Links */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/contact" className="hover:text-blue-600 transition-colors">
                Contact Us
              </Link>
              <span>•</span>
              <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">
                Refund
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center">
        <p className="text-slate-400 text-xs">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Login;
