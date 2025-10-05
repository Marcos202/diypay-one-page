
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PaymentMethodsSection from '../PaymentMethodsSection';

interface ConfigurationTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const ConfigurationTab = ({ formData, onInputChange }: ConfigurationTabProps) => {
  return (
    <div className="space-y-6">
      <PaymentMethodsSection
        allowedPaymentMethods={formData.allowed_payment_methods}
        onPaymentMethodsChange={(methods) => onInputChange('allowed_payment_methods', methods)}
      />

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Configurações de Checkout</h3>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="show_order_summary" className="text-base font-medium">
              Exibir Resumo do Pedido
            </Label>
            <p className="text-sm text-gray-500">
              Mostra um resumo detalhado do pedido na lateral do checkout
            </p>
          </div>
          <Switch
            id="show_order_summary"
            checked={formData.show_order_summary}
            onCheckedChange={(checked) => onInputChange('show_order_summary', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="is_email_optional" className="text-base font-medium">
              Tornar E-mail Opcional
            </Label>
            <p className="text-sm text-gray-500">
              Quando ativo, o e-mail não é obrigatório e o telefone se torna o contato principal
            </p>
          </div>
          <Switch
            id="is_email_optional"
            checked={formData.is_email_optional}
            onCheckedChange={(checked) => onInputChange('is_email_optional', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="require_email_confirmation" className="text-base font-medium">
              Exigir Confirmação de E-mail no Checkout
            </Label>
            <p className="text-sm text-gray-500">
              Quando ativo, o cliente precisará confirmar o e-mail digitando-o duas vezes
            </p>
          </div>
          <Switch
            id="require_email_confirmation"
            checked={formData.require_email_confirmation}
            onCheckedChange={(checked) => onInputChange('require_email_confirmation', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="producer_assumes_installments" className="text-base font-medium">
              Assumir Taxa do Cartão
            </Label>
            <p className="text-sm text-gray-500">
              Quando ativo, você assume os juros de parcelamento, permitindo que o cliente parcele sem acréscimo
            </p>
          </div>
          <Switch
            id="producer_assumes_installments"
            checked={formData.producer_assumes_installments}
            onCheckedChange={(checked) => onInputChange('producer_assumes_installments', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfigurationTab;
