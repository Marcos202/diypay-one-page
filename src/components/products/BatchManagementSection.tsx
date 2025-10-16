import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BatchModal } from "./BatchModal";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/core/ConfirmationModal";

interface BatchManagementSectionProps {
  productId: string | undefined;
  basePrice: number;
  mode?: 'create' | 'edit';
}

export function BatchManagementSection({ productId, basePrice, mode }: BatchManagementSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['ticket-batches', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ticket-batches-handler', {
        method: 'GET',
        body: { product_id: productId }
      });
      if (error) throw error;
      return data.batches || [];
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (batchData: any) => {
      const { data, error } = await supabase.functions.invoke('ticket-batches-handler', {
        method: 'POST',
        body: { ...batchData, product_id: productId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-batches', productId] });
      toast({ title: "Lote criado com sucesso!" });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar lote",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batch_id, updates }: any) => {
      const { data, error } = await supabase.functions.invoke('ticket-batches-handler', {
        method: 'PUT',
        body: { batch_id, updates }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-batches', productId] });
      toast({ title: "Lote atualizado com sucesso!" });
      setIsModalOpen(false);
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar lote",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batch_id: string) => {
      const { data, error } = await supabase.functions.invoke('ticket-batches-handler', {
        method: 'DELETE',
        body: { batch_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-batches', productId] });
      toast({ title: "Lote excluído com sucesso!" });
      setBatchToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir lote",
        description: error.message,
        variant: "destructive"
      });
      setBatchToDelete(null);
    }
  });

  const handleSave = (batchData: any) => {
    if (selectedBatch) {
      updateBatchMutation.mutate({ batch_id: selectedBatch.id, updates: batchData });
    } else {
      createBatchMutation.mutate(batchData);
    }
  };

  const handleEdit = (batch: any) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleDelete = (batchId: string) => {
    setBatchToDelete(batchId);
  };

  const confirmDelete = () => {
    if (batchToDelete) {
      deleteBatchMutation.mutate(batchToDelete);
    }
  };

  const canAddMoreBatches = !batches || batches.length < 10;

  // Se estiver em modo criação OU sem productId, mostrar placeholder
  if (!productId || mode === 'create') {
    return (
      <div className="space-y-4 p-5 border-2 border-yellow-500/20 rounded-lg bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📋</span>
            Lotes
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure diferentes lotes com preços e quantidades variadas (máximo 10 lotes)
          </p>
          <div className="mt-4 p-4 border border-yellow-500/30 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              💡 Para configurar lotes, você precisa primeiro <strong>salvar o produto</strong>.
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              Após salvar, você poderá criar lotes com preços e quantidades personalizadas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Lotes</h3>
          <p className="text-sm text-muted-foreground">
            Configure diferentes lotes com preços e quantidades variadas (máximo 10 lotes)
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedBatch(null);
            setIsModalOpen(true);
          }}
          disabled={!canAddMoreBatches}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Lote
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-4">
          <p className="text-center text-muted-foreground">Carregando lotes...</p>
        </Card>
      ) : batches && batches.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Nome do Lote</th>
                  <th className="text-left p-4">Vendidos / Total</th>
                  <th className="text-left p-4">Preço</th>
                  <th className="text-right p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch: any) => (
                  <tr key={batch.id} className="border-b last:border-0">
                    <td className="p-4">{batch.name}</td>
                    <td className="p-4">
                      {batch.sold_quantity} / {batch.total_quantity}
                    </td>
                    <td className="p-4">
                      R$ {(batch.price_cents / 100).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(batch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(batch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum lote configurado ainda
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Lote
          </Button>
        </Card>
      )}

      <BatchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBatch(null);
        }}
        onSave={handleSave}
        batch={selectedBatch}
        basePrice={basePrice}
        isFirstBatch={!batches || batches.length === 0}
      />

      <ConfirmationModal
        isOpen={!!batchToDelete}
        onClose={() => setBatchToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Lote"
        description="Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
