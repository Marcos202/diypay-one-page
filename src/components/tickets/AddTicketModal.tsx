import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTicketModal({ isOpen, onClose, onSuccess }: AddTicketModalProps) {
  const [formData, setFormData] = useState({
    product_id: "",
    batch_id: "",
    name: "",
    email: "",
    cpf: "",
  });

  const { data: events } = useQuery({
    queryKey: ['event-products-modal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('product_type', 'event')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const { data: batches } = useQuery({
    queryKey: ['ticket-batches-modal', formData.product_id],
    queryFn: async () => {
      if (!formData.product_id) return [];
      const { data, error } = await supabase.functions.invoke('get-ticket-batches', {
        body: { product_id: formData.product_id }
      });
      if (error) throw error;
      return data.batches || [];
    },
    enabled: !!formData.product_id && isOpen,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      const { data, error } = await supabase.functions.invoke('create-manual-ticket', {
        body: ticketData
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Ingresso criado com sucesso!" });
      onSuccess();
      onClose();
      setFormData({
        product_id: "",
        batch_id: "",
        name: "",
        email: "",
        cpf: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar ingresso",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.product_id || !formData.batch_id || !formData.name || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    createTicketMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Ingresso Manualmente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="event">Evento *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value, batch_id: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.product_id && (
            <div>
              <Label htmlFor="batch">Lote *</Label>
              <Select
                value={formData.batch_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, batch_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {batches?.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} - {batch.sold_quantity}/{batch.total_quantity} vendidos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="name">Nome do Participante *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? "Criando..." : "Criar Ingresso"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
