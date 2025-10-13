import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batchData: any) => void;
  batch?: any;
  basePrice: number;
  isFirstBatch: boolean;
}

export function BatchModal({ isOpen, onClose, onSave, batch, basePrice, isFirstBatch }: BatchModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    total_quantity: 100,
    price_cents: basePrice,
    auto_advance_to_next: false,
    min_quantity_per_purchase: 1,
    max_quantity_per_purchase: null as number | null,
    sale_end_date: null as Date | null,
    useMinQuantity: false,
    useMaxQuantity: false,
    useSaleEndDate: false,
  });

  useEffect(() => {
    if (batch) {
      setFormData({
        name: batch.name,
        total_quantity: batch.total_quantity,
        price_cents: batch.price_cents,
        auto_advance_to_next: batch.auto_advance_to_next,
        min_quantity_per_purchase: batch.min_quantity_per_purchase || 1,
        max_quantity_per_purchase: batch.max_quantity_per_purchase,
        sale_end_date: batch.sale_end_date ? new Date(batch.sale_end_date) : null,
        useMinQuantity: !!batch.min_quantity_per_purchase && batch.min_quantity_per_purchase > 1,
        useMaxQuantity: !!batch.max_quantity_per_purchase,
        useSaleEndDate: !!batch.sale_end_date,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        price_cents: isFirstBatch ? basePrice : prev.price_cents,
      }));
    }
  }, [batch, basePrice, isFirstBatch]);

  const handleSubmit = () => {
    const dataToSave = {
      name: formData.name,
      total_quantity: formData.total_quantity,
      price_cents: formData.price_cents,
      auto_advance_to_next: formData.auto_advance_to_next,
      min_quantity_per_purchase: formData.useMinQuantity ? formData.min_quantity_per_purchase : 1,
      max_quantity_per_purchase: formData.useMaxQuantity ? formData.max_quantity_per_purchase : null,
      sale_end_date: formData.useSaleEndDate ? formData.sale_end_date?.toISOString() : null,
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch ? "Editar Lote" : "Adicionar Lote"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">Nome do Lote *</Label>
            <Input
              id="name"
              placeholder="Ex: Individual – 1º Lote"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="quantity">Quantidade de Ingressos *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.total_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 100 }))}
            />
          </div>

          <div>
            <Label htmlFor="price">Preço por Ingresso (R$) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={(formData.price_cents / 100).toFixed(2)}
              onChange={(e) => setFormData(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
              disabled={isFirstBatch && !batch}
            />
            {isFirstBatch && !batch && (
              <p className="text-sm text-muted-foreground mt-1">
                O primeiro lote deve ter o mesmo valor do produto
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Redirecionar para o próximo lote caso esgote</Label>
              <p className="text-sm text-muted-foreground">
                Libera automaticamente o próximo lote quando este atingir 100% das vendas
              </p>
            </div>
            <Switch
              checked={formData.auto_advance_to_next}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_advance_to_next: checked }))}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Quantidade mínima de ingressos</Label>
              <Switch
                checked={formData.useMinQuantity}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useMinQuantity: checked }))}
              />
            </div>
            {formData.useMinQuantity && (
              <Input
                type="number"
                min="1"
                max={formData.total_quantity}
                value={formData.min_quantity_per_purchase}
                onChange={(e) => setFormData(prev => ({ ...prev, min_quantity_per_purchase: parseInt(e.target.value) || 1 }))}
              />
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Quantidade máxima de ingressos</Label>
              <Switch
                checked={formData.useMaxQuantity}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useMaxQuantity: checked }))}
              />
            </div>
            {formData.useMaxQuantity && (
              <Input
                type="number"
                min="1"
                max={formData.total_quantity}
                value={formData.max_quantity_per_purchase || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, max_quantity_per_purchase: parseInt(e.target.value) || null }))}
              />
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Data para terminar as vendas</Label>
              <Switch
                checked={formData.useSaleEndDate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useSaleEndDate: checked }))}
              />
            </div>
            {formData.useSaleEndDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.sale_end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.sale_end_date ? format(formData.sale_end_date, "PPP") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.sale_end_date || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, sale_end_date: date || null }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.total_quantity}>
            {batch ? "Atualizar" : "Criar Lote"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
