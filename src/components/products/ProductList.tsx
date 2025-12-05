import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Eye, MoreHorizontal, Ticket, RefreshCw, Copy, Check, Package, Repeat, Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePWAContext } from "@/contexts/PWAContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  type: string;
  product_type: string;
  is_active: boolean;
  checkout_link_slug?: string;
}

interface ProductListProps {
  products: Product[];
  onCreateProduct?: () => void;
}

const ProductList = ({ products, onCreateProduct }: ProductListProps) => {
  const { toast } = useToast();
  const { isPWA } = usePWAContext();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const formatPrice = (priceCents: number, productType: string) => {
    if (productType === 'donation') {
      return 'Valor livre';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceCents / 100);
  };

  const getProductTypeLabel = (productType: string) => {
    switch (productType) {
      case 'single_payment':
        return 'Pagamento Único';
      case 'subscription':
        return 'Assinatura';
      case 'donation':
        return 'Doação';
      case 'event':
        return 'Evento';
      default:
        return 'Pagamento Único';
    }
  };

  const getProductTypeIcon = (productType: string) => {
    switch (productType) {
      case 'single_payment':
        return Package;
      case 'subscription':
        return Repeat;
      case 'donation':
        return Heart;
      case 'event':
        return Ticket;
      default:
        return Package;
    }
  };

  const copyCheckoutLink = async (product: Product) => {
    if (!product.checkout_link_slug) return;
    
    const checkoutUrl = `${window.location.origin}/checkout/${product.checkout_link_slug}`;
    
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopiedId(product.id);
      toast({
        title: "Link do checkout copiado!",
        description: "O link foi copiado para sua área de transferência.",
      });
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar link",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const truncateUrl = (slug: string) => {
    if (slug.length > 20) {
      return `...${slug.slice(-20)}`;
    }
    return slug;
  };

  if (products.length === 0) {
    return (
      <Card className="text-center py-8 sm:py-10 md:py-12">
        <CardContent className="pt-4 sm:pt-6">
          <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
            {isPWA ? 'Nenhum produto encontrado.' : 'Você ainda não criou nenhum produto.'}
          </p>
          {!isPWA && (
            <Button 
              onClick={onCreateProduct}
              className="bg-[#4d0782] hover:bg-[#4d0782]/90 text-white"
            >
              Criar Primeiro Produto
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!isPWA && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="hidden sm:block" /> {/* Spacer for alignment */}
          <Button 
            onClick={onCreateProduct}
            className="bg-[#4d0782] hover:bg-[#4d0782]/90 text-white w-full sm:w-auto"
          >
            Criar Novo Produto
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {products.map((product) => (
          <Card key={product.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 space-y-4">
                  {/* Header with title and badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">{product.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant={product.is_active ? "default" : "secondary"}
                        className={product.is_active ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="secondary" className="bg-gray-200 text-gray-800 hover:bg-gray-200 flex items-center gap-1">
                        {(() => {
                          const Icon = getProductTypeIcon(product.product_type);
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {getProductTypeLabel(product.product_type)}
                      </Badge>
                    </div>
                  </div>

                  {/* Price */}
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#810ad1]">
                    {formatPrice(product.price_cents, product.product_type)}
                  </p>

                  {/* Product type */}
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Tipo: {product.type === 'digital_file' ? 'Arquivo Digital' : 'Outro'}
                  </p>

                  {/* Checkout link with copy functionality */}
                  {product.checkout_link_slug && (
                    <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <span className="text-xs sm:text-sm text-muted-foreground flex-1 font-mono truncate">
                        .../checkout/{truncateUrl(product.checkout_link_slug)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCheckoutLink(product)}
                        className="text-[#810ad1] hover:text-[#810ad1]/80 hover:bg-[#810ad1]/10"
                      >
                        {copiedId === product.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 lg:items-end xl:items-center">
                  <div className="flex flex-wrap gap-2">
                    {product.checkout_link_slug && (
                      <Link
                        to={`/checkout/${product.checkout_link_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-[#810ad1] border-[#810ad1] hover:bg-[#810ad1] hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Ver Checkout</span>
                          <span className="sm:hidden">Checkout</span>
                        </Button>
                      </Link>
                    )}
                    
                    {/* Botão Ingressos - apenas para eventos (hidden in PWA) */}
                    {!isPWA && product.product_type === 'event' && (
                      <Link to={`/products/edit/${product.id}?tab=ingressos`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-[#810ad1] border-[#810ad1] hover:bg-[#810ad1] hover:text-white"
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Ingressos</span>
                          <span className="sm:hidden">Tickets</span>
                        </Button>
                      </Link>
                    )}

                    {/* Botão Assinaturas - apenas para assinaturas (hidden in PWA) */}
                    {!isPWA && product.product_type === 'subscription' && (
                      <Link to={`/products/edit/${product.id}?tab=assinaturas`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-[#810ad1] border-[#810ad1] hover:bg-[#810ad1] hover:text-white"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Assinaturas</span>
                          <span className="sm:hidden">Subs</span>
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Dropdown menu - hidden in PWA */}
                  {!isPWA && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-[#810ad1] hover:text-[#810ad1]/80 hover:bg-[#810ad1]/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/products/edit/${product.id}`}
                            className="flex items-center"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
