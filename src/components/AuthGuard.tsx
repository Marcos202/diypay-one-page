
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'user' | 'producer' | 'admin';
  requiredView?: 'producer' | 'student';
}

export const AuthGuard = ({ 
  children, 
  requireAuth = false,
  requiredRole,
  requiredView
}: AuthGuardProps) => {
  const { user, profile, loading, activeView } = useAuth();
  const location = useLocation();

  // Mostrar loading apenas durante inicialização
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Verificar autenticação se necessário
  if (requireAuth && (!user || !profile)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar role se especificado
  if (requiredRole && profile?.role !== requiredRole) {
    const dashboardMap = {
      'producer': '/dashboard',
      'admin': '/admin/dashboard',
      'user': '/members'
    };
    
    const redirectTo = profile?.role ? dashboardMap[profile.role] : '/members';
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar view se especificado
  if (requiredView && activeView && activeView !== requiredView) {
    if (requiredView === 'producer' && profile?.role !== 'producer') {
      return <Navigate to="/members" replace />;
    }
    
    // Se o usuário é produtor mas está na view de student, 
    // apenas permitir o acesso sem redirecionamento forçado
    if (requiredView === 'producer' && profile?.role === 'producer') {
      // Permitir acesso - não forçar redirecionamento
    } else {
      const viewDashboard = activeView === 'producer' ? '/dashboard' : '/members';
      return <Navigate to={viewDashboard} replace />;
    }
  }

  return <>{children}</>;
};
