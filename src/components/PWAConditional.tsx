import { ReactNode } from 'react';
import { usePWAContext } from '@/contexts/PWAContext';

interface PWAConditionalProps {
  children: ReactNode;
  showInPWA?: boolean;
  hideInPWA?: boolean;
}

export const PWAConditional = ({ 
  children, 
  showInPWA = false, 
  hideInPWA = false 
}: PWAConditionalProps) => {
  const { isPWA } = usePWAContext();

  if (showInPWA && !isPWA) return null;
  if (hideInPWA && isPWA) return null;

  return <>{children}</>;
};
