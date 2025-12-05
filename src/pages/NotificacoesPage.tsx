import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bell, 
  Settings2, 
  Inbox, 
  BellOff,
  CheckCircle,
  FileText,
  QrCode,
  ShoppingCart,
  XCircle,
  RefreshCw,
  AlertTriangle,
  UserMinus,
  Clock,
} from 'lucide-react';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: unknown;
  created_at: string;
}

const iconMap: Record<string, { icon: typeof Bell; color: string }> = {
  purchase_approved: { icon: CheckCircle, color: 'text-green-500' },
  boleto_generated: { icon: FileText, color: 'text-blue-500' },
  pix_generated: { icon: QrCode, color: 'text-purple-500' },
  abandoned_cart: { icon: ShoppingCart, color: 'text-orange-500' },
  purchase_declined: { icon: XCircle, color: 'text-red-500' },
  refund: { icon: RefreshCw, color: 'text-amber-500' },
  chargeback: { icon: AlertTriangle, color: 'text-red-600' },
  subscription_cancelled: { icon: UserMinus, color: 'text-gray-500' },
  subscription_overdue: { icon: Clock, color: 'text-yellow-500' },
  subscription_renewed: { icon: RefreshCw, color: 'text-green-600' },
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const { icon: Icon, color } = iconMap[notification.type] || { icon: Bell, color: 'text-muted-foreground' };

  return (
    <div className={`flex gap-3 p-3 border rounded-lg transition-colors ${!notification.is_read ? 'bg-muted/50' : ''}`}>
      <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{notification.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
};

const NotificacoesPage = () => {
  const { profile } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', profile.id)
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
      const defaults = NOTIFICATION_TYPES.reduce((acc, type) => {
        acc[type.key] = type.defaultValue;
        return acc;
      }, {} as NotificationPreferences);
      setPreferences(defaults);
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [profile?.id]);

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
      loadNotifications();
    }
  }, [profile?.id, loadPreferences, loadNotifications]);

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
    setIsLoadingPreferences(true);
    setIsLoadingNotifications(true);
    await Promise.all([loadPreferences(), loadNotifications()]);
  }, [loadPreferences, loadNotifications]);

  return (
    <ProducerLayout onRefresh={handleRefresh}>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Central de Notificações</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Gerencie suas preferências e veja o histórico de notificações
        </p>
      </div>

      {/* Grid de 2 colunas (desktop) / empilhado (mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* COLUNA ESQUERDA: Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Preferências
            </CardTitle>
            <CardDescription>
              Escolha quais notificações você deseja receber por email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPreferences ? (
              <div className="space-y-4">
                {NOTIFICATION_TYPES.slice(0, 5).map((type) => (
                  <div key={type.key} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="space-y-0.5 flex-1 min-w-0 mr-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* COLUNA DIREITA: Últimas Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Últimas Notificações
            </CardTitle>
            <CardDescription>
              Histórico das suas notificações recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">Sem novas notificações</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Suas notificações aparecerão aqui
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] lg:h-[500px] pr-4">
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
};

export default NotificacoesPage;