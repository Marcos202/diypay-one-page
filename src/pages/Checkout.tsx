import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ProductInfo } from "@/components/checkout/ProductInfo";
import { LoadingSpinner } from "@/components/checkout/LoadingSpinner";
import { toast } from "@/hooks/use-toast";

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [eventQuantity, setEventQuantity] = useState<number>(1);

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
                />
              </div>

              {/* Formulário de Checkout */}
              <div className="w-full lg:w-2/3">
                <CheckoutForm 
                  product={product}
                  onDonationAmountChange={setDonationAmount}
                  onEventQuantityChange={setEventQuantity}
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