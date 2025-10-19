// src/components/products/BatchManagementSection.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BatchModal } from "./BatchModal";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/core/ConfirmationModal";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BatchManagementSectionProps {
  basePrice: number;
  batches: any[];
  onBatchesChange: (batches: any[]) => void;
  mode?: 'create' | 'edit';
  isLoading?: boolean;
}

export function BatchManagementSection({ basePrice, batches, onBatchesChange, mode = 'edit', isLoading = false }: BatchManagementSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [liveBatches, setLiveBatches] = useState<any[]>([]);
  
  const safeBatches = Array.isArray(batches) ? batches : [];

  console.log('🎫 BatchManagementSection renderizado:', {
    mode,
    batchCount: safeBatches.length,
    isLoading
  });
  
  // CORREÇÃO 3: Supabase Realtime para atualização em tempo real
  useEffect(() => {
    const batchIds = safeBatches.filter(b => b.id).map(b => b.id);
    
    if (batchIds.length === 0) {
      setLiveBatches([]);
      return;
    }

    const channel = supabase
      .channel('ticket_batches_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_batches',
          filter: `id=in.(${batchIds.join(',')})`,
        },
        (payload) => {
          console.log('🔄 Batch atualizado em tempo real:', payload.new);
          setLiveBatches(prev => {
            const updated = prev.filter(b => b.id !== payload.new.id);
            return [...updated, payload.new];
          });
        }
      )
      .subscribe();

    // Fetch inicial
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('ticket_batches')
        .select('id, sold_quantity, total_quantity')
        .in('id', batchIds);
      
      if (!error && data) {
        setLiveBatches(data);
      }
    };

    fetchInitialData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [safeBatches.map(b => b.id).join(',')]);
  
  // Mesclar dados ao vivo com lotes locais
  const enrichedBatches = safeBatches.map(batch => {
    const liveData = liveBatches.find(lb => lb.id === batch.id);
    return liveData ? { ...batch, sold_quantity: liveData.sold_quantity } : batch;
  });
  
  const handleSave = (batchData: any) => {
    if (selectedBatch) {
      // Atualizar lote existente
      const updatedBatches = safeBatches.map(b => 
        (b.id && b.id === selectedBatch.id) || (b.temp_id && b.temp_id === selectedBatch.temp_id)
          ? { ...b, ...batchData } 
          : b
      );
      onBatchesChange(updatedBatches);
      toast({ title: "Lote atualizado!" });
    } else {
      // Adicionar novo lote
      const newBatch = {
        ...batchData,
        temp_id: `temp_${Date.now()}`,
        sold_quantity: 0,
        display_order: safeBatches.length,
      };
      onBatchesChange([...safeBatches, newBatch]);
      toast({ title: "Lote criado!" });
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
      const updatedBatches = safeBatches.filter(b => {
        const idMatch = b.id && b.id === batchToDelete;
        const tempIdMatch = b.temp_id && b.temp_id === batchToDelete;
        // Mantém o lote se NENHUMA das condições de match for verdadeira
        return !idMatch && !tempIdMatch;
      });
      onBatchesChange(updatedBatches);
      setBatchToDelete(null);
      toast({ title: "Lote removido!" });
    }
  };

  const canAddMoreBatches = safeBatches.length < 10;
  
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
      ) : safeBatches.length > 0 ? (
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
                {enrichedBatches.map((batch: any) => {
                  const isSoldOut = batch.sold_quantity >= batch.total_quantity;
                  const percentSold = Math.round((batch.sold_quantity / batch.total_quantity) * 100);
                  
                  return (
                    <tr key={batch.id || batch.temp_id} className="border-b last:border-0">
                      <td className="p-4">{batch.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            isSoldOut && "text-red-600"
                          )}>
                            {batch.sold_quantity || 0} / {batch.total_quantity}
                          </span>
                          {percentSold === 100 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                              ESGOTADO
                            </span>
                          )}
                          {percentSold >= 90 && percentSold < 100 && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-medium">
                              ÚLTIMOS INGRESSOS
                            </span>
                          )}
                          {percentSold >= 70 && percentSold < 90 && (
                            <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded font-medium">
                              VENDENDO RÁPIDO
                            </span>
                          )}
                        </div>
                      </td>
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
                  );
                })}
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
        isFirstBatch={safeBatches.length === 0 && !selectedBatch}
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
