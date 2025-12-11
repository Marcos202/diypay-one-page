import * as React from 'react';
import { Settings, Monitor, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatUserName } from "@/lib/utils";
import { UserProfileMenu } from '@/components/ui/user-profile-menu';

export function UserProfileHeader() {
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
      {
        icon: <BookOpen className="h-full w-full" />,
        label: 'Meus Cursos',
        onClick: () => navigate('/members'),
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
    <div className="fixed top-4 right-4 z-50">
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
  );
}
