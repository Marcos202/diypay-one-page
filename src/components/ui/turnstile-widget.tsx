import { useState, useRef, useEffect, useCallback } from "react";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  maxRetries?: number;
}

/**
 * Detecta se está em modo PWA/standalone (especialmente iOS)
 */
const isPWAStandalone = (): boolean => {
  // iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  // Generic PWA standalone mode
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  return isIOSStandalone || isDisplayModeStandalone;
};

/**
 * Detecta se é iOS
 */
const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const TurnstileWidget = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  maxRetries = 3,
}: TurnstileWidgetProps) => {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showError, setShowError] = useState(false);
  const [hasSucceeded, setHasSucceeded] = useState(false);
  
  const isPWA = isPWAStandalone();
  const isIOS = isIOSDevice();
  const isPWAiOS = isPWA && isIOS;

  // Determina o modo baseado no ambiente
  // Em PWA iOS, usa "compact" que é visível e mais confiável
  // Em browser normal, usa "invisible" para melhor UX
  const turnstileMode: "invisible" | "normal" | "compact" = isPWAiOS ? "compact" : "invisible";

  const handleRetry = useCallback(() => {
    if (retryCount >= maxRetries) {
      setShowError(true);
      onError?.("Não foi possível validar a segurança da sessão. Por favor, tente novamente.");
      return;
    }

    setIsRetrying(true);
    setShowError(false);
    
    // Delay progressivo antes do retry
    const delay = Math.min(1000 * (retryCount + 1), 3000);
    
    setTimeout(() => {
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setRetryCount(prev => prev + 1);
      setIsRetrying(false);
    }, delay);
  }, [retryCount, maxRetries, onError]);

  const handleSuccess = useCallback((token: string) => {
    setHasSucceeded(true);
    setShowError(false);
    setRetryCount(0);
    onSuccess(token);
  }, [onSuccess]);

  const handleError = useCallback(() => {
    setHasSucceeded(false);
    
    // Tenta retry automático se ainda tiver tentativas
    if (retryCount < maxRetries) {
      handleRetry();
    } else {
      setShowError(true);
      onError?.("Não foi possível validar a segurança da sessão. Por favor, tente novamente.");
    }
  }, [retryCount, maxRetries, handleRetry, onError]);

  const handleExpire = useCallback(() => {
    setHasSucceeded(false);
    onExpire?.();
    
    // Tenta renovar automaticamente
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, [onExpire]);

  const handleManualRetry = useCallback(() => {
    setRetryCount(0);
    setShowError(false);
    setIsRetrying(true);
    
    setTimeout(() => {
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setIsRetrying(false);
    }, 500);
  }, []);

  // Reset widget quando o componente monta (útil para PWA que pode manter estado)
  useEffect(() => {
    return () => {
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Estado de retry em andamento */}
      {isRetrying && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verificando segurança...</span>
        </div>
      )}

      {/* Mensagem de erro com botão de retry manual */}
      {showError && !isRetrying && (
        <div className="flex flex-col items-center gap-3 py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Não foi possível validar a segurança da sessão.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Widget Turnstile */}
      <div className={showError && !isRetrying ? "hidden" : ""}>
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            size: turnstileMode,
            theme: "light",
            // Refresh automático para PWA
            refreshExpired: "auto",
          }}
        />
      </div>

      {/* Indicador sutil para modo managed (PWA iOS) */}
      {isPWAiOS && !showError && !isRetrying && !hasSucceeded && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          Complete a verificação de segurança acima
        </div>
      )}
    </div>
  );
};
