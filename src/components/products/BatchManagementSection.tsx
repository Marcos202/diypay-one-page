// src/components/products/BatchManagementSection.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BatchModal } from "./BatchModal";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/core/ConfirmationModal";

interface BatchManagementSectionProps {
  basePrice: number;
  batches: any[];
  onBatchesChange: (batches: any[]) => void;
  mode?: 'create' | 'edit';
  isLoading?: boolean;
}

// <<< CORREÇÃO: Componente agora é "burro". Ele apenas recebe os lotes e emite eventos de mudança. >>>
export function BatchManagementSection({ basePrice, batches, onBatchesChange, mode = 'edit', isLoading = false }: BatchManagementSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  
  const handleSave = (batchData: any) => {
    if (selectedBatch) {
      // Atualizar lote existente
      const updatedBatches = batches.map(b => 
        (b.id && b.id === selectedBatch.id) || (b.temp_id && b.temp_id === selectedBatch.temp_id)
          ? { ...b, ...batchData } 
          : b
      );
      onBatchesChange(updatedBatches);
      toast({ title: "Lote atualizado localmente!" });
    } else {
      // Adicionar novo lote
      const newBatch = {
        ...batchData,
        temp_id: `temp_${Date.now()}`,
        sold_quantity: 0,
        display_order: batches.length,
      };
      onBatchesChange([...batches, newBatch]);
      toast({ title: "Lote adicionado localmente!" });
    }
    setIsModalOpen(false);
    setSelectedBatch(null);
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
      const updatedBatches = batches.filter(b => {
        const idMatch = b.id && b.id === batchToDelete;
        const tempIdMatch = b.temp_id && b.temp_id === batchToDelete;
        return !idMatch && !tempIdMatch;
      });
      onBatchesChange(updatedBatches);
      setBatchToDelete(null);
      toast({ title: "Lote removido localmente!" });
    }
  };

  const canAddMoreBatches = batches.length < 10;
  
  // <<< CORREÇÃO: Lógica de placeholder para modo 'create' >>>
  if (mode === 'create') {
    // No modo de criação, a seção de gerenciamento já é exibida,
    // pois os lotes são gerenciados no estado local.
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
      ) : batches.length > 0 ? (
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
                  <tr key={batch.id || batch.temp_id} className="border-b last:border-0">
                    <td className="p-4">{batch.name}</td>
                    <td className="p-4">{batch.sold_quantity || 0} / {batch.total_quantity}</td>
                    <td className="p-4">R$ {(batch.price_cents / 100).toFixed(2).replace('.', ',')}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(batch)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(batch.id || batch.temp_id)}>
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
          <p className="text-muted-foreground mb-4">Nenhum lote configurado ainda</p>
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
        isFirstBatch={batches.length === 0 && !selectedBatch}
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
