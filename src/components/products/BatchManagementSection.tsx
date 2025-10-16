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
  localBatches?: any[];
  onLocalBatchesChange?: (batches: any[]) => void;
  mode?: 'create' | 'edit';
}

export function BatchManagementSection({ productId, basePrice, localBatches = [], onLocalBatchesChange, mode = 'edit' }: BatchManagementSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Use local batches in create mode, database batches in edit mode
  const isCreateMode = mode === 'create' || !productId;

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
    enabled: !!productId,
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
    if (isCreateMode) {
      // In create mode, manage batches locally
      if (selectedBatch) {
        // Update existing batch in local state
        const updatedBatches = localBatches.map(batch => 
          batch.temp_id === selectedBatch.temp_id ? { ...batch, ...batchData } : batch
        );
        onLocalBatchesChange?.(updatedBatches);
      } else {
        // Add new batch to local state
        const newBatch = {
          ...batchData,
          temp_id: `temp_${Date.now()}`, // Temporary ID for local management
          sold_quantity: 0
        };
        onLocalBatchesChange?.([...localBatches, newBatch]);
      }
      setIsModalOpen(false);
      setSelectedBatch(null);
      toast({ title: selectedBatch ? "Lote atualizado!" : "Lote criado!" });
    } else {
      // In edit mode, save to database
      if (selectedBatch) {
        updateBatchMutation.mutate({ batch_id: selectedBatch.id, updates: batchData });
      } else {
        createBatchMutation.mutate(batchData);
      }
    }
  };

  const handleEdit = (batch: any) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleDelete = (batchIdOrTempId: string) => {
    setBatchToDelete(batchIdOrTempId);
  };

  const confirmDelete = () => {
    if (batchToDelete) {
      if (isCreateMode) {
        // In create mode, remove from local state
        const updatedBatches = localBatches.filter(batch => 
          batch.temp_id !== batchToDelete && batch.id !== batchToDelete
        );
        onLocalBatchesChange?.(updatedBatches);
        setBatchToDelete(null);
        toast({ title: "Lote excluído!" });
      } else {
        // In edit mode, delete from database
        deleteBatchMutation.mutate(batchToDelete);
      }
    }
  };

  // Use local or database batches depending on mode
  const displayBatches = isCreateMode ? localBatches : (batches || []);
  const canAddMoreBatches = displayBatches.length < 10;

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

      {!isCreateMode && isLoading ? (
        <Card className="p-4">
          <p className="text-center text-muted-foreground">Carregando lotes...</p>
        </Card>
      ) : displayBatches.length > 0 ? (
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
                {displayBatches.map((batch: any) => (
                  <tr key={batch.id || batch.temp_id} className="border-b last:border-0">
                    <td className="p-4">{batch.name}</td>
                    <td className="p-4">
                      {batch.sold_quantity || 0} / {batch.total_quantity}
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
                          onClick={() => handleDelete(batch.id || batch.temp_id)}
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
        isFirstBatch={displayBatches.length === 0}
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
