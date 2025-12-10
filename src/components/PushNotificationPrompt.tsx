import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PushNotificationPrompt({ open, onClose }: Props) {
  const { requestPermission, isSupported } = usePushNotifications();
  
  if (!isSupported) return null;

  const handleAllow = async () => {
    await requestPermission();
    localStorage.setItem('push-prompt-shown', 'true');
    onClose();
  };

  const handleDeny = () => {
    localStorage.setItem('push-prompt-shown', 'true');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Ativar Notificações de Venda?</DialogTitle>
          <DialogDescription className="text-center">
            Receba alertas instantâneos quando uma venda for aprovada, mesmo com o celular bloqueado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleDeny} className="w-full sm:w-auto">
            <BellOff className="h-4 w-4 mr-2" />
            Agora não
          </Button>
          <Button onClick={handleAllow} className="w-full sm:w-auto">
            <Bell className="h-4 w-4 mr-2" />
            Ativar Notificações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
