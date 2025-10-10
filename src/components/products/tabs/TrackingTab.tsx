import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TrackingTabProps {
  productId?: string;
}

const TrackingTab = ({ productId }: TrackingTabProps) => {
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    meta_pixel_id: '',
    meta_test_event_code: '',
    tiktok_pixel_id: '',
    tiktok_test_event_code: '',
    google_ads_conversion_id: '',
    google_ads_conversion_label: '',
    is_active: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Query: Buscar configuração existente
  const { data: trackingData, isLoading } = useQuery({
    queryKey: ['product-tracking', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase.functions.invoke('manage-product-tracking', {
        method: 'GET',
        body: { productId },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Preencher formulário quando os dados forem carregados
  useEffect(() => {
    if (trackingData) {
      setConfig({
        meta_pixel_id: trackingData.meta_pixel_id || '',
        meta_test_event_code: trackingData.meta_test_event_code || '',
        tiktok_pixel_id: trackingData.tiktok_pixel_id || '',
        tiktok_test_event_code: trackingData.tiktok_test_event_code || '',
        google_ads_conversion_id: trackingData.google_ads_conversion_id || '',
        google_ads_conversion_label: trackingData.google_ads_conversion_label || '',
        is_active: trackingData.is_active ?? true,
      });
    }
  }, [trackingData]);

  // Mutation: Salvar configuração
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID não fornecido');

      const { data, error } = await supabase.functions.invoke('manage-product-tracking', {
        method: 'POST',
        body: { productId, ...config },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['product-tracking', productId] });
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar', { description: error.message });
    },
  });

  // Validação em tempo real
  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = { ...validationErrors };

    if (field === 'meta_pixel_id') {
      if (value && !/^\d{15,16}$/.test(value)) {
        errors.meta_pixel_id = 'Deve conter 15-16 dígitos numéricos';
      } else {
        delete errors.meta_pixel_id;
      }
    }

    if (field === 'tiktok_pixel_id') {
      if (value && !/^[A-Z0-9]{10,20}$/.test(value)) {
        errors.tiktok_pixel_id = 'Formato inválido (ex: C12345ABCDEFG)';
      } else {
        delete errors.tiktok_pixel_id;
      }
    }

    if (field === 'google_ads_conversion_id') {
      if (value && !/^AW-\d{9,11}$/.test(value)) {
        errors.google_ads_conversion_id = 'Formato esperado: AW-XXXXXXXXXX';
      } else {
        delete errors.google_ads_conversion_id;
      }
    }

    setValidationErrors(errors);
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const isConfigured = (platform: 'meta' | 'tiktok' | 'google') => {
    if (platform === 'meta') return !!config.meta_pixel_id;
    if (platform === 'tiktok') return !!config.tiktok_pixel_id;
    if (platform === 'google') return !!config.google_ads_conversion_id;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure pixels de rastreamento para acompanhar conversões e otimizar seus anúncios. 
          Os pixels serão carregados automaticamente nas páginas do produto e checkout.
        </AlertDescription>
      </Alert>

      {/* Toggle geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rastreamento Ativo</CardTitle>
              <CardDescription>Ativar/desativar todos os pixels deste produto</CardDescription>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Meta Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>Meta Pixel (Facebook)</CardTitle>
                {isConfigured('meta') ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <CardDescription>
                Rastreie conversões de anúncios do Facebook e Instagram
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href="https://business.facebook.com/events_manager2/list/pixel" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentação
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="meta_pixel_id">Pixel ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Encontre seu Pixel ID no Gerenciador de Eventos do Meta.
                      São 15-16 dígitos numéricos.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="meta_pixel_id"
              placeholder="Ex: 123456789012345"
              value={config.meta_pixel_id}
              onChange={(e) => handleInputChange('meta_pixel_id', e.target.value)}
              className={validationErrors.meta_pixel_id ? 'border-red-500' : ''}
            />
            {validationErrors.meta_pixel_id && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.meta_pixel_id}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="meta_test_event_code">Test Event Code (opcional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Use para testar eventos antes de publicar. Encontre em "Test Events" no Meta.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="meta_test_event_code"
              placeholder="Ex: TEST12345"
              value={config.meta_test_event_code}
              onChange={(e) => handleInputChange('meta_test_event_code', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* TikTok Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>TikTok Pixel</CardTitle>
                {isConfigured('tiktok') ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <CardDescription>
                Rastreie conversões de anúncios do TikTok
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href="https://ads.tiktok.com/help/article/standard-events-parameters" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentação
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="tiktok_pixel_id">Pixel ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Encontre seu Pixel ID no TikTok Ads Manager → Assets → Events.
                      Formato alfanumérico (ex: C12345ABCDEFG).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="tiktok_pixel_id"
              placeholder="Ex: C12345ABCDEFG"
              value={config.tiktok_pixel_id}
              onChange={(e) => handleInputChange('tiktok_pixel_id', e.target.value.toUpperCase())}
              className={validationErrors.tiktok_pixel_id ? 'border-red-500' : ''}
            />
            {validationErrors.tiktok_pixel_id && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.tiktok_pixel_id}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="tiktok_test_event_code">Test Event Code (opcional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Use para testar eventos no TikTok Ads Manager.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="tiktok_test_event_code"
              placeholder="Ex: TEST67890"
              value={config.tiktok_test_event_code}
              onChange={(e) => handleInputChange('tiktok_test_event_code', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Ads */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>Google Ads</CardTitle>
                {isConfigured('google') ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <CardDescription>
                Rastreie conversões de anúncios do Google
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href="https://support.google.com/google-ads/answer/6095821" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentação
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="google_ads_conversion_id">Conversion ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Encontre em Google Ads → Tools → Conversions → Tag Setup.
                      Formato: AW-XXXXXXXXXX
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="google_ads_conversion_id"
              placeholder="Ex: AW-123456789"
              value={config.google_ads_conversion_id}
              onChange={(e) => handleInputChange('google_ads_conversion_id', e.target.value)}
              className={validationErrors.google_ads_conversion_id ? 'border-red-500' : ''}
            />
            {validationErrors.google_ads_conversion_id && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.google_ads_conversion_id}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="google_ads_conversion_label">Conversion Label</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Label específico para o evento de conversão (ex: "Purchase").
                      Encontre junto ao Conversion ID.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="google_ads_conversion_label"
              placeholder="Ex: AbC-dEfGh12345"
              value={config.google_ads_conversion_label}
              onChange={(e) => handleInputChange('google_ads_conversion_label', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || Object.keys(validationErrors).length > 0}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  );
};

export default TrackingTab;
