import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Download, Filter, MoreHorizontal, Ban, Activity, DollarSign, BarChart } from "lucide-react";
import { toast } from "sonner";
import { ProducerLayout } from "@/components/ProducerLayout";

const ProducerSubscriptionsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled'>('all');

  const { data: subscriptionsData, isLoading, error } = useQuery({
    queryKey: ['producer-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-subscriptions', {
        body: {} // No productId means get all subscriptions
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minuto - dados de assinatura não mudam tão frequentemente
    refetchOnMount: true,
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, saleId }: { subscriptionId: string, saleId: string }) => {
      const { data, error } = await supabase.functions.invoke('cancel-iugu-subscription', {
        body: { subscriptionId, saleId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Assinatura cancelada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['producer-subscriptions'] });
    },
    onError: (error) => {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error('Erro ao cancelar assinatura');
    },
  });

  const filteredSubscriptions = subscriptionsData?.subscriptions?.filter((sub: any) => {
    const matchesSearch = sub.buyer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.products.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && (sub.status === 'paid' || sub.status === 'active');
    if (statusFilter === 'canceled') return matchesSearch && (sub.status === 'canceled' || sub.status === 'expired');
    
    return matchesSearch;
  }) || [];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return <Badge className="bg-[#4d0782] text-white border-[#4d0782] hover:bg-[#4d0782]">Ativa</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Cancelada</Badge>;
      case 'expired':
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">Expirada</Badge>;
      case 'pending':
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">Pendente</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">{status}</Badge>;
    }
  };

  const handleCancelSubscription = (subscription: any) => {
    if (window.confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      cancelSubscriptionMutation.mutate({
        subscriptionId: subscription.iugu_subscription_id,
        saleId: subscription.id
      });
    }
  };

  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando assinaturas...</p>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  if (error) {
    return (
      <ProducerLayout>
        <div className="text-center py-12">
          <p className="text-red-500">Erro ao carregar assinaturas</p>
        </div>
      </ProducerLayout>
    );
  }

  const stats = subscriptionsData?.stats || { totalActive: 0, monthlyRecurring: 0, totalSubscriptions: 0 };

  return (
    <ProducerLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Todas as Assinaturas</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as assinaturas dos seus produtos</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Assinaturas em andamento</p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Recorrente Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyRecurring)}</div>
            <p className="text-xs text-muted-foreground">Receita mensal recorrente</p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Assinaturas</CardTitle>
            <BarChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Todas as assinaturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente ou produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'bg-primary text-primary-foreground' : ''}
        >
          Todas ({stats.totalSubscriptions})
        </Button>
        <Button
          variant={statusFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('active')}
          className={statusFilter === 'active' ? 'bg-primary text-primary-foreground' : ''}
        >
          Ativas ({stats.totalActive})
        </Button>
        <Button
          variant={statusFilter === 'canceled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('canceled')}
          className={statusFilter === 'canceled' ? 'bg-primary text-primary-foreground' : ''}
        >
          Canceladas ({stats.totalSubscriptions - stats.totalActive})
        </Button>
      </div>

      {/* Subscriptions Table */}
      <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima Cobrança</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Nenhuma assinatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((subscription: any) => (
                        <TableRow key={subscription.id}>
                          <TableCell>{formatDate(subscription.created_at)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{subscription.products.name}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{subscription.profiles?.full_name || 'Nome não informado'}</div>
                              <div className="text-sm text-gray-500">{subscription.buyer_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {subscription.next_due_date ? formatDate(subscription.next_due_date) : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(subscription.producer_share_cents)}
                          </TableCell>
                          <TableCell>
                            {subscription.status === 'active' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleCancelSubscription(subscription)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancelar Assinatura
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-700">
          Mostrando {filteredSubscriptions.length} de {stats.totalSubscriptions} assinaturas
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled>
            Próximo
          </Button>
        </div>
      </div>
    </ProducerLayout>
  );
};

export default ProducerSubscriptionsPage;
