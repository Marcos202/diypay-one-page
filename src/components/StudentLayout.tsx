import { ReactNode } from 'react';
import { Settings, Monitor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatUserName } from "@/lib/utils";
import { PullToRefresh } from '@/components/PullToRefresh';
import { UserProfileMenu } from '@/components/ui/user-profile-menu';
import { NotificationBell } from '@/components/NotificationBell';

interface StudentLayoutProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
}

export function StudentLayout({ children, onRefresh }: StudentLayoutProps) {
  const { signOut, profile, toggleView } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleView = () => {
    toggleView();
    navigate('/dashboard');
  };

  const isProducer = profile?.role === 'producer';
  const displayName = profile?.full_name && profile.full_name.trim() 
    ? formatUserName(profile.full_name) 
    : (profile?.email ? profile.email.split('@')[0] : 'Usuário');
  const userInitial = displayName.charAt(0).toUpperCase();
  const userEmail = profile?.email || '';

  const getNavItems = () => {
    const items: Array<{
      icon: React.ReactNode;
      label: string;
      onClick: () => void;
      isSeparator?: boolean;
    }> = [
      {
        icon: <Settings className="h-full w-full" />,
        label: 'Meu Perfil',
        onClick: () => navigate('/members/profile'),
      },
    ];

    if (isProducer) {
      items.push({
        icon: <Monitor className="h-full w-full" />,
        label: 'Painel do Produtor',
        onClick: handleToggleView,
        isSeparator: true,
      });
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-violet-700 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="https://diymidia.com.br/wp-content/uploads/2025/08/Icon-DiyPay-2.0-branco.png" 
                alt="Logo DiyPay" 
                className="h-12" 
              />
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {isProducer && <NotificationBell />}
              <UserProfileMenu
                user={{
                  name: displayName,
                  email: userEmail,
                  initial: userInitial,
                  avatarUrl: profile?.avatar_url,
                }}
                navItems={getNavItems()}
                onLogout={handleSignOut}
                triggerVariant="glass"
              />
            </div>
          </div>
        </div>
      </header>
      <PullToRefresh onRefresh={onRefresh}>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {children}
        </main>
      </PullToRefresh>
    </div>
  );
}
