import { Button } from '@/components/ui/button';
import { Settings, LogOut, Monitor, BookOpen, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatUserName } from "@/lib/utils";

export function UserProfileHeader() {
  const { signOut, user, profile, toggleView } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleView = () => {
    toggleView();
    navigate('/dashboard');
  };

  const isProducer = profile?.role === 'producer';
  const isOnSpacesPage = location.pathname.startsWith('/members/spaces/');
  const displayName = profile?.full_name && profile.full_name.trim() 
    ? formatUserName(profile.full_name) 
    : (profile?.email ? profile.email.split('@')[0] : 'Usuário');
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-2 h-12 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/40 text-white">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-violet-100 text-violet-800 font-bold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-sm">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/members/profile')}>
            <Settings className="mr-2 h-4 w-4" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/notificacoes')}>
            <Bell className="mr-2 h-4 w-4" />
            Notificações
          </DropdownMenuItem>
          {isOnSpacesPage && (
            <DropdownMenuItem onClick={() => navigate('/members')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Meus Cursos
            </DropdownMenuItem>
          )}
          {isProducer && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleView}>
                <Monitor className="mr-2 h-4 w-4" />
                Painel do Produtor
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}