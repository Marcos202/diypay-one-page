import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPlatformInstructions, getPlatformName } from './PlatformInstructions';
import { PlatformOS, BrowserType } from '@/hooks/usePlatformDetection';
import { CheckCircle2 } from 'lucide-react';

interface InstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PlatformOS;
  browser: BrowserType;
}

export const InstructionsDialog = ({
  open,
  onOpenChange,
  platform,
  browser
}: InstructionsDialogProps) => {
  const instructions = getPlatformInstructions(platform, browser);
  const platformName = getPlatformName(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Como instalar no {platformName}
          </DialogTitle>
          <DialogDescription>
            Siga os passos abaixo para adicionar o DiyPay à sua tela inicial
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <ol className="space-y-4">
            {instructions.map((step, index) => (
              <li key={index} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-foreground">
                    {step.text}
                  </p>
                  {step.note && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <div className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Após a instalação, o DiyPay funcionará como um aplicativo nativo, 
                com acesso offline e experiência otimizada.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
