import { useState, useEffect } from 'react';

export type PlatformOS = 'windows' | 'android' | 'ios' | 'macos' | 'linux' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'unknown';

interface PlatformInfo {
  os: PlatformOS;
  device: DeviceType;
  browser: BrowserType;
  supportsPWA: boolean;
}

export const usePlatformDetection = (): PlatformInfo => {
  const [platform, setPlatform] = useState<PlatformInfo>({
    os: 'unknown',
    device: 'desktop',
    browser: 'unknown',
    supportsPWA: false
  });

  useEffect(() => {
    const detectPlatform = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isAndroid = /android/.test(ua);
      const isWindows = /windows/.test(ua);
      const isMac = /macintosh|mac os x/.test(ua);
      const isLinux = /linux/.test(ua) && !isAndroid;

      // Detectar OS
      let os: PlatformOS = 'unknown';
      if (isIOS) os = 'ios';
      else if (isAndroid) os = 'android';
      else if (isWindows) os = 'windows';
      else if (isMac) os = 'macos';
      else if (isLinux) os = 'linux';

      // Detectar tipo de dispositivo
      let device: DeviceType = 'desktop';
      if (isIOS || isAndroid) {
        // Detectar se é tablet baseado no tamanho da tela
        const isTablet = /ipad/.test(ua) || (isAndroid && !/mobile/.test(ua));
        device = isTablet ? 'tablet' : 'mobile';
      }

      // Detectar navegador
      let browser: BrowserType = 'unknown';
      if (/chrome|crios|crmo/.test(ua) && !/edg/.test(ua)) browser = 'chrome';
      else if (/safari/.test(ua) && !/chrome|crios|crmo/.test(ua)) browser = 'safari';
      else if (/firefox|fxios/.test(ua)) browser = 'firefox';
      else if (/edg/.test(ua)) browser = 'edge';
      else if (/samsungbrowser/.test(ua)) browser = 'samsung';
      else if (/opr|opera/.test(ua)) browser = 'opera';

      // Detectar suporte a PWA
      // beforeinstallprompt é suportado principalmente no Chrome/Edge/Samsung Browser
      const supportsPWA = 'BeforeInstallPromptEvent' in window || 
                         (browser === 'chrome' || browser === 'edge' || browser === 'samsung');

      setPlatform({
        os,
        device,
        browser,
        supportsPWA
      });
    };

    detectPlatform();
  }, []);

  return platform;
};
