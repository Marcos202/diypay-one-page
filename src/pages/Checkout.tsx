import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ProductInfo } from "@/components/checkout/ProductInfo";
import { LoadingSpinner } from "@/components/checkout/LoadingSpinner";
import { toast } from "@/hooks/use-toast";
import OrderBumpCheckout from "@/components/checkout/OrderBumpCheckout";
import { tracking } from "@/lib/tracking";

interface TicketBatch {
  id: string;
  name: string;
  price_cents: number;
  total_quantity: number;
  sold_quantity: number;
  is_active: boolean;
  display_order: number;
}

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [eventQuantity, setEventQuantity] = useState<number>(1);
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<TicketBatch | null>(null);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Product slug is required');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('checkout_link_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw new Error('Product not found');
      }

      return data;
    },
    enabled: !!slug,
  });

  // Buscar Order Bump
  const { data: orderBump } = useQuery({
    queryKey: ['order-bump', product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_bumps')
        .select(`
          *,
          order_bump_items (
            id,
            bump_product_id,
            title,
            description,
            image_url,
            discount_percent,
            display_order,
            products:bump_product_id (
              id,
              name,
              price_cents
            )
          )
        `)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

  // Buscar lotes ativos se produto for evento
  const { data: ticketBatches } = useQuery({
    queryKey: ['ticket-batches', product?.id],
    queryFn: async () => {
      if (!product || product.product_type !== 'event') return null;
      
      const { data, error } = await supabase
        .from('ticket_batches')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching batches:', error);
        return null;
      }

      return data as TicketBatch[];
    },
    enabled: !!product && product.product_type === 'event',
  });

  const handleOrderBumpSelect = (item: any) => {
    setSelectedOrderBumps([...selectedOrderBumps, item]);
  };

  const handleOrderBumpDeselect = (item: any) => {
    setSelectedOrderBumps(selectedOrderBumps.filter(i => i.id !== item.id));
  };

  // Auto-selecionar primeiro lote disponível
  useEffect(() => {
    if (ticketBatches && ticketBatches.length > 0 && !selectedBatch) {
      const availableBatch = ticketBatches.find(
        (batch) => batch.sold_quantity < batch.total_quantity
      );
      if (availableBatch) {
        setSelectedBatch(availableBatch);
        console.log('[CHECKOUT] Auto-selected batch:', availableBatch);
      }
    }
  }, [ticketBatches, selectedBatch]);

  // Inicializar tracking quando o produto carregar
  useEffect(() => {
    const initTracking = async () => {
      console.log('[Tracking Debug] 🚀 INICIANDO tracking no Checkout');
      console.log('[Tracking Debug] Product ID:', product?.id);
      
      if (!product?.id) {
        console.log('[Tracking Debug] ⚠️ ABORTADO: Product ID ausente');
        return;
      }
      
      try {
        console.log('[Tracking Debug] 📡 Chamando get-public-tracking-config...');
        
        const { data: trackingConfig, error } = await supabase.functions.invoke(
          `get-public-tracking-config?productId=${product.id}`
        );
        
        console.log('[Tracking Debug] 📥 RESPOSTA BRUTA da Edge Function:', trackingConfig);
        console.log('[Tracking Debug] Erro (se houver):', error);
        
        // VALIDAÇÃO ROBUSTA
        const isValidConfig = trackingConfig?.is_active && 
                             (trackingConfig.meta_pixel_id || 
                              trackingConfig.tiktok_pixel_id || 
                              trackingConfig.google_ads_conversion_id);
        
        console.log('[Tracking Debug] Config é válida?', isValidConfig);
        console.log('[Tracking Debug] Páginas habilitadas:', trackingConfig?.tracking_enabled_pages);
        
        if (isValidConfig && trackingConfig.tracking_enabled_pages?.includes('checkout')) {
          console.log('[Tracking Debug] ✅ CONFIGURAÇÃO VÁLIDA! Inicializando tracking...');
          
          await tracking.init(trackingConfig);
          
          const totalValue = (product.price_cents || 0) / 100;
          
          tracking.trackInitiateCheckout({
            content_ids: [product.id],
            value: totalValue,
            currency: 'BRL',
            num_items: 1
          });
        } else {
          console.log('[Tracking Debug] ❌ Config inválida ou checkout não habilitado');
        }
      } catch (err) {
        console.error('[Tracking Debug] ❌ ERRO FATAL:', err);
      }
    };
    
    initTracking();
  }, [product]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Produto não encontrado",
        description: "O produto que você está tentando acessar não foi encontrado ou não está ativo.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return null;
  }
  
  const backgroundStyle = product.checkout_background_color 
    ? { backgroundColor: product.checkout_background_color }
    : {};

  // ### INÍCIO DA ALTERAÇÃO ###
  return (
    <div className="min-h-screen bg-white lg:bg-gray-50 py-4 lg:py-8" style={backgroundStyle}>
      <div className="max-w-6xl mx-auto px-0 lg:px-4">
        {/* Imagem personalizada do checkout permanece com a largura máxima total */}
        {product.checkout_image_url && (
          <div className="max-w-2xl mx-auto mb-8 lg:max-w-none flex justify-center px-4 lg:px-0">
            <img 
              src={product.checkout_image_url} 
              alt={product.name}
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Container Adicionado: Define uma largura máxima menor apenas para a seção do formulário/resumo */}
        <div className="max-w-5xl mx-auto">
          {product.show_order_summary ? (
            // Aumentamos o gap para lg:gap-8 para um melhor espaçamento visual no container mais justo
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
              {/* Resumo do Pedido (Product Info Sidebar) */}
              <div className="w-full lg:w-1/3 px-4 lg:px-0">
                <ProductInfo 
                  product={product} 
                  donationAmount={donationAmount}
                  eventQuantity={eventQuantity}
                  orderBumpItems={selectedOrderBumps.map(item => ({
                    name: item.products.name,
                    price_cents: item.products.price_cents,
                    discount_percent: item.discount_percent,
                  }))}
                />
              </div>

              {/* Formulário de Checkout */}
              <div className="w-full lg:w-2/3">
                <CheckoutForm 
                  product={product}
                  onDonationAmountChange={setDonationAmount}
                  onEventQuantityChange={setEventQuantity}
                  orderBump={orderBump}
                  selectedOrderBumps={selectedOrderBumps}
                  onOrderBumpSelect={handleOrderBumpSelect}
                  onOrderBumpDeselect={handleOrderBumpDeselect}
                  selectedBatch={selectedBatch}
                  availableBatches={ticketBatches}
                  onBatchChange={setSelectedBatch}
                />
              </div>
            </div>
          ) : (
            // Layout centralizado quando resumo está oculto (não precisa do container extra)
            <div className="max-w-2xl mx-auto">
              <CheckoutForm 
                product={product}
                onDonationAmountChange={setDonationAmount}
                onEventQuantityChange={setEventQuantity}
                orderBump={orderBump}
                selectedOrderBumps={selectedOrderBumps}
                onOrderBumpSelect={handleOrderBumpSelect}
                onOrderBumpDeselect={handleOrderBumpDeselect}
                selectedBatch={selectedBatch}
                availableBatches={ticketBatches}
                onBatchChange={setSelectedBatch}
              />
            </div>
          )}
        </div>
        {/* Fim do Container Adicionado */}

      </div>
    </div>
  );
  // ### FIM DA ALTERAÇÃO ###
};

export default Checkout;