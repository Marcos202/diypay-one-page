import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Monitor, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatUserName } from "@/lib/utils";

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { signOut, user, profile, toggleView } = useAuth();
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
  // Garante que está usando full_name e não email
  const displayName = profile?.full_name && profile.full_name.trim() 
    ? formatUserName(profile.full_name) 
    : (profile?.email ? profile.email.split('@')[0] : 'Usuário');
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-2 h-12 rounded-lg hover:bg-violet-600 text-white">
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
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
