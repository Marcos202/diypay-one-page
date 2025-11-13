import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

const DownloadPage = () => {
  const { canInstall, isInstalled, isPWA, installPWA } = usePWA();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    
    const success = await installPWA();
    
    if (success) {
      toast.success('App instalado com sucesso!', {
        description: 'O DiyPay foi adicionado à sua tela inicial.'
      });
    } else {
      toast.info('Instalação não disponível', {
        description: 'Use o menu do navegador para instalar o app.'
      });
    }
    
    setInstalling(false);
  };

  const platforms = [
    {
      name: 'Windows',
      icon: '/icons/windows.png',
      description: 'Instale no seu PC'
    },
    {
      name: 'Android',
      icon: '/icons/android.png',
      description: 'Instale no seu celular'
    },
    {
      name: 'Apple',
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

          {/* Main Install Button */}
          {isInstalled ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">App já instalado</span>
            </div>
          ) : canInstall ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              size="lg"
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              {installing ? (
                <>Instalando...</>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Instalar Agora
                </>
              )}
            </Button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                Para instalar, use o menu do seu navegador e selecione "Instalar app" ou "Adicionar à tela inicial"
              </p>
            </div>
          )}
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {platforms.map((platform) => (
            <Card key={platform.name} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <img src={platform.icon} alt={platform.name} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-foreground text-center mb-2">
                  {platform.name}
                </h3>
                <p className="text-muted-foreground text-center">
                  {platform.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            O app funciona em todos os navegadores modernos. 
            Tamanho: ~5MB • Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
