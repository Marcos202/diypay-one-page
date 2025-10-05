import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  cpf_cnpj: string | null;
  phone: string | null;
  instagram_handle: string | null;
  role: 'user' | 'producer' | 'admin';
  iugu_customer_id: string | null;
  created_at: string;
  updated_at: string;
  verification_status: 'pending_submission' | 'pending_approval' | 'approved' | 'rejected';
  person_type: 'PF' | 'PJ' | null;
  cpf: string | null;
  birth_date: string | null;
  cnpj: string | null;
  company_name: string | null;
  trading_name: string | null;
  opening_date: string | null;
  company_phone: string | null;
  responsible_name: string | null;
  responsible_cpf: string | null;
  responsible_birth_date: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  social_contract_url: string | null;
}

type ActiveView = 'producer' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isGoogleUser: boolean;
  activeView: ActiveView | null;
  toggleView: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = session?.user ?? null;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // Função otimizada para buscar perfil
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }
      
      console.log('✅ Profile fetched successfully:', data);
      return data as Profile;
    } catch (error) {
      console.error('❌ Exception fetching profile:', error);
      return null;
    }
  }, []);

  // Função para limpar estado completamente
  const clearAuthState = useCallback(() => {
    console.log('🧹 Clearing auth state');
    setSession(null);
    setProfile(null);
    setActiveView(null);
  }, []);

  // Função para determinar a view baseada na rota atual
  const getViewFromRoute = useCallback((pathname: string): ActiveView => {
    // Rotas que são exclusivamente do painel de estudante
    if (pathname.startsWith('/members')) {
      return 'student';
    }
    // Rotas que são exclusivamente do painel de produtor
    if (pathname.startsWith('/dashboard') || 
        pathname.startsWith('/products') || 
        pathname.startsWith('/sales') || 
        pathname.startsWith('/members-area') || 
        pathname.startsWith('/spaces') || 
        pathname.startsWith('/personalize') || 
        pathname.startsWith('/producer') || 
        pathname.startsWith('/financials') || 
        pathname.startsWith('/settings')) {
      return 'producer';
    }
    // Para outras rotas, usar a view padrão baseada no role
    return 'producer'; // Padrão
  }, []);

  // Função simplificada para buscar perfil
  const loadUserProfile = useCallback(async (userId: string) => {
    const profile = await fetchUserProfile(userId);
    if (profile) {
      setProfile(profile);
      // Determinar a view baseada na rota atual para preservar o contexto
      const routeBasedView = getViewFromRoute(location.pathname);
      setActiveView(profile.role === 'producer' ? routeBasedView : 'student');
    }
    return profile;
  }, [fetchUserProfile, getViewFromRoute, location.pathname]);

  // Inicialização do auth - versão simplificada
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth system...');

        // 1. Buscar sessão atual PRIMEIRO
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        console.log('📋 Initial session found:', currentSession?.user?.id ? 'authenticated' : 'not authenticated');

        if (!mounted) return;

        // 2. Processar sessão inicial se existir
        if (currentSession?.user) {
          console.log('✅ Restoring session for user:', currentSession.user.id);
          setSession(currentSession);
          
          const userProfile = await fetchUserProfile(currentSession.user.id);
          if (mounted && userProfile) {
            setProfile(userProfile);
            // Determinar a view baseada na rota atual para preservar o contexto no refresh
            const routeBasedView = getViewFromRoute(location.pathname);
            setActiveView(userProfile.role === 'producer' ? routeBasedView : 'student');
            console.log('✅ Profile restored:', userProfile.full_name, 'View:', routeBasedView);
          }
        }

        // 3. Configurar listener DEPOIS da sessão inicial
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          console.log('🔄 Auth change:', event, newSession?.user?.id || 'no user');
          
          if (event === 'SIGNED_OUT' || !newSession) {
            clearAuthState();
            // Lista de rotas públicas que não devem ser redirecionadas para login
            const publicRoutes = ['/', '/login', '/register'];
            const isPublicRoute = publicRoutes.includes(location.pathname) ||
              location.pathname.startsWith('/checkout/') ||
              location.pathname.startsWith('/payment-confirmation/') ||
              location.pathname.startsWith('/p/');
            
            if (!isPublicRoute) {
              navigate('/login', { replace: true });
            }
            return;
          }

          if (event === 'TOKEN_REFRESHED') {
            setSession(newSession);
            return;
          }

          if (event === 'SIGNED_IN' && newSession?.user) {
            console.log('✅ User signed in, processing profile...');
            setSession(newSession);
            
            // Fetch or create profile for Google users
            fetchUserProfile(newSession.user.id).then(userProfile => {
              if (userProfile) {
                console.log('✅ Profile loaded:', userProfile.full_name);
                setProfile(userProfile);
                // Determinar a view baseada na rota atual para preservar contexto em refreshs de token
                const routeBasedView = getViewFromRoute(location.pathname);
                setActiveView(userProfile.role === 'producer' ? routeBasedView : 'student');
                
                // Handle Google Auth redirect - só redirecionar em páginas públicas, não em navegação normal
                const isGoogleProvider = newSession.user.app_metadata?.provider === 'google';
                const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';
                
                // Só redirecionar se estiver em uma página pública E for um login recente (não refresh de token)
                if (isGoogleProvider && isPublicPage && event === 'SIGNED_IN') {
                  console.log('🔀 Redirecting Google user to dashboard');
                  navigate('/dashboard', { replace: true });
                }
              }
            });
          }
        });
        
        authSubscription = subscription;

        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }

      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchUserProfile, getViewFromRoute, location.pathname, clearAuthState, navigate]); // Dependências corretas

  // Redirecionamento após login - executado apenas quando auth está inicializado E apenas para páginas de auth
  useEffect(() => {
    if (!authInitialized || loading || !profile) return;

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    
    // Só redirecionar se estiver realmente em uma página de autenticação
    // Não redirecionar se já estiver navegando no sistema
    if (isAuthPage) {
      const roleRedirects = {
        'producer': '/dashboard',
        'admin': '/admin/dashboard', 
        'user': '/members'
      };
      
      const redirectTo = roleRedirects[profile.role] || '/';
      console.log('🔀 Redirecting from auth page to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [profile, location.pathname, navigate, authInitialized, loading]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName, email: email }
        }
      });
      if (error) return { error: error.message };
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            verification_status: 'pending_submission'
          });
        if (profileError) console.error('Error creating profile:', profileError);
      }
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) return { error: error.message };
      return {};
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user...');
      clearAuthState();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error);
        toast.error('Erro ao fazer logout.');
      } else {
        console.log('✅ Successfully signed out');
        toast.success('Logout realizado com sucesso.');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('❌ Exception during sign out:', error);
      toast.error('Erro ao fazer logout.');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Usuário não autenticado' };
    
    try {
      console.log('🔄 Updating profile:', updates);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      
      setProfile(data as Profile);
      console.log('✅ Profile updated successfully');
      return {};
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      return { error: error.message };
    }
  };

  const toggleView = () => {
    if (profile?.role === 'producer') {
      setActiveView(prevView => prevView === 'producer' ? 'student' : 'producer');
      console.log('🔄 View toggled to:', activeView === 'producer' ? 'student' : 'producer');
    }
  };

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    isGoogleUser,
    activeView,
    toggleView,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile
  }), [user, session, profile, loading, isGoogleUser, activeView, toggleView, signUp, signIn, signInWithGoogle, signOut, updateProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
