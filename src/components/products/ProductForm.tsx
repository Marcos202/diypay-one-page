// src/components/products/ProductForm.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/core/ConfirmationModal';
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import GeneralTab from './tabs/GeneralTab';
import ConfigurationTab from './tabs/ConfigurationTab';
import CheckoutTab from './tabs/CheckoutTab';
import LinksTab from './tabs/LinksTab';
import TicketsTab from './tabs/TicketsTab';
import SubscriptionsTab from './tabs/SubscriptionsTab';
import OrderBumpTab from './tabs/OrderBumpTab';
import TrackingTab from './tabs/TrackingTab';

interface ProductFormData {
  name: string;
  description: string;
  cover_image_url: string;
  vertical_cover_image_url: string;
  price: string;
  file_url_or_access_info: string;
  max_installments_allowed: number;
  is_active: boolean;
  product_type: string;
  subscription_frequency: string;
  allowed_payment_methods: string[];
  show_order_summary: boolean;
  donation_title: string;
  donation_description: string;
  checkout_image_url: string;
  checkout_background_color: string;
  is_email_optional: boolean;
  require_email_confirmation: boolean;
  producer_assumes_installments: boolean;
  delivery_type: string;
  use_batches?: boolean;
  batches?: any[];
}

interface ProductFormProps {
  productId?: string;
  mode: 'create' | 'edit';
}

const ProductForm = ({ productId, mode }: ProductFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const productTypeFromUrl = searchParams.get('type') || 'single_payment';
  
  const getDefaultPaymentMethods = (productType: string) => {
    if (productType === 'subscription') return ['credit_card'];
    return ['credit_card', 'pix', 'bank_slip'];
  };
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', description: '', cover_image_url: '', vertical_cover_image_url: '', price: '0,00', file_url_or_access_info: '',
    max_installments_allowed: 1, is_active: true, product_type: productTypeFromUrl,
    subscription_frequency: '', allowed_payment_methods: getDefaultPaymentMethods(productTypeFromUrl),
    show_order_summary: true, donation_title: '', donation_description: '', checkout_image_url: '',
    checkout_background_color: '#F3F4F6', is_email_optional: false, require_email_confirmation: true,
    producer_assumes_installments: false, delivery_type: '', use_batches: false
  });
  
  const [localBatches, setLocalBatches] = useState<any[]>([]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
      if (error) throw error;
      return data;
    },
    enabled: mode === 'edit' && !!productId
  });

  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        cover_image_url: product.cover_image_url || '',
        vertical_cover_image_url: product.vertical_cover_image_url || '',
        price: product.price_cents ? (product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00',
        file_url_or_access_info: product.file_url_or_access_info || '',
        max_installments_allowed: product.max_installments_allowed || 1,
        is_active: product.is_active ?? true,
        product_type: product.product_type || 'single_payment',
        subscription_frequency: product.subscription_frequency || '',
        allowed_payment_methods: Array.isArray(product.allowed_payment_methods) 
          ? product.allowed_payment_methods.map(method => String(method)) 
          : getDefaultPaymentMethods(product.product_type || 'single_payment'),
        show_order_summary: product.show_order_summary ?? true,
        donation_title: product.donation_title || '',
        donation_description: product.donation_description || '',
        checkout_image_url: product.checkout_image_url || '',
        checkout_background_color: product.checkout_background_color || '#F3F4F6',
        is_email_optional: product.is_email_optional ?? false,
        require_email_confirmation: product.require_email_confirmation ?? true,
        producer_assumes_installments: product.producer_assumes_installments ?? false,
        delivery_type: (product as any).delivery_type || '',
        use_batches: (product as any).use_batches ?? false
      });
    }
  }, [product, mode]);

  // Carregar lotes existentes no modo de edição
  useEffect(() => {
    const loadExistingBatches = async () => {
      if (mode === 'edit' && productId && formData.use_batches) {
        try {
          const { data, error } = await supabase
            .from('ticket_batches')
            .select('*')
            .eq('product_id', productId)
            .order('display_order', { ascending: true });
          
          if (error) throw error;
          if (data) {
            setLocalBatches(data);
          }
        } catch (error) {
          console.error('Erro ao carregar lotes:', error);
        }
      }
    };
    
    loadExistingBatches();
  }, [mode, productId, formData.use_batches]);

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
  };

  const convertPriceToCents = (priceString: string): number => {
    if (!priceString || priceString.trim() === '') return 0;
    const normalizedPrice = priceString.replace(/\./g, '').replace(',', '.');
    const priceFloat = parseFloat(normalizedPrice);
    if (isNaN(priceFloat)) return 0;
    return Math.round(priceFloat * 100);
  };

  const saveProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const priceInCents = data.product_type === 'donation' 
        ? 0 
        : convertPriceToCents(data.price);

      const productDataForApi = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        cover_image_url: data.cover_image_url?.trim() || null,
        vertical_cover_image_url: data.vertical_cover_image_url?.trim() || null,
        price_cents: priceInCents,
        file_url_or_access_info: data.file_url_or_access_info?.trim() || null,
        max_installments_allowed: Number(data.max_installments_allowed) || 1,
        is_active: Boolean(data.is_active),
        product_type: data.product_type,
        subscription_frequency: data.product_type === 'subscription' ? data.subscription_frequency : null,
        allowed_payment_methods: Array.isArray(data.allowed_payment_methods) ? data.allowed_payment_methods : [],
        show_order_summary: Boolean(data.show_order_summary),
        donation_title: data.donation_title?.trim() || null,
        donation_description: data.donation_description?.trim() || null,
        checkout_image_url: data.checkout_image_url?.trim() || null,
        checkout_background_color: data.checkout_background_color || '#F3F4F6',
        is_email_optional: Boolean(data.is_email_optional),
        require_email_confirmation: Boolean(data.require_email_confirmation),
        producer_assumes_installments: Boolean(data.producer_assumes_installments),
        delivery_type: data.delivery_type,
        use_batches: data.use_batches ?? false,
      };

      if (mode === 'create') {
        const { data: result, error } = await supabase.functions.invoke('create-product', {
          body: { 
            ...productDataForApi, 
            checkout_link_slug: generateSlug(data.name),
            use_batches: data.use_batches,
            batches: data.batches || []
          }
        });
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase.functions.invoke('update-product', {
          body: { 
            productId, 
            productData: productDataForApi,
            use_batches: data.use_batches,
            batches: data.batches || []
          }
        });
        if (error) throw error;
        return result;
      }
    },
    onSuccess: (result) => {
      toast.success(mode === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      navigate('/products');
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao salvar produto';
      if (error?.context?.error?.message) errorMessage = error.context.error.message;
      else if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("ID do produto não encontrado para exclusão.");
      const { data, error } = await supabase.functions.invoke('delete-product', {
        body: { productId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      const spacesDeleted = result?.deleted_spaces || 0;
      const imagesDeleted = result?.deleted_images || 0;
      toast.success(`Produto excluído completamente! ${spacesDeleted} área(s) de membros e ${imagesDeleted} imagem(ns) removidas.`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['producer-spaces'] });
      navigate('/products');
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao excluir produto';
      if (error?.context?.error?.message) errorMessage = error.context.error.message;
      else if (error?.message) errorMessage = error.message;
      toast.error(errorMessage);
    }
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // <<< CORREÇÃO 3: ERRO AO SALVAR PRODUTO COM LOTES >>>
  // A lógica de validação foi ajustada para ignorar a verificação do preço principal
  // quando a opção "use_batches" está ativa para um evento.
  const handleSubmit = () => {
    if (!formData.name.trim()) { 
      toast.error('Nome do produto é obrigatório'); 
      return; 
    }
    if (!formData.delivery_type) {
      toast.error('Forma de Entrega do Conteúdo é obrigatória');
      return;
    }

    // Preparar payload base
    let dataToSave = { ...formData };
    
    // Determinar se está usando sistema de lotes
    const isUsingBatches = formData.use_batches && formData.product_type === 'event';
    
    // Obter lista de lotes relevante
    const batchesToSave = localBatches;
    
    // Se está usando lotes, definir preço do produto pelo primeiro lote
    if (isUsingBatches && batchesToSave.length > 0) {
      const firstBatch = batchesToSave.reduce((prev, curr) => 
        (prev.display_order ?? 0) < (curr.display_order ?? 0) ? prev : curr
      );
      dataToSave.price = (firstBatch.price_cents / 100).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    
    // Validação de preço: só obrigatório se NÃO for doação e NÃO estiver usando lotes
    if (formData.product_type !== 'donation' && !isUsingBatches) {
      if (convertPriceToCents(dataToSave.price) <= 0) {
        toast.error('O valor do produto deve ser maior que zero.');
        return;
      }
    }
    
    // Construir payload completo
    const payload: any = {
      ...dataToSave,
      use_batches: isUsingBatches,
      batches: isUsingBatches ? batchesToSave : []
    };

    saveProductMutation.mutate(payload);
  };
  // <<< FIM DA CORREÇÃO 3 >>>

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirmation(false);
    deleteProductMutation.mutate();
  };

  const isEventProduct = formData.product_type === 'event';
  const isSubscriptionProduct = formData.product_type === 'subscription';
  const shouldShowTicketsTab = isEventProduct;
  const shouldShowSubscriptionsTab = isSubscriptionProduct && mode === 'edit';

  if (mode === 'edit' && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/products')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{mode === 'create' ? 'Criar Novo Produto' : 'Editar Produto'}</h2>
          <p className="text-muted-foreground">{mode === 'create' ? 'Preencha as informações do seu produto' : 'Altere as informações do produto'}</p>
        </div>
      </div>
      
      <Card className="w-full bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-card-foreground">Configurações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-8 mb-6 bg-muted">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="configuracao">Configuração</TabsTrigger>
              <TabsTrigger value="checkout">Checkout</TabsTrigger>
              <TabsTrigger value="order-bump" disabled={mode === 'create'}>Order Bump</TabsTrigger>
              <TabsTrigger value="pixels" disabled={mode === 'create'}>Pixels</TabsTrigger>
              <TabsTrigger value="links" disabled={mode === 'create'}>Links</TabsTrigger>
              {shouldShowTicketsTab && (
                <TabsTrigger value="ingressos" disabled={mode === 'create'}>Ingressos</TabsTrigger>
              )}
              {shouldShowSubscriptionsTab && (
                <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
              )}
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="geral">
                <GeneralTab 
                  formData={formData} 
                  onInputChange={handleInputChange} 
                  userId={user?.id} 
                  mode={mode} 
                  isLoading={isLoading}
                  productId={productId}
                  localBatches={localBatches}
                  onLocalBatchesChange={setLocalBatches}
                />
                {mode === 'edit' && (
                  <div className="flex justify-start pt-6 mt-6 border-t">
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete} 
                      disabled={deleteProductMutation.isPending} 
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir Produto'}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="configuracao">
                <ConfigurationTab formData={formData} onInputChange={handleInputChange} />
              </TabsContent>
              
              <TabsContent value="checkout">
                <CheckoutTab formData={formData} onInputChange={handleInputChange} />
              </TabsContent>
              
              <TabsContent value="order-bump">
                <OrderBumpTab productId={productId} />
              </TabsContent>
              
              <TabsContent value="pixels">
                <TrackingTab productId={productId} />
              </TabsContent>
              
              <TabsContent value="links">
                <LinksTab productId={productId} checkoutSlug={product?.checkout_link_slug} />
              </TabsContent>
              
              {shouldShowTicketsTab && (
                <TabsContent value="ingressos">
                  <TicketsTab productId={productId} />
                </TabsContent>
              )}
              
              {shouldShowSubscriptionsTab && (
                <TabsContent value="assinaturas">
                  <SubscriptionsTab productId={productId} />
                </TabsContent>
              )}
            </div>
          </Tabs>
          
          {(() => {
            const tabsWithGlobalSave = ['geral', 'configuracao', 'checkout'];
            const shouldShowGlobalSaveButton = tabsWithGlobalSave.includes(activeTab);
            
            return shouldShowGlobalSaveButton ? (
              <div className="flex justify-end pt-6 mt-6 border-t">
                <Button 
                  onClick={handleSubmit} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={saveProductMutation.isPending}
                >
                  {saveProductMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            ) : null;
          })()}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir este produto? Esta ação removerá completamente o produto, seus painéis na área de membros e todos os arquivos relacionados. Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default ProductForm;
