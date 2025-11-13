import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const HomeRedirect = () => {
  const navigate = useNavigate();
  const { user, profile, loading, activeView } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (profile) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }

      if (profile.role === 'producer' || activeView === 'producer') {
        navigate('/dashboard', { replace: true });
        return;
      }

      navigate('/members', { replace: true });
    }
  }, [loading, user, profile, activeView, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default HomeRedirect;
