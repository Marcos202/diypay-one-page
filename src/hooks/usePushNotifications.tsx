import { useState, useEffect } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('[PushNotifications] Not supported in this browser');
      return false;
    }
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('[PushNotifications] Permission result:', result);
      return result === 'granted';
    } catch (error) {
      console.error('[PushNotifications] Error requesting permission:', error);
      return false;
    }
  };

  return { isSupported, permission, requestPermission };
}
