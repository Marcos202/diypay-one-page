import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, User, Settings, Bell, Monitor, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { formatUserName } from "@/lib/utils";
import { UserProfileMenu } from "@/components/ui/user-profile-menu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#", label: "Taxa" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Sobre" },
  { href: "#", label: "Suporte" },
];

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isLoggedIn = !!user;
  const currentRole = profile?.role ?? 'user';
  const displayName = profile?.full_name && profile.full_name.trim() 
    ? formatUserName(profile.full_name) 
    : (profile?.email ? profile.email.split('@')[0] : 'Usuário');
  const userInitial = displayName.charAt(0).toUpperCase();
  const userEmail = profile?.email || user?.email || '';

  const getRoleDashboardLink = (role: string) => {
    switch (role) {
      case 'producer': return '/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/members';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const getNavItems = () => {
    const items = [
      {
        icon: <User className="h-full w-full" />,
        label: 'Minha Conta',
        onClick: () => navigate('/settings/account'),
      },
      {
        icon: <Bell className="h-full w-full" />,
        label: 'Notificações',
        onClick: () => navigate('/notificacoes'),
      },
      {
        icon: <Monitor className="h-full w-full" />,
        label: `Painel ${currentRole === 'producer' ? 'Produtor' : 'Membro'}`,
        onClick: () => navigate(getRoleDashboardLink(currentRole)),
        isSeparator: true,
      },
    ];

    if (currentRole === 'producer') {
      items.push({
        icon: <Settings className="h-full w-full" />,
        label: 'Configurações',
        onClick: () => navigate('/settings'),
        isSeparator: false,
      });
    }

    return items;
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo-diypay.png" alt="Logo DiyPay" className="h-12" />
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`
                  font-bold text-base rounded-md px-4 py-2 transition-colors
                  ${isActive(link.href)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-violet-700 hover:bg-slate-50'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <Button asChild variant="ghost" className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-violet-600 hover:bg-violet-700 font-bold">
                  <Link to="/register">Cadastrar-se</Link>
                </Button>
              </>
            ) : (
              <UserProfileMenu
                user={{
                  name: displayName,
                  email: userEmail,
                  initial: userInitial,
                }}
                navItems={getNavItems()}
                onLogout={signOut}
              />
            )}
          </div>

          {/* Menu Mobile */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.label} asChild>
                    <Link to={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {!isLoggedIn ? (
                  <>
                    <DropdownMenuItem asChild><Link to="/login">Entrar</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/register">Cadastrar-se</Link></DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/settings/account')}>
                      <User className="mr-2 h-4 w-4" />
                      Minha Conta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/notificacoes')}>
                      <Bell className="mr-2 h-4 w-4" />
                      Notificações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(getRoleDashboardLink(currentRole))}>
                      <Monitor className="mr-2 h-4 w-4" />
                      Painel
                    </DropdownMenuItem>
                    {currentRole === 'producer' && (
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600">
                      Sair
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
