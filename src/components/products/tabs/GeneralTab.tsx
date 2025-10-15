// src/components/products/tabs/GeneralTab.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductCoverUpload } from "../ProductCoverUpload";
import { ProductVerticalCoverUpload } from "../ProductVerticalCoverUpload";
import { ImageFormatGuide } from "../ImageFormatGuide";
import DeliveryTypeSection from "../DeliveryTypeSection";
import { BatchManagementSection } from "../BatchManagementSection";

interface GeneralTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  userId?: string;
  mode?: 'create' | 'edit';
  isLoading?: boolean;
  productId?: string;
}

const GeneralTab = ({ formData, onInputChange, userId, mode = 'create', isLoading = false, productId }: GeneralTabProps) => {
  const isPriceDisabled = formData.product_type === 'donation';
  const isDonation = formData.product_type === 'donation';
  const isSubscription = formData.product_type === 'subscription';
  const isEvent = formData.product_type === 'event';

  const convertPriceToCents = (price: string): number => {
    const numbers = price.replace(/\D/g, '');
    return parseInt(numbers) || 0;
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePriceChange = (value: string) => {
    onInputChange('price', formatCurrency(value));
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'single_payment': return 'Pagamento Único';
      case 'subscription': return 'Assinatura Recorrente';
      case 'event': return 'Evento Presencial';
      case 'donation': return 'Doação';
      default: return 'Produto';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-muted rounded-lg border">
        <h3 className="text-xl font-bold text-foreground">
          Criando um Novo {getProductTypeLabel(formData.product_type)}
        </h3>
      </div>

      {isSubscription && (
        <div className="space-y-2">
          <Label htmlFor="subscription_frequency">Frequência de Cobrança *</Label>
          <Select value={formData.subscription_frequency} onValueChange={(value) => onInputChange('subscription_frequency', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="bimonthly">Bimestral</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="semiannually">Semestral</SelectItem>
              <SelectItem value="annually">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input id="name" value={formData.name} onChange={(e) => onInputChange('name', e.target.value)} placeholder="Ex: Curso de Marketing Digital" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição do Produto</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => onInputChange('description', e.target.value)} placeholder="Descreva seu produto..." rows={4} />
      </div>

      {userId && (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Imagens do Produto</Label>
            <ImageFormatGuide />
            <p className="text-sm text-muted-foreground text-center">
              As imagens horizontais são ideais para listagens e visualização padrão, enquanto as verticais serão bem utilizadas na área de membros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 min-h-[200px] flex flex-col">
              <Label className="text-center font-medium">Imagem Horizontal</Label>
              <div className="flex-1">
                <ProductCoverUpload
                  onUploadSuccess={(url) => onInputChange('cover_image_url', url)}
                  initialUrl={formData.cover_image_url}
                  userId={userId}
                />
              </div>
            </div>

            <div className="space-y-3 min-h-[200px] flex flex-col">
              <Label className="text-center font-medium">Imagem Vertical</Label>
              <div className="flex-1">
                <ProductVerticalCoverUpload
                  onUploadSuccess={(url) => onInputChange('vertical_cover_image_url', url)}
                  initialUrl={formData.vertical_cover_image_url}
                  userId={userId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <DeliveryTypeSection 
        formData={formData} 
        onInputChange={onInputChange}
        mode={mode}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="price">{isPriceDisabled ? 'Valor (Definido pelo Cliente)' : isSubscription ? 'Valor da Assinatura (R$) *' : 'Valor do Produto (R$) *'}</Label>
          {isPriceDisabled ? ( <Input id="price" type="text" value="Valor livre" disabled={true} className="bg-muted" /> ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R$</span>
              <Input id="price" placeholder="0,00" value={formData.price} onChange={(e) => handlePriceChange(e.target.value)} className="pl-10 text-lg font-semibold" required />
            </div>
          )}
          {isPriceDisabled && (<p className="text-sm text-muted-foreground">Para doações, o valor será definido pelo cliente no momento da compra</p>)}
          {isSubscription && (<p className="text-sm text-blue-600">Este valor será cobrado de acordo com a frequência selecionada</p>)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="installments">Parcelas Máximas</Label>
          <Input id="installments" type="number" min="1" max="12" value={formData.max_installments_allowed} onChange={(e) => onInputChange('max_installments_allowed', parseInt(e.target.value))} disabled={isSubscription} />
          {isSubscription && (<p className="text-sm text-muted-foreground">Para assinaturas, o pagamento deve ser à vista</p>)}
        </div>
      </div>

      {isEvent && (
        <>
          {/* Meia Entrada / Ofertas Especiais - Always show for events */}
          <div className="space-y-4 p-5 border-2 border-primary/20 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="special_offer_enabled" className="text-base font-semibold">
                  Meia Entrada / Ofertas Especiais
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ative para oferecer ingressos com desconto (estudantes, idosos, etc)
                </p>
              </div>
              <Switch
                id="special_offer_enabled"
                checked={formData.special_offer_enabled || false}
                onCheckedChange={(checked) => {
                  onInputChange('special_offer_enabled', checked);
                  if (checked && !formData.special_offer_title) {
                    onInputChange('special_offer_title', 'Meia Entrada');
                  }
                  if (checked && !formData.special_offer_discount_percent) {
                    onInputChange('special_offer_discount_percent', 50);
                  }
                }}
              />
            </div>

            {formData.special_offer_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                <div className="space-y-2">
                  <Label htmlFor="special_offer_title">
                    Título da Oferta *
                  </Label>
                  <Input
                    id="special_offer_title"
                    value={formData.special_offer_title || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 22);
                      onInputChange('special_offer_title', value);
                    }}
                    placeholder="Ex: Meia Entrada, Estudante da UFT"
                    maxLength={22}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 22 caracteres ({22 - (formData.special_offer_title?.length || 0)} restantes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_offer_discount_percent">
                    Desconto (%) *
                  </Label>
                  <Input
                    id="special_offer_discount_percent"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.special_offer_discount_percent || 50}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 50));
                      onInputChange('special_offer_discount_percent', value);
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor entre 1% e 100%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Batch Management Section - Only in edit mode with productId */}
          {mode === 'edit' && productId && (
            <BatchManagementSection 
              productId={productId}
              basePrice={convertPriceToCents(formData.price)}
            />
          )}
        </>
      )}
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="is_active" className="text-base font-medium">Produto Ativo</Label>
          <p className="text-sm text-muted-foreground">Produto disponível para venda</p>
        </div>
        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => onInputChange('is_active', checked)} />
      </div>

      {isDonation && (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900">Personalização para Doações</h4>
          <div className="space-y-2">
            <Label htmlFor="donation_title" className="text-blue-900">Título da Seção de Doação</Label>
            <Input id="donation_title" value={formData.donation_title} onChange={(e) => onInputChange('donation_title', e.target.value)} placeholder="Ex: Apoie este Projeto" />
            <p className="text-xs text-blue-600">Título personalizado para a seção onde o cliente define o valor</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="donation_description" className="text-blue-900">Descrição da Doação</Label>
            <Textarea id="donation_description" value={formData.donation_description} onChange={(e) => onInputChange('donation_description', e.target.value)} placeholder="Descreva como a doação será utilizada..." rows={3} />
            <p className="text-xs text-blue-600">Texto explicativo sobre o propósito da doação</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralTab;
