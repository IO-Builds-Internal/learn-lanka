import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import alStudentsLogo from '@/assets/alstudents-logo.png';

const subjects = [
  {
    key: 'ict',
    label: 'ICT',
    fullName: 'Information & Communication Technology',
    color: 'from-blue-600 to-indigo-700',
    accent: '#3b82f6',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    emoji: '💻',
    href: '/login',
    live: true,
  },
  {
    key: 'english',
    label: 'English',
    fullName: 'English Language & Literature',
    color: 'from-emerald-500 to-teal-600',
    accent: '#10b981',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    emoji: '📖',
    href: 'https://english.alstudent.lk',
    live: false,
  },
  {
    key: 'biology',
    label: 'Biology',
    fullName: 'Biology & Life Sciences',
    color: 'from-green-500 to-lime-600',
    accent: '#22c55e',
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    emoji: '🧬',
    href: 'https://biology.alstudent.lk',
    live: false,
  },
  {
    key: 'physics',
    label: 'Physics',
    fullName: 'Physics & Applied Mathematics',
    color: 'from-purple-600 to-violet-700',
    accent: '#8b5cf6',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    emoji: '⚛️',
    href: 'https://physics.alstudent.lk',
    live: false,
  },
];

const MainPortal = () => {
  const { user } = useAuth();

  const getIctHref = () => {
    if (user) return '/dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white overflow-x-hidden">
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={alStudentsLogo} alt="AL Students" className="w-12 h-12 object-contain" />
          <div>
            <div className="font-extrabold text-xl text-white tracking-tight leading-none">AL Students</div>
            <div className="text-xs text-blue-300 tracking-widest uppercase">Education Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
            >
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2 rounded-full border border-white/20 hover:border-white/40 text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
              >
                Register Free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Sri Lanka's A/L Student Community
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
          One Portal.<br />Every Subject.
        </h1>
        <p className="text-blue-200 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          A unified learning platform for Sri Lankan A/L students. Log in once and access all your subjects — classes, past papers, rank tests and more.
        </p>
      </section>

      {/* Subject Cards */}
      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-center text-blue-300 text-sm font-semibold uppercase tracking-widest mb-10">
          Choose Your Subject
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.map((subject) => {
            const isLive = subject.live;
            const href = subject.key === 'ict' ? getIctHref() : subject.href;

            const CardContent = (
              <div
                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isLive
                    ? 'border-blue-400/40 hover:border-blue-400/80 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer'
                    : 'border-white/10 opacity-70 cursor-not-allowed'
                }`}
              >
                {/* Card gradient top */}
                <div className={`h-2 w-full bg-gradient-to-r ${subject.color}`} />

                {/* Card body */}
                <div className="p-6 bg-white/5 backdrop-blur-sm">
                  <div className="text-4xl mb-4">{subject.emoji}</div>
                  <div className="font-black text-2xl text-white mb-1">{subject.label}</div>
                  <div className="text-sm text-blue-200/70 mb-5 leading-snug">{subject.fullName}</div>

                  {isLive ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Live Now
                      <span className="ml-auto text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-400/80">
                      <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                      Coming Soon
                    </div>
                  )}
                </div>
              </div>
            );

            return isLive ? (
              <Link key={subject.key} to={href}>
                {CardContent}
              </Link>
            ) : (
              <div key={subject.key}>{CardContent}</div>
            );
          })}
        </div>

        {/* One account note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-blue-200 text-sm">
            <span className="text-2xl">🔑</span>
            <span>One account gives you access to <strong className="text-white">all subjects</strong> as they launch</span>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-black text-white">1</div>
            <div className="text-blue-300 text-sm mt-1">Subject Live</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">4+</div>
            <div className="text-blue-300 text-sm mt-1">Coming Soon</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">∞</div>
            <div className="text-blue-300 text-sm mt-1">Learning Opportunities</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 px-6 text-blue-400/60 text-sm">
        <p>© {new Date().getFullYear()} AL Students · alstudent.lk · All rights reserved</p>
        <p className="mt-1 text-xs">
          <Link to="/contact" className="hover:text-blue-300 transition-colors">Contact</Link>
          {' · '}
          <Link to="/privacy-policy" className="hover:text-blue-300 transition-colors">Privacy</Link>
          {' · '}
          <Link to="/terms" className="hover:text-blue-300 transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
};

export default MainPortal;
