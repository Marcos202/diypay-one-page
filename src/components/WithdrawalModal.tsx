import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

export const WithdrawalModal = ({ isOpen, onClose, availableBalance }: WithdrawalModalProps) => {
  const [amount, setAmount] = useState("");
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get withdrawal fee settings
  const { data: platformSettings } = useQuery({
    queryKey: ['platform-fees'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-fees');
      if (error) throw error;
      return data;
    },
  });

  const { data: producerSettings } = useQuery({
    queryKey: ['producer-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('get-producer-settings', {
        body: { producer_id: user.id }
      });
      if (error) throw error;
      return data;
    },
  });

  // Calculate withdrawal fee
  useEffect(() => {
    if (platformSettings?.data && producerSettings?.data) {
      const defaultFee = platformSettings.data.default_withdrawal_fee_cents || 367;
      const customFee = producerSettings.data.custom_withdrawal_fee_cents;
      setWithdrawalFee(customFee !== null ? customFee : defaultFee);
    } else if (platformSettings?.data) {
      setWithdrawalFee(platformSettings.data.default_withdrawal_fee_cents || 367);
    }
  }, [platformSettings, producerSettings]);

  const withdrawalMutation = useMutation({
    mutationFn: async (amountCents: number) => {
      const { data, error } = await supabase.functions.invoke('request-withdrawal', {
        body: { amount_cents: amountCents }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Solicitação de saque enviada",
        description: "Sua solicitação foi registrada e será analisada pela nossa equipe.",
      });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
      queryClient.invalidateQueries({ queryKey: ['producer-financials'] });
      onClose();
      setAmount("");
    },
    onError: (error: any) => {
      console.error('Withdrawal error:', error);
      toast({
        title: "Erro ao solicitar saque",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(numericAmount * 100);
    const totalRequired = amountCents + withdrawalFee;
    
    if (totalRequired > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você precisa de R$ ${(totalRequired / 100).toFixed(2)} (valor + taxa) mas tem apenas R$ ${(availableBalance / 100).toFixed(2)} disponível.`,
        variant: "destructive",
      });
      return;
    }

    withdrawalMutation.mutate(amountCents);
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor para saque</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={withdrawalMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Saldo disponível: {formatCurrency(availableBalance)}
            </p>
            {withdrawalFee > 0 && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de saque: {formatCurrency(withdrawalFee)}
                </p>
                {amount && !isNaN(parseFloat(amount.replace(',', '.'))) && (
                  <p className="text-sm text-muted-foreground">
                    Total a ser debitado: {formatCurrency(Math.round(parseFloat(amount.replace(',', '.')) * 100) + withdrawalFee)}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={withdrawalMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={withdrawalMutation.isPending || !amount}
            >
              {withdrawalMutation.isPending ? "Processando..." : "Solicitar Saque"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};