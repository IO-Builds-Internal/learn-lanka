import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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

  // Fetch profile and roles - returns the roles for immediate use
  const fetchProfileAndRoles = async (userId: string): Promise<string[]> => {
    setRolesLoading(true);
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
      ]);
      
      setProfile(profileResult.data);
      const userRoles = rolesResult.data?.map(r => r.role) || ['student'];
      setRoles(userRoles);
      return userRoles;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setRoles(['student']);
      return ['student'];
    } finally {
      setRolesLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRoles(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // INITIAL load - controls isLoading
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch roles BEFORE setting loading false - critical for admin detection
        if (session?.user) {
          await fetchProfileAndRoles(session.user.id);
        } else {
          setRolesLoading(false);
        }
      } catch (error) {
        console.error('Error during initial auth setup:', error);
        setRolesLoading(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Listener for ONGOING auth changes - does NOT control isLoading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Await so roles are ready before any route checks
          await fetchProfileAndRoles(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setRolesLoading(false);
        }
      }
    );

    initializeAuth();

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
