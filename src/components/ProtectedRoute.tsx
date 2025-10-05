
import { AuthGuard } from '@/components/AuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredView?: 'producer' | 'student';
  requiredRole?: 'user' | 'producer' | 'admin';
}

const ProtectedRoute = ({ 
  children, 
  requiredView,
  requiredRole
}: ProtectedRouteProps) => {
  return (
    <AuthGuard 
      requireAuth={true}
      requiredRole={requiredRole}
      requiredView={requiredView}
    >
      {children}
    </AuthGuard>
  );
};

export default ProtectedRoute;
