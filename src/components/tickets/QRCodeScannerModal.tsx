import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QRCodeScannerModal({ isOpen, onClose, onSuccess }: QRCodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScan, setLastScan] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setManualCode("");
      setLastScan(null);
      return;
    }

    // Listener para leitor de código de barras USB
    let buffer = "";
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Detecta entrada rápida do leitor USB (típico de scanners)
      if (e.key === "Enter") {
        if (buffer.length > 5) {
          processCode(buffer);
          buffer = "";
        }
      } else {
        buffer += e.key;
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(bufferTimeout);
    };
  }, [isOpen]);

  const processCode = async (code: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // O código QR deve estar no formato: sale_id|attendee_id
      const [sale_id, attendee_id] = code.split("|");
      
      if (!sale_id || !attendee_id) {
        throw new Error("Código QR inválido");
      }

      const { error } = await supabase.functions.invoke('toggle-check-in', {
        body: { sale_id, attendee_id }
      });

      if (error) throw error;

      setLastScan({ success: true, message: "Check-in realizado com sucesso!" });
      toast({
        title: "Check-in realizado!",
        description: "Participante confirmado"
      });
      
      // Tocar som de sucesso
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktf0zHksBSR2x/DdkEAKFF60o");
      audio.play().catch(() => {});
      
      onSuccess();
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setLastScan(null), 3000);
    } catch (error: any) {
      setLastScan({ success: false, message: error.message });
      toast({
        title: "Erro no check-in",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setManualCode("");
    }
  };

  const handleManualScan = () => {
    if (manualCode.trim()) {
      processCode(manualCode.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scanner de QR Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
            {lastScan ? (
              <div className={`space-y-2 ${lastScan.success ? 'text-green-600' : 'text-red-600'}`}>
                {lastScan.success ? (
                  <CheckCircle2 className="h-16 w-16 mx-auto" />
                ) : (
                  <XCircle className="h-16 w-16 mx-auto" />
                )}
                <p className="font-medium">{lastScan.message}</p>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <p className="text-lg font-medium">Aguardando leitura...</p>
                <p className="text-sm">
                  Aponte o leitor de código de barras para o QR Code do ingresso
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-code">Ou digite o código manualmente:</Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Cole ou digite o código"
                onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
              />
              <Button 
                onClick={handleManualScan}
                disabled={isProcessing || !manualCode.trim()}
              >
                Processar
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 Dica: Este scanner funciona com:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Leitores de código de barras USB</li>
              <li>Entrada manual do código</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
