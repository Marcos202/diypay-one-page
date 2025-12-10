import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bell, 
  Settings2, 
  Inbox, 
  BellOff,
  CheckCircle2,
  ShoppingCart,
  XCircle,
  RefreshCw,
  AlertTriangle,
  UserMinus,
  Clock,
  Barcode,
} from 'lucide-react';
import { SiPix } from 'react-icons/si';
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

// Ícones profissionais - TODOS em cinza uniforme, sem background
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  purchase_approved: CheckCircle2,
  pix_generated: SiPix,
  boleto_generated: Barcode,
  abandoned_cart: ShoppingCart,
  purchase_declined: XCircle,
  refund: RefreshCw,
  chargeback: AlertTriangle,
  subscription_cancelled: UserMinus,
  subscription_overdue: Clock,
  subscription_renewed: RefreshCw,
};

// Função para limpar emojis do título
const cleanTitle = (title: string): string => {
  return title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
};

// Função para extrair valor da mensagem
const extractValue = (message: string): string | null => {
  const match = message.match(/Valor:\s*(R\$\s*[\d.,]+)/);
  return match ? match[1] : null;
};

// Função para extrair produto da mensagem
const extractProduct = (message: string): string | null => {
  const match = message.match(/Produto:\s*(.+?)$/);
  return match ? match[1].trim() : null;
};

const NotificationItem = ({ 
  notification, 
  onViewDetails 
}: { 
  notification: Notification;
  onViewDetails: () => void;
}) => {
  const Icon = iconMap[notification.type] || Bell;
  
  const title = cleanTitle(notification.title);
  const value = extractValue(notification.message);
  const product = extractProduct(notification.message);

  return (
    <div className={`flex gap-3 p-4 border rounded-lg transition-colors ${!notification.is_read ? 'bg-muted/30' : ''}`}>
      <Icon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {value && <p className="text-sm text-foreground">{value}</p>}
        {product && <p className="text-sm text-muted-foreground">Produto: {product}</p>}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </p>
          <button
            onClick={onViewDetails}
            className="text-xs text-primary hover:underline font-medium"
          >
            Saber mais
          </button>
        </div>
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 25;

const NotificacoesPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (!profile?.id) return;
    
    if (append) {
      setIsLoadingMore(true);
    }
    
    try {
      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (data) {
        setNotifications(prev => append ? [...prev, ...data] : data);
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
      setIsLoadingMore(false);
    }
  }, [profile?.id]);
  
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotifications(nextPage, true);
  };
  
  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return;
    
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
      loadNotifications(1, false);
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
    setPage(1);
    setHasMore(true);
    await Promise.all([loadPreferences(), loadNotifications(1, false)]);
  }, [loadPreferences, loadNotifications]);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleViewDetails = () => {
    navigate('/sales');
  };

  return (
    <ProducerLayout onRefresh={handleRefresh}>
      <div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Central de Notificações</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Gerencie suas preferências e veja o histórico de notificações
        </p>
      </div>

      {/* Grid de 2 colunas (desktop) / empilhado (mobile) - INVERTIDO: Notificações primeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* COLUNA ESQUERDA: Últimas Notificações (agora primeiro) */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Últimas Notificações
              </CardTitle>
              <CardDescription>
                Notificações são mantidas por 30 dias.
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline font-medium whitespace-nowrap"
              >
                Marcar todas como lidas
              </button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-4 border rounded-lg">
                    <Skeleton className="h-5 w-5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-40" />
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
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                  
                  {/* Botão Carregar Mais */}
                  {hasMore && notifications.length >= ITEMS_PER_PAGE && (
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full py-3 text-sm text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Carregando...' : 'Carregar mais notificações'}
                    </button>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* COLUNA DIREITA: Preferências (agora segundo) */}
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
      </div>
    </ProducerLayout>
  );
};

export default NotificacoesPage;
