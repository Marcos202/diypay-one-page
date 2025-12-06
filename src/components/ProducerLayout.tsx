import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ProducerSidebar } from "@/components/ProducerSidebar";
import { Repeat, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useProducerFinancialsStore } from '@/stores/producer-financials-store';
import { PullToRefresh } from '@/components/PullToRefresh';
import { UserProfileMenu } from '@/components/ui/user-profile-menu';
import { NotificationBell } from '@/components/NotificationBell';
interface ProducerLayoutProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
}

export function ProducerLayout({ children, onRefresh }: ProducerLayoutProps) {
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
          <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4 border-b bg-white/80 backdrop-blur-sm">
              <SidebarTrigger />
              <div className="flex items-center gap-2 ml-auto">
                <NotificationBell />
                <UserProfileMenu
                  user={{
                    name: financialData?.userName || profile?.full_name || 'Produtor',
                    email: profile?.email || '',
                    initial: (financialData?.userName || profile?.full_name || 'P').charAt(0).toUpperCase(),
                    avatarUrl: profile?.avatar_url,
                  }}
                  navItems={[
                    {
                      icon: <User className="h-full w-full" />,
                      label: 'Minha Conta',
                      onClick: () => navigate('/settings/account'),
                    },
                    {
                      icon: <Repeat className="h-full w-full" />,
                      label: 'Painel do Aluno',
                      onClick: handleToggleView,
                      isSeparator: true,
                    },
                  ]}
                  onLogout={() => {
                    signOut();
                    navigate('/login');
                  }}
                />
              </div>
            </div>
            
            <PullToRefresh onRefresh={onRefresh}>
              <div className="p-3 sm:p-4 md:p-6 flex-1">
                {children}
              </div>
            </PullToRefresh>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}