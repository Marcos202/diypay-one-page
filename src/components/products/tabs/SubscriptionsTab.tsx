
import { useState, useEffect } from 'react';
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
import { Search, Download, Filter, MoreHorizontal, Ban } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionsTabProps {
  productId?: string;
}

const SubscriptionsTab = ({ productId }: SubscriptionsTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled'>('all');

  const { data: subscriptionsData, isLoading, error } = useQuery({
    queryKey: ['product-subscriptions', productId],
    queryFn: async () => {
      if (!productId) return { subscriptions: [], stats: { totalActive: 0, monthlyRecurring: 0, totalSubscriptions: 0 } };

      const { data, error } = await supabase.functions.invoke('get-producer-subscriptions', {
        body: { productId }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!user,
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
      queryClient.invalidateQueries({ queryKey: ['product-subscriptions', productId] });
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
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirada</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-diypay-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando assinaturas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Erro ao carregar assinaturas</p>
      </div>
    );
  }

  const stats = subscriptionsData?.stats || { totalActive: 0, monthlyRecurring: 0, totalSubscriptions: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Assinaturas do Produto</h3>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Assinaturas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Faturamento Recorrente Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRecurring)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
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
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Todas ({stats.totalSubscriptions})
        </Button>
        <Button
          variant={statusFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('active')}
        >
          Ativas ({stats.totalActive})
        </Button>
        <Button
          variant={statusFilter === 'canceled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('canceled')}
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
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhuma assinatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((subscription: any) => (
                <TableRow key={subscription.id}>
                  <TableCell>{formatDate(subscription.created_at)}</TableCell>
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
      <div className="flex items-center justify-between">
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
    </div>
  );
};

export default SubscriptionsTab;
