import ProductList from "@/components/products/ProductList";
import ProductTypeSelectionModal from "@/components/products/ProductTypeSelectionModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ProducerLayout } from "@/components/ProducerLayout";
import { Button } from "@/components/ui/button";
import { PWAConditional } from "@/components/PWAConditional";

const ProductsPage = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', user?.id, currentPage],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.functions.invoke('get-producer-products', {
        body: {
          page: currentPage,
          limit: itemsPerPage
        }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const products = productsData?.products || [];
  const totalProducts = productsData?.totalProducts || 0;
  const hasMore = productsData?.hasMore || false;

  return (
    <ProducerLayout>
<div className="mb-4 md:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Seus Produtos</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 hidden md:block">Gerencie todos os seus produtos digitais</p>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8 sm:py-10 md:py-12">
          <p className="text-sm sm:text-base text-gray-500">Carregando produtos...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 sm:py-10 md:py-12">
          <p className="text-sm sm:text-base text-red-500">Erro ao carregar produtos</p>
        </div>
      ) : (
        <ProductList 
          products={products} 
          onCreateProduct={() => setIsModalOpen(true)}
        />
      )}

      {/* Paginação */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm text-gray-700">
            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalProducts)} até {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts} produtos
          </p>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <PWAConditional hideInPWA>
        <ProductTypeSelectionModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </PWAConditional>
    </ProducerLayout>
  );
};

export default ProductsPage;
