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
  event_date: string | null;
  event_address: string;
  event_description: string;
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
    producer_assumes_installments: false, delivery_type: '', use_batches: false,
    event_date: null, event_address: '', event_description: ''
  });
  
  const [localBatches, setLocalBatches] = useState<any[]>([]);

  console.log('🔧 ProductForm RENDERIZADO', {
    mode,
    productId,
    hasLocalBatches: localBatches?.length,
    formData_use_batches: formData.use_batches
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
      if (error) throw error;
      console.log('✅ Produto carregado:', {
        id: data?.id,
        name: data?.name,
        use_batches: (data as any)?.use_batches
      });
      return data;
    },
    enabled: mode === 'edit' && !!productId
  });

  const { data: dbBatches, isLoading: areBatchesLoading } = useQuery({
    queryKey: ['ticket-batches', productId],
    queryFn: async () => {
      if (!productId) return [];
      const functionName = `ticket-batches-handler?product_id=${productId}`;
      const { data, error } = await supabase.functions.invoke(functionName, { method: 'GET' });
      if (error) throw new Error(error.message);
      console.log('✅ Lotes carregados:', {
        count: data?.batches?.length,
        batches: data?.batches
      });
      return data.batches || [];
    },
    enabled: mode === 'edit' && !!productId && formData.use_batches,
  });

  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData(prevData => ({
        ...prevData,
        name: product.name || '',
        description: product.description || '',
        cover_image_url: product.cover_image_url || '',
        vertical_cover_image_url: product.vertical_cover_image_url || '',
        price: product.price_cents ? (product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
        file_url_or_access_info: product.file_url_or_access_info || '',
        max_installments_allowed: product.max_installments_allowed || 1,
        is_active: product.is_active ?? true,
        product_type: product.product_type || 'single_payment',
        subscription_frequency: product.subscription_frequency || '',
        allowed_payment_methods: Array.isArray(product.allowed_payment_methods) ? product.allowed_payment_methods.map(String) : getDefaultPaymentMethods(product.product_type),
        show_order_summary: product.show_order_summary ?? true,
        donation_title: product.donation_title || '',
        donation_description: product.donation_description || '',
        checkout_image_url: product.checkout_image_url || '',
        checkout_background_color: product.checkout_background_color || '#F3F4F6',
        is_email_optional: product.is_email_optional ?? false,
        require_email_confirmation: product.require_email_confirmation ?? true,
        producer_assumes_installments: product.producer_assumes_installments ?? false,
        delivery_type: (product as any).delivery_type || '',
        use_batches: (product as any).use_batches ?? false,
        event_date: (product as any).event_date || null,
        event_address: (product as any).event_address || '',
        event_description: (product as any).event_description || ''
      }));
      console.log('📝 formData atualizado com produto:', {
        product_id: product.id,
        use_batches: (product as any).use_batches
      });
    } else if (mode === 'create') {
      setLocalBatches([]);
    }
  }, [product, mode]);
  
  useEffect(() => {
    if (dbBatches) {
      setLocalBatches(dbBatches);
      console.log('📦 localBatches atualizado:', {
        count: dbBatches.length,
        batches: dbBatches
      });
    }
  }, [dbBatches]);

  const generateSlug = (name: string) => {
    const baseSlug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
  };

  const convertPriceToCents = (priceString: string): number => {
    if (!priceString) return 0;
    const normalizedPrice = priceString.replace(/\./g, '').replace(',', '.');
    const priceFloat = parseFloat(normalizedPrice);
    return isNaN(priceFloat) ? 0 : Math.round(priceFloat * 100);
  };

  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const functionName = mode === 'create' ? 'create-product' : 'update-product';
      const { data: result, error } = await supabase.functions.invoke(functionName, { body: payload });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-batches', productId] });
      if (mode === 'create') navigate('/products');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar produto');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("ID do produto não encontrado.");
      const { data, error } = await supabase.functions.invoke('delete-product', { body: { productId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Produto excluído com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir produto');
    }
  });

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.delivery_type) {
      toast.error('Nome do produto e Forma de Entrega são obrigatórios.');
      return;
    }

    if (formData.product_type === 'event') {
      if (!formData.event_date) {
        toast.error('A data do evento é obrigatória para eventos presenciais.');
        return;
      }
      if (!formData.event_address?.trim()) {
        toast.error('O endereço do evento é obrigatório para eventos presenciais.');
        return;
      }
    }

    let dataToSave = { ...formData };
    const isUsingBatches = dataToSave.use_batches && dataToSave.product_type === 'event';
    
    if (isUsingBatches && localBatches.length > 0) {
      const sortedBatches = [...localBatches].sort((a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity));
      const firstBatch = sortedBatches[0];
      dataToSave.price = (firstBatch.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }
    
    if (dataToSave.product_type !== 'donation' && !isUsingBatches && convertPriceToCents(dataToSave.price) <= 0) {
      toast.error('O valor do produto deve ser maior que zero.');
      return;
    }
    
    const productDataForApi = {
        name: dataToSave.name.trim(),
        description: dataToSave.description?.trim() || null,
        cover_image_url: dataToSave.cover_image_url?.trim() || null,
        vertical_cover_image_url: dataToSave.vertical_cover_image_url?.trim() || null,
        price_cents: convertPriceToCents(dataToSave.price),
        file_url_or_access_info: dataToSave.file_url_or_access_info?.trim() || null,
        max_installments_allowed: Number(dataToSave.max_installments_allowed) || 1,
        is_active: Boolean(dataToSave.is_active),
        product_type: dataToSave.product_type,
        subscription_frequency: dataToSave.product_type === 'subscription' ? dataToSave.subscription_frequency : null,
        allowed_payment_methods: Array.isArray(dataToSave.allowed_payment_methods) ? dataToSave.allowed_payment_methods : [],
        show_order_summary: Boolean(dataToSave.show_order_summary),
        donation_title: dataToSave.donation_title?.trim() || null,
        donation_description: dataToSave.donation_description?.trim() || null,
        checkout_image_url: dataToSave.checkout_image_url?.trim() || null,
        checkout_background_color: dataToSave.checkout_background_color || '#F3F4F6',
        is_email_optional: Boolean(dataToSave.is_email_optional),
        require_email_confirmation: Boolean(dataToSave.require_email_confirmation),
        producer_assumes_installments: Boolean(dataToSave.producer_assumes_installments),
        delivery_type: dataToSave.delivery_type,
        use_batches: isUsingBatches,
        ...(dataToSave.product_type === 'event' && {
          event_date: dataToSave.event_date ? new Date(dataToSave.event_date).toISOString() : null,
          event_address: dataToSave.event_address?.trim() || null,
          event_description: dataToSave.event_description?.trim() || null,
        }),
      };

    // Log de debug para campos de evento
    console.log('📤 Payload de evento sendo enviado:', {
      product_type: dataToSave.product_type,
      event_date: dataToSave.event_date,
      event_address: dataToSave.event_address,
      event_description: dataToSave.event_description,
      is_event: dataToSave.product_type === 'event'
    });

    const finalPayload = mode === 'create'
      ? { 
          ...productDataForApi, 
          checkout_link_slug: generateSlug(dataToSave.name),
          batches: isUsingBatches ? localBatches : []
        }
      : { 
          productId, 
          productData: productDataForApi,
          use_batches: isUsingBatches,
          batches: isUsingBatches ? localBatches : []
        };
    
    // Validação de batches antes de enviar
    if (isUsingBatches) {
      console.log('🔍 Validando batches antes de enviar:', {
        batches_count: localBatches.length,
        batches_preview: localBatches.slice(0, 2)
      });
      
      const hasInvalidBatch = localBatches.some(batch => 
        !batch.name || 
        !batch.total_quantity || 
        batch.total_quantity <= 0 ||
        !batch.price_cents ||
        batch.price_cents < 0
      );
      
      if (hasInvalidBatch) {
        toast.error('Um ou mais lotes possuem dados inválidos. Verifique e tente novamente.');
        return;
      }
    }
    
    saveProductMutation.mutate(finalPayload);
  };

  const handleDelete = () => setShowDeleteConfirmation(true);
  const confirmDelete = () => {
    setShowDeleteConfirmation(false);
    deleteProductMutation.mutate();
  };
  
  const isLoading = isProductLoading || (mode === 'edit' && formData.use_batches && areBatchesLoading);

  const isEventProduct = formData.product_type === 'event';
  const isSubscriptionProduct = formData.product_type === 'subscription';
  const shouldShowTicketsTab = isEventProduct;
  const shouldShowSubscriptionsTab = isSubscriptionProduct && mode === 'edit';

  // Guard: Bloquear renderização até produto estar carregado
  if (mode === 'edit' && (isProductLoading || !product)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  // Guard: Bloquear se produto usa lotes mas ainda estão carregando
  if (mode === 'edit' && formData.use_batches && areBatchesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando lotes do evento...</p>
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
                // <<< CORREÇÃO CRÍTICA: Erro de sintaxe na tag de fechamento >>>
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
