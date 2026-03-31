import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  profile: any | null;
  roles: string[];
  isAdmin: boolean;
  isModerator: boolean;
  isTeacher: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  // Track last fetched userId to prevent duplicate/repeated fetches
  const lastFetchedUserId = useRef<string | null>(null);
  const fetchInProgress = useRef(false);

  const fetchProfileAndRoles = async (userId: string, force = false): Promise<string[]> => {
    // Skip if same user already fetched and not forced
    if (!force && lastFetchedUserId.current === userId && fetchInProgress.current === false) {
      return roles;
    }
    if (fetchInProgress.current) return roles;

    fetchInProgress.current = true;
    lastFetchedUserId.current = userId;
    setRolesLoading(true);
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      setProfile(profileResult?.data ?? null);
      const userRoles = rolesResult?.data?.map((r: any) => r.role) || ['student'];
      setRoles(userRoles);
      return userRoles;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setRoles(['student']);
      return ['student'];
    } finally {
      setRolesLoading(false);
      fetchInProgress.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRoles(user.id, true);
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session first, then listen for changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRoles(session.user.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setRolesLoading(false);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setLoading(false);
        setRolesLoading(false);
      }
    });

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Only re-fetch if user actually changed (e.g. new login, not token refresh)
          const isNewUser = lastFetchedUserId.current !== session.user.id;
          if (isNewUser || event === 'SIGNED_IN') {
            setTimeout(() => {
              if (isMounted) fetchProfileAndRoles(session.user.id, true);
            }, 0);
          }
        } else {
          lastFetchedUserId.current = null;
          setProfile(null);
          setRoles([]);
          setRolesLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    window.location.href = '/login';
  };

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator') || isAdmin;
  const isTeacher = roles.includes('teacher');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      rolesLoading,
      profile,
      roles,
      isAdmin,
      isModerator,
      isTeacher,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
