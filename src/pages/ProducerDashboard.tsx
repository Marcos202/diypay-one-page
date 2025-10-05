import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  RotateCcw,
  Package, 
  Plus,
  Settings,
  Eye,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProducerLayout } from "@/components/ProducerLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { formatUserName } from '@/lib/utils';

const ProducerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("last_30_days");
  const [productFilter, setProductFilter] = useState("all");
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  // Check if we need to show welcome dialog
  const needsVerification = profile?.verification_status === 'pending_submission';
  
  // Show welcome dialog when component mounts if verification is needed
  useEffect(() => {
    // Check sessionStorage to see if popup was already shown
    const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
    
    if (needsVerification && !dismissedWelcome && !welcomePopupShown) {
      setShowWelcomeDialog(true);
    }
  }, [needsVerification, dismissedWelcome]);

  const handleCloseWelcomeDialog = () => {
    setShowWelcomeDialog(false);
    setDismissedWelcome(true);
    // Mark popup as shown for this session
    sessionStorage.setItem('welcomePopupShown', 'true');
  };

  const { data, isLoading } = useQuery({
    queryKey: ['producerDashboard', dateFilter, productFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-dashboard-v2', {
        body: { 
          date_filter: dateFilter,
          product_id: productFilter === "all" ? null : productFilter
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000, // 30 segundos para dados sempre frescos
    enabled: !!profile, // Só executa se profile existir
  });

  // Só mostra o conteúdo quando os dados estão prontos ou quando não há loading
  const showContent = !isLoading && data;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-[#4d0782] text-white border-[#4d0782] hover:bg-[#4d0782]">Pago</Badge>;
      case 'pending_payment':
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Falhado</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">Reembolsado</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">{status}</Badge>;
    }
  };

  const getDateFilterLabel = (filter: string) => {
    switch (filter) {
      case 'last_7_days': return 'Últimos 7 dias';
      case 'last_30_days': return 'Últimos 30 dias';
      case 'this_year': return 'Este ano';
      default: return 'Últimos 30 dias';
    }
  };

  return (
    <ProducerLayout>
              {/* Welcome Message */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Bem vindo, {data?.userName ? formatUserName(data.userName) : (profile?.full_name ? formatUserName(profile.full_name) : 'Produtor')}!
                  </h2>
                  {(profile?.verification_status === 'pending_submission' || profile?.verification_status === 'rejected') && (
                    <Link 
                      to="/settings/account" 
                      className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Complete seu cadastro
                    </Link>
                  )}
                </div>
              </div>

              {!showContent ? (
                <DashboardSkeleton />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                  {/* Main Content - Left Column */}
                  <div className="xl:col-span-3 space-y-6">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Valor Líquido Card */}
                      <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-purple-100">Valor líquido</CardTitle>
                          <CreditCard className="h-5 w-5 text-purple-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(data?.kpiValorLiquido || 0)}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Vendas Card */}
                      <Card className="bg-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-600">Vendas</CardTitle>
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-500">{data?.kpiVendasCount || 0}</div>
                        </CardContent>
                      </Card>

                      {/* Reembolso Card */}
                      <Card className="bg-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-600">Reembolso</CardTitle>
                          <RotateCcw className="h-5 w-5 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-500">
                            {formatCurrency(data?.kpiReembolso || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Desempenho de vendas
                        </CardTitle>
                        <div className="flex gap-4">
                          <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                              <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                              <SelectItem value="this_year">Este ano</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={productFilter} onValueChange={setProductFilter}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Produto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os produtos</SelectItem>
                              {data?.products?.map((product: any) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.chartData || []}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis 
                                dataKey="name" 
                                className="text-sm text-slate-600"
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                className="text-sm text-slate-600"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `R$ ${value}`}
                              />
                              <Tooltip 
                                formatter={(value) => [`R$ ${value}`, 'Vendas']}
                                labelFormatter={(label) => `Data: ${label}`}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#8b5cf6" 
                                strokeWidth={3}
                                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#7c3aed' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Transactions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Transações Recentes</CardTitle>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to="/sales">Acessar todas as transações</Link>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b text-left">
                                <th className="pb-3 text-sm font-semibold text-slate-600">Data</th>
                                <th className="pb-3 text-sm font-semibold text-slate-600">Produto</th>
                                <th className="pb-3 text-sm font-semibold text-slate-600">Cliente</th>
                                <th className="pb-3 text-sm font-semibold text-slate-600">Status</th>
                                <th className="pb-3 text-sm font-semibold text-slate-600 text-right">Valor Líquido</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data?.recentTransactions?.length > 0 ? (
                                data.recentTransactions.map((transaction: any) => (
                                  <tr key={transaction.id} className="border-b hover:bg-slate-50">
                                    <td className="py-3 text-sm text-slate-600">
                                      {formatDate(transaction.created_at).split(' ')[0]}
                                    </td>
                                    <td className="py-3 text-sm font-medium">{transaction.product_name}</td>
                                    <td className="py-3 text-sm text-slate-600">{transaction.buyer_email}</td>
                                    <td className="py-3">{getStatusBadge(transaction.status)}</td>
                                    <td className="py-3 text-sm font-semibold text-right">
                                      {formatCurrency(transaction.amount)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-500">
                                    Nenhuma transação encontrada
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Sidebar */}
                  <div className="space-y-6">
                    {/* Saldo Disponível */}
                    <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-white font-semibold">Saldo Disponível</CardTitle>
                        <CardDescription className="text-purple-100">Disponível para saque</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold mb-4">
                          {formatCurrency(data?.saldoDisponivel || 0)}
                        </div>
                        <Button 
                          className="w-full bg-white text-purple-700 hover:bg-purple-50 font-semibold"
                          asChild
                        >
                          <Link to="/financials">Solicitar Saque</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Saldo Pendente */}
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-white font-semibold">Saldo Pendente</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {formatCurrency(data?.saldoPendente || 0)}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Central Financeira */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-slate-800">Central Financeira</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <Link to="/financials">
                            <DollarSign className="mr-2 h-4 w-4" />
                            Ver Extrato
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <Link to="/sales">
                            <Eye className="mr-2 h-4 w-4" />
                            Histórico de Vendas
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Ações Rápidas */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-slate-800">Ações Rápidas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 font-semibold" asChild>
                          <Link to="/products/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Criar Novo Produto
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <Link to="/products">
                            <Package className="mr-2 h-4 w-4" />
                            Gerenciar Produtos
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <Link to="/complete-producer-profile">
                            <Settings className="mr-2 h-4 w-4" />
                            Configurações
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={handleCloseWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Bem-vindo à DiyPay!
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Finalize seu cadastro para liberar saques e funções avançadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCloseWelcomeDialog}
            >
              Depois
            </Button>
            <Button
              onClick={() => {
                handleCloseWelcomeDialog();
                navigate('/settings/account');
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Continuar cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerDashboard;