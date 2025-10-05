
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductTypeSectionProps {
  productType: string;
  subscriptionFrequency: string;
  onProductTypeChange: (value: string) => void;
  onSubscriptionFrequencyChange: (value: string) => void;
  showSubscriptionFrequency?: boolean;
}

const ProductTypeSection = ({
  productType,
  subscriptionFrequency,
  onProductTypeChange,
  onSubscriptionFrequencyChange,
  showSubscriptionFrequency = true
}: ProductTypeSectionProps) => {
  const productTypeOptions = [
    { value: 'single_payment', label: 'Pagamento Único' },
    { value: 'subscription', label: 'Assinatura Recorrente' },
    { value: 'event', label: 'Evento Presencial' },
    { value: 'donation', label: 'Doação' }
  ];

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannually', label: 'Semestral' },
    { value: 'annually', label: 'Anual' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product_type">Tipo de Produto *</Label>
        <Select value={productType} onValueChange={onProductTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de produto" />
          </SelectTrigger>
          <SelectContent>
            {productTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Only show subscription frequency if it's a subscription product and showSubscriptionFrequency is true */}
      {productType === 'subscription' && showSubscriptionFrequency && (
        <div className="space-y-2">
          <Label htmlFor="subscription_frequency">Frequência de Cobrança *</Label>
          <Select value={subscriptionFrequency} onValueChange={onSubscriptionFrequencyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ProductTypeSection;
