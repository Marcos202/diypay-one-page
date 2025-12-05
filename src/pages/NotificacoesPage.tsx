import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const NOTIFICATION_TYPES = [
  { key: 'purchase_approved', label: 'Compra aprovada', description: 'Receba quando uma venda for confirmada', defaultValue: true },
  { key: 'boleto_generated', label: 'Boleto gerado', description: 'Receba quando um boleto for emitido', defaultValue: false },
  { key: 'pix_generated', label: 'Pix gerado', description: 'Receba quando um Pix for gerado', defaultValue: false },
  { key: 'abandoned_cart', label: 'Carrinho abandonado', description: 'Receba quando um cliente abandonar o carrinho', defaultValue: false },
  { key: 'purchase_declined', label: 'Compra recusada', description: 'Receba quando uma compra for recusada', defaultValue: false },
  { key: 'refund', label: 'Reembolso', description: 'Receba quando um reembolso for solicitado', defaultValue: false },
  { key: 'chargeback', label: 'Chargeback', description: 'Receba quando houver uma contestação de pagamento', defaultValue: false },
  { key: 'subscription_cancelled', label: 'Assinatura cancelada', description: 'Receba quando uma assinatura for cancelada', defaultValue: false },
  { key: 'subscription_overdue', label: 'Assinatura atrasada', description: 'Receba quando uma assinatura estiver em atraso', defaultValue: false },
  { key: 'subscription_renewed', label: 'Assinatura renovada', description: 'Receba quando uma assinatura for renovada', defaultValue: false },
];

interface NotificationPreferences {
  [key: string]: boolean;
}

const NotificacoesPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
    }
  }, [profile?.id]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', profile?.id)
        .single();

      if (error) throw error;

      const saved = (data?.notification_preferences as NotificationPreferences) || {};
      const defaults = NOTIFICATION_TYPES.reduce((acc, type) => {
        acc[type.key] = saved[type.key] ?? type.defaultValue;
        return acc;
      }, {} as NotificationPreferences);

      setPreferences(defaults);
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Use defaults on error
      const defaults = NOTIFICATION_TYPES.reduce((acc, type) => {
        acc[type.key] = type.defaultValue;
        return acc;
      }, {} as NotificationPreferences);
      setPreferences(defaults);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: string, checked: boolean) => {
    const previousPreferences = { ...preferences };
    const newPreferences = { ...preferences, [key]: checked };
    setPreferences(newPreferences);
    setSavingKey(key);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: newPreferences })
        .eq('id', profile?.id);

      if (error) throw error;
      toast.success('Preferência atualizada');
    } catch (error) {
      console.error('Error saving preference:', error);
      toast.error('Erro ao salvar preferência');
      setPreferences(previousPreferences);
    } finally {
      setSavingKey(null);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await loadPreferences();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <ProducerLayout onRefresh={handleRefresh}>
        <div className="mb-4 md:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Central de Notificações</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie suas preferências de notificação</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferências de Notificação
            </CardTitle>
            <CardDescription>
              Escolha quais notificações você deseja receber por email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map((type) => (
                <div key={type.key} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-0.5 flex-1 min-w-0 mr-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout onRefresh={handleRefresh}>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Central de Notificações</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie suas preferências de notificação</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferências de Notificação
          </CardTitle>
          <CardDescription>
            Escolha quais notificações você deseja receber por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.key}
                className="flex items-center justify-between py-3 sm:py-4 border-b last:border-0"
              >
                <div className="space-y-0.5 flex-1 min-w-0 mr-4">
                  <Label htmlFor={type.key} className="text-sm sm:text-base font-medium cursor-pointer">
                    {type.label}
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
                <Switch
                  id={type.key}
                  checked={preferences[type.key] || false}
                  onCheckedChange={(checked) => handleToggle(type.key, checked)}
                  disabled={savingKey === type.key}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
};

export default NotificacoesPage;
