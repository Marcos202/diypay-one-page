
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalRequest {
  id: string;
  amount_cents: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  producer: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

const AdminFinancialsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch all withdrawal requests
  const { data: withdrawalRequests, isLoading } = useQuery({
    queryKey: ['admin-withdrawal-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-all-withdrawal-requests');
      if (error) throw error;
      return data.data as WithdrawalRequest[];
    },
  });

  // Process withdrawal request mutation
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, newStatus, notes }: { requestId: string; newStatus: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('process-withdrawal-request', {
        body: {
          request_id: requestId,
          new_status: newStatus,
          admin_notes: notes
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-requests'] });
      toast({
        title: "Solicitação processada",
        description: `Saque ${data.new_status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso.`,
      });
      setProcessingId(null);
    },
    onError: (error: any) => {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar solicitação de saque.",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const handleProcessWithdrawal = (requestId: string, newStatus: string) => {
    setProcessingId(requestId);
    processWithdrawalMutation.mutate({ requestId, newStatus });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', icon: Clock, variant: 'secondary' as const },
      approved: { label: 'Aprovado', icon: CheckCircle, variant: 'default' as const },
      rejected: { label: 'Rejeitado', icon: XCircle, variant: 'destructive' as const },
      paid: { label: 'Pago', icon: CheckCircle, variant: 'default' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      icon: AlertCircle,
      variant: 'secondary' as const
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingRequests = withdrawalRequests?.filter(req => req.status === 'pending') || [];
  const processedRequests = withdrawalRequests?.filter(req => req.status !== 'pending') || [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todas as operações financeiras da plataforma.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Solicitações Pendentes ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Histórico ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Solicitações de Saque Pendentes
              </CardTitle>
              <CardDescription>
                Aprove ou rejeite as solicitações de saque dos produtores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-muted-foreground">Carregando...</div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação pendente
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data da Solicitação</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead>Valor Solicitado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          {formatDate(request.requested_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {request.producer.full_name || 'Nome não informado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.producer.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(request.amount_cents)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleProcessWithdrawal(request.id, 'approved')}
                              disabled={processingId === request.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleProcessWithdrawal(request.id, 'rejected')}
                              disabled={processingId === request.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Histórico de Saques
              </CardTitle>
              <CardDescription>
                Registro completo de todas as solicitações processadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-muted-foreground">Carregando...</div>
                </div>
              ) : processedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum saque processado ainda
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data da Solicitação</TableHead>
                      <TableHead>Data do Processamento</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          {formatDate(request.requested_at)}
                        </TableCell>
                        <TableCell>
                          {request.processed_at ? formatDate(request.processed_at) : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {request.producer.full_name || 'Nome não informado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.producer.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(request.amount_cents)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {request.admin_notes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFinancialsPage;
