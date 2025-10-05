
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentMethodsSectionProps {
  allowedPaymentMethods: string[];
  onPaymentMethodsChange: (methods: string[]) => void;
}

const PaymentMethodsSection = ({
  allowedPaymentMethods,
  onPaymentMethodsChange
}: PaymentMethodsSectionProps) => {
  const paymentMethodOptions = [
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'pix', label: 'PIX' },
    { value: 'bank_slip', label: 'Boleto Bancário' }
  ];

  const handleMethodChange = (methodValue: string, checked: boolean) => {
    if (checked) {
      onPaymentMethodsChange([...allowedPaymentMethods, methodValue]);
    } else {
      onPaymentMethodsChange(allowedPaymentMethods.filter(method => method !== methodValue));
    }
  };

  return (
    <div className="space-y-4">
      <Label>Métodos de Pagamento Disponíveis *</Label>
      <div className="space-y-3">
        {paymentMethodOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={option.value}
              checked={allowedPaymentMethods.includes(option.value)}
              onCheckedChange={(checked) => handleMethodChange(option.value, checked as boolean)}
            />
            <Label htmlFor={option.value} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      {allowedPaymentMethods.length === 0 && (
        <p className="text-sm text-red-600">
          Selecione pelo menos um método de pagamento
        </p>
      )}
    </div>
  );
};

export default PaymentMethodsSection;
