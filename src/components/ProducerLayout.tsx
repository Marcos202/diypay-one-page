import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, Repeat, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useProducerFinancialsStore } from '@/stores/producer-financials-store';

interface ProducerLayoutProps {
  children: ReactNode;
}

export function ProducerLayout({ children }: ProducerLayoutProps) {
  const { profile, signOut, toggleView } = useAuth();
  const navigate = useNavigate();
  const { financialData, fetchFinancialData } = useProducerFinancialsStore();

  // Fetch financial data only once when component mounts
  useEffect(() => {
    if (profile && !financialData) {
      fetchFinancialData();
    }
  }, [profile, financialData, fetchFinancialData]);

  const handleToggleView = () => {
    toggleView();
    navigate('/members');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
              <SidebarTrigger />
              <div className="flex items-center gap-4 ml-auto">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 p-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-purple-100 text-purple-800 text-sm font-semibold">
                          {(financialData?.userName || profile?.full_name || 'P').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{financialData?.userName || profile?.full_name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/settings/account" className="flex items-center gap-2 w-full">
                        <User className="h-4 w-4" />
                        Minha Conta
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleView} className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Painel do Aluno
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        signOut();
                        navigate('/login');
                      }}
                      className="flex items-center gap-2 text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="p-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}