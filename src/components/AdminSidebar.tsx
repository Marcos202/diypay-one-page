import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, CreditCard, Users, DollarSign, Percent, Menu, X, UserCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const AdminSidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // === A CORREÇÃO ESTÁ AQUI ===
  // Atualizamos todos os `href` para a nova estrutura de rotas /admin/...
  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard', // ANTES: /admin-dashboard
      icon: BarChart3,
    },
    {
      title: 'Produtores',
      href: '/admin/producers', // ANTES: /admin-producers
      icon: Users,
    },
    {
      title: 'Verificações',
      href: '/admin/verifications', // ANTES: /admin-verifications
      icon: UserCheck,
    },
    {
      title: 'Financeiro',
      href: '/admin/financials', // ANTES: /admin-financials
      icon: DollarSign,
    },
    {
      title: 'Páginas',
      href: '/admin/pages', // ANTES: /admin-pages
      icon: FileText,
    },
    {
      title: 'Taxas e Prazos',
      href: '/admin/fees', // ANTES: /admin-fees
      icon: Percent,
    },
    {
      title: 'Gateways de Pagamento',
      href: '/admin/gateways', // ANTES: /admin-gateways
      icon: CreditCard,
    },
  ];

  const isActive = (path: string) => {
    // A lógica 'startsWith' agora funciona perfeitamente com a nova estrutura
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  // Corrigindo um pequeno bug visual: o item "Páginas" não ficava ativo.
                  // Agora, com 'startsWith', ele ficará ativo em /admin/pages, /admin/pages/new, etc.
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-background border-r">
        <SidebarContent />
      </div>
    </>
  );
};

export default AdminSidebar;
