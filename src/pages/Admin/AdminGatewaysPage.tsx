
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Settings } from 'lucide-react';

interface PaymentGateway {
  id: string;
  gateway_name: string;
  gateway_identifier: string;
  is_active: boolean;
  priority: number;
  credentials: any;
  created_at: string;
  updated_at: string;
}

interface GatewayFormData {
  is_active: boolean;
  priority: number;
  credentials: Record<string, string>;
  fixed_fee_reais: string;
}

const AdminGatewaysPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch gateways and platform settings
  const { data: gatewaysData, isLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-payment-gateways');
      if (error) throw error;
      return data;
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('default_fixed_fee_cents')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Update gateway mutation
  const updateGatewayMutation = useMutation({
    mutationFn: async ({ gatewayId, updateData }: { gatewayId: string; updateData: any }) => {
      const { data, error } = await supabase.functions.invoke('update-payment-gateway', {
        body: {
          gateway_id: gatewayId,
          ...updateData,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      setIsDialogOpen(false);
      toast({
        title: 'Sucesso',
        description: 'Gateway atualizado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar gateway',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<GatewayFormData>();

  const handleManageGateway = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    const fixedFeeReais = platformSettings?.default_fixed_fee_cents 
      ? (platformSettings.default_fixed_fee_cents / 100).toFixed(2).replace('.', ',')
      : '1,00';
    
    form.reset({
      is_active: gateway.is_active,
      priority: gateway.priority,
      credentials: gateway.credentials || {},
      fixed_fee_reais: fixedFeeReais,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: GatewayFormData) => {
    if (!selectedGateway) return;

    // Convert fixed_fee_reais to cents
    const fixedFeeCents = Math.round(
      parseFloat(data.fixed_fee_reais.replace(',', '.')) * 100
    );

    const updateData = {
      is_active: data.is_active,
      priority: data.priority,
      credentials: data.credentials,
      fixed_fee_cents: fixedFeeCents,
    };

    updateGatewayMutation.mutate({
      gatewayId: selectedGateway.id,
      updateData,
    });
  };

  const getCredentialFields = (gatewayIdentifier: string) => {
    switch (gatewayIdentifier) {
      case 'iugu':
        return [
          { key: 'api_key', label: 'API Key', type: 'password' },
          { key: 'account_id', label: 'Account ID', type: 'text' },
        ];
      case 'asaas':
        return [{ key: 'api_key', label: 'API Key', type: 'password' }];
      case 'stripe':
        return [
          { key: 'publishable_key', label: 'Chave Publicável', type: 'text' },
          { key: 'secret_key', label: 'Chave Secreta', type: 'password' },
        ];
      case 'mercadopago':
        return [
          { key: 'public_key', label: 'Chave Pública', type: 'text' },
          { key: 'access_token', label: 'Access Token', type: 'password' },
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const gateways = gatewaysData?.gateways || [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Gateways de Pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure e gerencie os provedores de pagamento disponíveis no sistema.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gateways.map((gateway: PaymentGateway) => (
              <TableRow key={gateway.id}>
                <TableCell className="font-medium">{gateway.gateway_name}</TableCell>
                <TableCell>
                  <Badge variant={gateway.is_active ? 'default' : 'secondary'}>
                    {gateway.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>{gateway.priority}</TableCell>
                <TableCell>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageGateway(gateway)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gerenciar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          Gerenciar {selectedGateway?.gateway_name}
                        </DialogTitle>
                      </DialogHeader>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Ativar Gateway
                                  </FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Habilitar ou desabilitar este gateway de pagamento
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prioridade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="fixed_fee_reais"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa Fixa por Transação (R$)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="1,00"
                                    {...field}
                                  />
                                </FormControl>
                                <div className="text-sm text-muted-foreground">
                                  Taxa fixa aplicada a todas as transações (formato: 1,50)
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-4">
                            <Label className="text-base font-semibold">Credenciais</Label>
                            {selectedGateway &&
                              getCredentialFields(selectedGateway.gateway_identifier).map(
                                (credField) => (
                                  <FormField
                                    key={credField.key}
                                    control={form.control}
                                    name={`credentials.${credField.key}` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{credField.label}</FormLabel>
                                        <FormControl>
                                          <Input
                                            type={credField.type}
                                            {...field}
                                            value={field.value || ''}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>  
                                    )}
                                  />
                                )
                              )}
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsDialogOpen(false)}
                              disabled={updateGatewayMutation.isPending}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              disabled={updateGatewayMutation.isPending}
                            >
                              {updateGatewayMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Salvar Alterações
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminGatewaysPage;
