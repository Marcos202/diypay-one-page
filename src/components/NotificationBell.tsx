import { Bell, CheckCircle2, Barcode } from 'lucide-react';
import { SiPix } from 'react-icons/si';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { playNotificationSound } from '@/lib/notificationSound';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Mapeamento de ícones por tipo (todos em cinza)
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  purchase_approved: CheckCircle2,
  pix_generated: SiPix,
  boleto_generated: Barcode,
};

// Função para limpar emojis do título
const cleanTitle = (title: string): string => {
  return title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
};

// Função para extrair valor da mensagem (formato: "Valor: R$ XX,XX • Produto: Nome")
const extractValue = (message: string): string => {
  const match = message.match(/Valor:\s*R\$\s*([\d.,]+)/);
  return match ? match[1] : '';
};

export function NotificationBell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  // Marcar notificação como lida e redirecionar
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? {...n, is_read: true} : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setOpen(false);
    navigate('/sales');
  };

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications();

    // 🔴 REALTIME: Escutar novas notificações em tempo real
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('[REALTIME] Nova notificação recebida:', payload.new);
          const newNotif = payload.new as Notification;
          
          // Atualizar lista local instantaneamente (adicionar no topo, manter max 10)
          setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // 🔊 Tocar som de alerta
          playNotificationSound();
          
          // Disparar Web Notification nativa se permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              // Tentar usar Service Worker para notificação nativa (funciona em background)
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                  const options = {
                    body: newNotif.message,
                    icon: '/logo-192x192.png',
                    badge: '/logo-192x192.png',
                    tag: newNotif.id,
                    vibrate: [200, 100, 200]
                  };
                  registration.showNotification(cleanTitle(newNotif.title), options as NotificationOptions);
                });
              } else {
                // Fallback para Notification API padrão
                new Notification(cleanTitle(newNotif.title), {
                  body: newNotif.message,
                  icon: '/logo-192x192.png',
                  tag: newNotif.id
                });
              }
            } catch (err) {
              console.error('[NOTIFICATION] Erro ao disparar push:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-accent/50 transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} nova(s)
            </p>
          )}
        </div>

        {/* Lista de notificações */}
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((n) => {
              const value = extractValue(n.message);
              const Icon = iconMap[n.type] || Bell;
              
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <Icon className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cleanTitle(n.title)}</p>
                    {value && (
                      <p className="text-sm text-muted-foreground">
                        Valor R$: {value}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full text-sm font-medium text-primary hover:text-primary"
            onClick={() => {
              setOpen(false);
              navigate('/notificacoes');
            }}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
