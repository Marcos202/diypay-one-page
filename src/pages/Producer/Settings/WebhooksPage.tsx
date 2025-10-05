// src/pages/Producer/Settings/WebhooksPage.tsx

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, Plus, MoreHorizontal, Loader2, Trash2, Eye, Edit, Send, Zap } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const webhookSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  url: z.string().url('A URL fornecida é inválida.'),
  event_types: z.array(z.string()).min(1, 'Selecione pelo menos um evento.'),
  product_id: z.string().optional(),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

const ALL_EVENTS = [
    { id: 'boleto.gerado', label: 'Boleto gerado' }, { id: 'pix.gerado', label: 'Pix gerado' },
    { id: 'carrinho.abandonado', label: 'Carrinho abandonado' }, { id: 'compra.recusada', label: 'Compra recusada' },
    { id: 'compra.aprovada', label: 'Compra aprovada' }, { id: 'reembolso', label: 'Reembolso' },
    { id: 'chargeback', label: 'Chargeback' }, { id: 'assinatura.cancelada', label: 'Assinatura cancelada' },
    { id: 'assinatura.atrasada', label: 'Assinatura atrasada' }, { id: 'assinatura.renovada', label: 'Assinatura renovada' },
];

// Componente para o Modal de Teste
const TestWebhookModal = ({ webhook, isOpen, onOpenChange }) => {
  const [selectedEvent, setSelectedEvent] = useState(ALL_EVENTS[0].id);

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-test-webhook', {
        body: {
          url: webhook.url,
          secret: webhook.secret,
          eventType: selectedEvent,
        }
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success('Webhook de teste enviado com sucesso!'),
    onError: (error: any) => toast.error('Falha ao enviar webhook de teste', { description: error.message }),
  });

  if (!webhook) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Testar Webhook</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>URL do Webhook (somente leitura)</Label>
            <Input value={webhook.url} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Token / Segredo (somente leitura)</Label>
            <Input value={webhook.secret} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Evento a ser enviado</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_EVENTS.map(event => <SelectItem key={event.id} value={event.id}>{event.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Alert>
            <AlertDescription>Será enviado um webhook de teste com dados fictícios para o evento selecionado.</AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => testWebhookMutation.mutate()} disabled={testWebhookMutation.isPending}>
            {testWebhookMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            Enviar teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [webhookToTest, setWebhookToTest] = useState<any>(null);
  
  const { data: webhooks, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ['producer-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-webhooks', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    }
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['producer-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-products-list', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const productsMap = useMemo(() => {
    if (!products) return new Map();
    return new Map(products.map((p: any) => [p.id, p.name]));
  }, [products]);
  
  const { control, handleSubmit, reset, watch } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: '', url: '', event_types: [], product_id: 'all' },
  });
  const formData = watch();

  const createOrUpdateMutation = useMutation({
    mutationFn: async (values: WebhookFormValues) => {
      const functionName = editingWebhook ? 'update-producer-webhook' : 'create-producer-webhook';
      const payload = editingWebhook 
        ? { 
            id: editingWebhook.id, 
            ...values,
            product_id: values.product_id === 'all' ? null : values.product_id,
          }
        : {
            ...values,
            product_id: values.product_id === 'all' ? null : values.product_id,
          };
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(editingWebhook ? 'Webhook atualizado com sucesso!' : 'Webhook criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['producer-webhooks'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error('Erro ao salvar webhook', { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-producer-webhook', {
        body: { id: webhookId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Webhook excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['producer-webhooks'] });
    },
    onError: (error: any) => toast.error('Erro ao excluir webhook', { description: error.message }),
  });

  const manualTriggerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manual-webhook-trigger', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Webhooks processados manualmente!', { 
        description: `${data.result?.processed || 0} jobs processados` 
      });
    },
    onError: (error: any) => toast.error('Erro ao processar webhooks', { description: error.message }),
  });

  const openModal = (webhook: any = null) => {
    setEditingWebhook(webhook);
    if (webhook) {
      reset({ 
        name: webhook.name, 
        url: webhook.url, 
        event_types: webhook.event_types,
        product_id: webhook.product_id || 'all'
      });
    } else {
      reset({ name: '', url: '', event_types: [], product_id: 'all' });
    }
    setIsModalOpen(true);
  };

  const openTestModal = (webhook: any) => { setWebhookToTest(webhook); setIsTestModalOpen(true); };
  const onSubmit = (data: WebhookFormValues) => createOrUpdateMutation.mutate(data);

  return (
    <ProducerLayout>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">Gerencie as notificações para integrações externas.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Endpoints Configurados</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => manualTriggerMutation.mutate()}
                disabled={manualTriggerMutation.isPending}
              >
                {manualTriggerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Processar Fila
              </Button>
              <Button onClick={() => openModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar webhook
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NOME</TableHead>
                <TableHead>PRODUTO</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingWebhooks ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : webhooks && webhooks.length > 0 ? (
                webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="text-muted-foreground">{webhook.product_id ? productsMap.get(webhook.product_id) || 'Produto não encontrado' : 'Todos os produtos'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{webhook.url}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openModal(webhook)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openTestModal(webhook)}><Send className="mr-2 h-4 w-4"/>Testar</DropdownMenuItem>
                          <DropdownMenuItem><Eye className="mr-2 h-4 w-4"/>Ver logs</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => deleteMutation.mutate(webhook.id)} disabled={deleteMutation.isPending}><Trash2 className="mr-2 h-4 w-4"/>Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : ( <TableRow><TableCell colSpan={4} className="text-center py-8">Nenhum webhook configurado.</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader><DialogTitle>{editingWebhook ? 'Editar Webhook' : 'Criar Novo Webhook'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller name="name" control={control} render={({ field, fieldState }) => (
                <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...field} placeholder="Ex: Integração com CRM" />
                    {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                </div>
            )} />
            <Controller name="url" control={control} render={({ field, fieldState }) => (
                <div className="space-y-2">
                    <Label htmlFor="url">URL do Webhook</Label>
                    <div className="flex items-center gap-2">
                        <Input id="url" {...field} placeholder="https://example.com/api/webhook" />
                        <Button type="button" variant="outline" onClick={() => openTestModal({ url: formData.url, secret: editingWebhook?.secret || 'Salve para gerar um token' })} disabled={!formData.url}>Testar</Button>
                    </div>
                    {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                </div>
            )} />
            
            <div className="space-y-2">
              <Label>Produtos</Label>
              <Controller
                name="product_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger disabled={isLoadingProducts}>
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os produtos</SelectItem>
                      {products?.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Eventos</Label>
              <Controller name="event_types" control={control} render={({ field, fieldState }) => (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md">
                    {ALL_EVENTS.map(event => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={event.id} 
                          checked={field.value.includes(event.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked 
                              ? [...field.value, event.id] 
                              : field.value.filter(id => id !== event.id);
                            field.onChange(newValue);
                          }}
                        />
                        <Label htmlFor={event.id} className="text-sm font-normal cursor-pointer">{event.label}</Label>
                      </div>
                    ))}
                  </div>
                  {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                </>
              )} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingWebhook ? 'Salvar Alterações' : 'Criar Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Teste */}
      <TestWebhookModal webhook={webhookToTest} isOpen={isTestModalOpen} onOpenChange={setIsTestModalOpen} />
    </ProducerLayout>
  );
}