import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { usePlatformDetection } from '@/hooks/usePlatformDetection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { InstructionsDialog } from '@/components/InstructionsDialog';
import { getPlatformName } from '@/components/PlatformInstructions';

const DownloadPage = () => {
  const { canInstall, isInstalled, isPWA, installPWA } = usePWA();
  const platform = usePlatformDetection();
  const [installing, setInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'windows' | 'android' | 'ios'>('windows');

  const handlePlatformInstall = async (platformId: 'windows' | 'android' | 'ios') => {
    const isCurrentPlatform = platformId === platform.os;
    const canAutoInstall = isCurrentPlatform && platform.supportsPWA && canInstall;

    if (canAutoInstall) {
      setInstalling(true);
      const success = await installPWA();
      
      if (success) {
        toast.success('App instalado com sucesso!', {
          description: 'O DiyPay foi adicionado à sua tela inicial.'
        });
      } else {
        toast.error('Erro ao instalar', {
          description: 'Tente novamente ou use o menu do navegador.'
        });
      }
      setInstalling(false);
    } else {
      setSelectedPlatform(platformId);
      setShowInstructions(true);
    }
  };

  const platforms = [
    {
      id: 'windows' as const,
      name: 'Windows',
      icon: '/icons/windows.png',
      description: 'Instale no seu PC'
    },
    {
      id: 'android' as const,
      name: 'Android',
      icon: '/icons/android.png',
      description: 'Instale no seu celular'
    },
    {
      id: 'ios' as const,
      name: 'iPhone/iPad',
      icon: '/icons/ios.png',
      description: 'Instale no iPhone/iPad'
    }
  ];

  if (isPWA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">App Instalado!</h2>
            <p className="text-muted-foreground">
              O DiyPay já está instalado e rodando no seu dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src="/logo-diypay.png" alt="DiyPay" className="h-8" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <img 
              src="/logo-512x512.png" 
              alt="DiyPay Logo" 
              className="w-32 h-32 mx-auto rounded-3xl shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            DiyPay
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Instale nosso app e acesse uma plataforma de vendas online rápida, moderna e de alta performance.
          </p>

          {isInstalled && (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg mb-8">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">App já instalado</span>
            </div>
          )}
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {platforms.map((platformItem) => {
            const isCurrentPlatform = platformItem.id === platform.os;
            const canAutoInstall = isCurrentPlatform && platform.supportsPWA && canInstall && !isInstalled;

            return (
              <Card 
                key={platformItem.id}
                className={`cursor-pointer hover:shadow-xl transition-all ${
                  isCurrentPlatform ? 'ring-2 ring-primary shadow-lg' : ''
                } ${installing ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => !installing && handlePlatformInstall(platformItem.id)}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <img 
                      src={platformItem.icon} 
                      alt={platformItem.name} 
                      className="w-12 h-12" 
                    />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {platformItem.name}
                      </h3>
                      {isCurrentPlatform && (
                        <Badge variant="secondary" className="text-xs">
                          Seu dispositivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {platformItem.description}
                    </p>
                  </div>

                  <Button 
                    className="w-full"
                    variant={canAutoInstall ? "default" : "outline"}
                    disabled={installing}
                  >
                    {installing && canAutoInstall ? (
                      <>Instalando...</>
                    ) : canAutoInstall ? (
                      <>
                        <Download className="w-4 h-4" />
                        Instalar Agora
                      </>
                    ) : (
                      <>
                        <Info className="w-4 h-4" />
                        Ver Instruções
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            O app funciona em todos os navegadores modernos. 
            Tamanho: ~5MB • Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
          {platform.os !== 'unknown' && (
            <p className="text-xs text-muted-foreground">
              Detectamos: {getPlatformName(platform.os)} • {platform.browser}
            </p>
          )}
        </div>
      </div>

      {/* Instructions Dialog */}
      <InstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
        platform={selectedPlatform}
        browser={platform.browser}
      />
    </div>
  );
};

export default DownloadPage;
