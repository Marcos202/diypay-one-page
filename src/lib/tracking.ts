interface TrackingConfig {
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  google_ads_conversion_id?: string;
  google_ads_conversion_label?: string;
  is_active: boolean;
  tracking_enabled_pages?: string[];
}

interface ProductData {
  content_id: string;
  content_name: string;
  value: number;
  currency: string;
}

interface CheckoutData {
  content_ids: string[];
  value: number;
  currency: string;
  num_items: number;
}

interface OrderData {
  transaction_id: string;
  value: number;
  currency: string;
  content_ids: string[];
}

// Estender Window para incluir os objetos globais dos pixels
declare global {
  interface Window {
    fbq?: any;
    ttq?: any;
    gtag?: any;
    dataLayer?: any[];
  }
}

class TrackingService {
  private config: TrackingConfig | null = null;
  private initialized = false;

  /**
   * Inicializa os scripts de rastreamento dinamicamente
   */
  async init(config: TrackingConfig): Promise<void> {
    console.log('[Tracking Debug] 🔧 TrackingService.init() CHAMADO');
    console.log('[Tracking Debug] Config recebida:', JSON.stringify(config, null, 2));
    
    if (this.initialized) {
      console.log('[Tracking Debug] ⚠️ Já inicializado, pulando...');
      return;
    }
    
    if (!config.is_active) {
      console.log('[Tracking Debug] ❌ Config inativa (is_active = false)');
      return;
    }
    
    // VALIDAÇÃO: Pelo menos um pixel deve estar configurado
    const hasAtLeastOnePixel = config.meta_pixel_id || 
                               config.tiktok_pixel_id || 
                               config.google_ads_conversion_id;
    
    if (!hasAtLeastOnePixel) {
      console.log('[Tracking Debug] ❌ Nenhum pixel configurado, abortando');
      return;
    }

    this.config = config;

    try {
      // Inicializar Meta Pixel
      if (config.meta_pixel_id && !window.fbq) {
        console.log('[Tracking Debug] 🎯 Inicializando META PIXEL...');
        this.initMetaPixel(config.meta_pixel_id);
      }

      // Inicializar TikTok Pixel
      if (config.tiktok_pixel_id && !window.ttq) {
        console.log('[Tracking Debug] 🎯 Inicializando TIKTOK PIXEL...');
        this.initTikTokPixel(config.tiktok_pixel_id);
      }

      // Inicializar Google Ads
      if (config.google_ads_conversion_id && !window.gtag) {
        console.log('[Tracking Debug] 🎯 Inicializando GOOGLE ADS...');
        this.initGoogleAds(config.google_ads_conversion_id);
      }

      this.initialized = true;
      console.log('[Tracking Debug] ✅ Scripts inicializados com SUCESSO');
    } catch (error) {
      console.error('[Tracking Debug] ❌ ERRO ao inicializar scripts:', error);
    }
  }

  /**
   * Inicializa o Meta Pixel
   */
  private initMetaPixel(pixelId: string): void {
    console.log('[Tracking Debug] 💉 INJETANDO script do Meta Pixel. ID:', pixelId);
    
    (function(f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
      if (f.fbq) {
        console.log('[Tracking Debug] ⚠️ window.fbq já existe, pulando injeção');
        return;
      }
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e) as HTMLScriptElement;
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    console.log('[Tracking Debug] ✅ Meta Pixel ATIVO. ID:', pixelId);
  }

  /**
   * Inicializa o TikTok Pixel
   */
  private initTikTokPixel(pixelId: string): void {
    console.log('[Tracking Debug] 💉 INJETANDO script do TikTok Pixel. ID:', pixelId);
    
    (function(w: any, d: Document, t: string) {
      w.TiktokAnalyticsObject = t;
      const ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function(t: any, e: any) {
        t[e] = function() {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function(t: string) {
        const e = ttq._i[t] || [];
        for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function(e: string, n?: any) {
        const i = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const o = document.createElement("script");
        o.type = "text/javascript";
        o.async = true;
        o.src = i + "?sdkid=" + e + "&lib=" + t;
        const a = document.getElementsByTagName("script")[0];
        a?.parentNode?.insertBefore(o, a);
      };
      ttq.load(pixelId);
      ttq.page();
    })(window, document, 'ttq');

    console.log('[Tracking Debug] ✅ TikTok Pixel ATIVO. ID:', pixelId);
  }

  /**
   * Inicializa o Google Ads
   */
  private initGoogleAds(conversionId: string): void {
    console.log('[Tracking Debug] 💉 INJETANDO script do Google Ads. ID:', conversionId);
    
    // Criar dataLayer se não existir
    window.dataLayer = window.dataLayer || [];
    
    function gtag(...args: any[]) {
      window.dataLayer!.push(arguments);
    }
    
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', conversionId);

    // Injetar script do Google Tag
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(script);

    console.log('[Tracking Debug] ✅ Google Ads ATIVO. ID:', conversionId);
  }

  /**
   * Rastrear visualização de conteúdo
   */
  trackViewContent(productData: ProductData): void {
    if (!this.config?.is_active) return;

    try {
      // Meta Pixel
      if (this.config.meta_pixel_id && window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_ids: [productData.content_id],
          content_name: productData.content_name,
          value: productData.value,
          currency: productData.currency
        });
        console.log('[Tracking] Meta ViewContent:', productData);
      }

      // TikTok Pixel
      if (this.config.tiktok_pixel_id && window.ttq) {
        window.ttq.track('ViewContent', {
          content_id: productData.content_id,
          content_name: productData.content_name,
          value: productData.value,
          currency: productData.currency
        });
        console.log('[Tracking] TikTok ViewContent:', productData);
      }

      // Google Ads (pageview automático já foi disparado no init)
      if (this.config.google_ads_conversion_id && window.gtag) {
        window.gtag('event', 'page_view', {
          send_to: this.config.google_ads_conversion_id
        });
        console.log('[Tracking] Google Ads page_view');
      }
    } catch (error) {
      console.error('[Tracking] Erro em trackViewContent:', error);
    }
  }

  /**
   * Rastrear início do checkout
   */
  trackInitiateCheckout(checkoutData: CheckoutData): void {
    if (!this.config?.is_active) return;

    try {
      // Meta Pixel
      if (this.config.meta_pixel_id && window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: checkoutData.content_ids,
          value: checkoutData.value,
          currency: checkoutData.currency,
          num_items: checkoutData.num_items
        });
        console.log('[Tracking] Meta InitiateCheckout:', checkoutData);
      }

      // TikTok Pixel
      if (this.config.tiktok_pixel_id && window.ttq) {
        window.ttq.track('InitiateCheckout', {
          content_id: checkoutData.content_ids[0],
          value: checkoutData.value,
          currency: checkoutData.currency
        });
        console.log('[Tracking] TikTok InitiateCheckout:', checkoutData);
      }

      // Google Ads
      if (this.config.google_ads_conversion_id && window.gtag) {
        window.gtag('event', 'begin_checkout', {
          currency: checkoutData.currency,
          value: checkoutData.value,
          items: checkoutData.content_ids.map(id => ({ id }))
        });
        console.log('[Tracking] Google Ads begin_checkout:', checkoutData);
      }
    } catch (error) {
      console.error('[Tracking] Erro em trackInitiateCheckout:', error);
    }
  }

  /**
   * Rastrear compra (client-side)
   */
  trackPurchase(orderData: OrderData): void {
    if (!this.config?.is_active) return;

    try {
      // Meta Pixel (com event_id para deduplicação com CAPI)
      if (this.config.meta_pixel_id && window.fbq) {
        window.fbq('track', 'Purchase', {
          content_ids: orderData.content_ids,
          value: orderData.value,
          currency: orderData.currency
        }, {
          eventID: orderData.transaction_id // Para deduplicação
        });
        console.log('[Tracking] Meta Purchase:', orderData);
      }

      // TikTok Pixel
      if (this.config.tiktok_pixel_id && window.ttq) {
        window.ttq.track('CompletePayment', {
          content_id: orderData.content_ids[0],
          value: orderData.value,
          currency: orderData.currency
        });
        console.log('[Tracking] TikTok CompletePayment:', orderData);
      }

      // Google Ads
      if (this.config.google_ads_conversion_id && this.config.google_ads_conversion_label && window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: `${this.config.google_ads_conversion_id}/${this.config.google_ads_conversion_label}`,
          value: orderData.value,
          currency: orderData.currency,
          transaction_id: orderData.transaction_id
        });
        console.log('[Tracking] Google Ads conversion:', orderData);
      }
    } catch (error) {
      console.error('[Tracking] Erro em trackPurchase:', error);
    }
  }
}

// Exportar instância única
export const tracking = new TrackingService();
