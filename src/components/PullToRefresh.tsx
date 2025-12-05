import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2 } from 'lucide-react';
import { usePWAContext } from '@/contexts/PWAContext';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
}

export const PullToRefresh = ({ 
  children, 
  onRefresh,
  disabled = false 
}: PullToRefreshProps) => {
  const { isPWA } = usePWAContext();
  
  // Default no-op refresh function
  const handleRefresh = onRefresh || (async () => {});
  
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPull: 120,
    disabled: disabled || !isPWA || !onRefresh
  });

  // If not PWA or no refresh handler, render children directly
  if (!isPWA || !onRefresh) {
    return <>{children}</>;
  }

  return (
    <div 
      ref={containerRef} 
      className="relative h-full overflow-auto"
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50 transition-opacity duration-200"
        style={{ 
          top: `${pullDistance - 60}px`,
          opacity: pullProgress
        }}
      >
        <div className="bg-background rounded-full p-3 shadow-lg border border-border">
          <Loader2 
            className={`h-6 w-6 text-primary transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullProgress * 360}deg)` 
            }}
          />
        </div>
      </div>
      
      {/* Content with transform */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: pullDistance === 0 ? '200ms' : '0ms'
        }}
      >
        {children}
      </div>
    </div>
  );
};
