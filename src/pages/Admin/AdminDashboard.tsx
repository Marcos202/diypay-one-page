
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DollarSign, BarChart3, Users, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/core/ConfirmationModal';

const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState('last_30_days');
  const [showCleanupConfirmation, setShowCleanupConfirmation] = useState(false);
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-data', dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-admin-dashboard-data', {
        body: { date_filter: dateFilter }
      });

      if (error) {
        console.error('Error fetching admin dashboard data:', error);
        throw error;
      }

      return data;
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-spaces');
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      const cleanedCount = result?.cleaned_count || 0;
      toast.success(`Limpeza concluída! ${cleanedCount} painéis órfãos removidos.`);
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-data'] });
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao executar limpeza';
      if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    }
  });

  const handleCleanupConfirm = () => {
    setShowCleanupConfirmation(false);
    cleanupMutation.mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (error) {
    console.error('Dashboard error:', error);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard do Administrador</h1>
            <p className="text-muted-foreground mt-2">
              Visão geral das métricas e atividades da plataforma.
            </p>
          </div>
          
          <div className="w-48">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="this_year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Ferramentas de Limpeza */}
      <Card className="mb-8 border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Ferramentas de Limpeza
          </CardTitle>
          <CardDescription>
            Ferramentas para manutenção e limpeza de dados órfãos no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-orange-700">Limpar Painéis Órfãos</h4>
              <p className="text-sm text-orange-600 mt-1">
                Remove painéis na área de membros que referenciam produtos excluídos.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCleanupConfirmation(true)}
              disabled={cleanupMutation.isPending}
              className="border-orange-200 text-orange-700 hover:bg-orange-100 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {cleanupMutation.isPending ? 'Executando...' : 'Executar Limpeza'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Movimentado
            </CardTitle>
            <CardDescription>
              Volume total de transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">
                {dashboardData?.kpis?.valorTotalMovimentado 
                  ? formatCurrency(dashboardData.kpis.valorTotalMovimentado)
                  : 'R$ 0,00'
                }
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valor Total Lucro
            </CardTitle>
            <CardDescription>
              Receita total da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">
                {dashboardData?.kpis?.valorTotalLucro 
                  ? formatCurrency(dashboardData.kpis.valorTotalLucro)
                  : 'R$ 0,00'
                }
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução do Faturamento
            </CardTitle>
            <CardDescription>
              Faturamento diário da plataforma no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : dashboardData?.chartData && dashboardData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={showCleanupConfirmation}
        onClose={() => setShowCleanupConfirmation(false)}
        onConfirm={handleCleanupConfirm}
        title="Confirmar Limpeza de Painéis Órfãos"
        description="Esta ação irá remover permanentemente todos os painéis na área de membros que referenciam produtos já excluídos. Esta ação não pode ser desfeita. Deseja continuar?"
      />
    </div>
  );
};

export default AdminDashboard;
