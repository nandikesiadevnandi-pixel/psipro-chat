import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'supervisor' | 'agent';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAgent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load profile and role for a user
  const loadUserData = async (userId: string) => {
    console.log('🔍 [AuthContext] Loading user data for:', userId);
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ [AuthContext] Error loading profile:', profileError);
      } else if (profileData) {
        console.log('✅ [AuthContext] Profile loaded:', profileData);
        setProfile(profileData as Profile);
      } else {
        console.warn('⚠️ [AuthContext] No profile found for user:', userId);
      }

      // Load role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('❌ [AuthContext] Error loading role:', roleError);
      } else if (roleData) {
        console.log('✅ [AuthContext] Role loaded:', roleData.role);
        setRole(roleData.role as AppRole);
      } else {
        console.warn('⚠️ [AuthContext] No role found for user:', userId);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error in loadUserData:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer loading user data
          setTimeout(() => {
            loadUserData(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadUserData(currentSession.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
      navigate('/whatsapp');
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error) {
      toast({
        title: "Cadastro realizado com sucesso",
        description: "Você já pode fazer login no sistema.",
      });
      navigate('/whatsapp');
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate('/auth');
  };

  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const isAgent = role === 'agent';

  console.log('🔐 [AuthContext] Current auth state:', { 
    userId: user?.id, 
    role, 
    isAdmin, 
    isSupervisor, 
    isAgent,
    profileEmail: profile?.id
  });

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isSupervisor,
    isAgent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
