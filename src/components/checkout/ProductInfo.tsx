
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  product_type?: string;
  donation_title?: string;
  donation_description?: string;
  subscription_frequency?: string;
}

interface ProductInfoProps {
  product: Product;
  donationAmount?: string;
  eventQuantity?: number;
}

export const ProductInfo = ({ product, donationAmount, eventQuantity = 1 }: ProductInfoProps) => {
  const isDonation = product.product_type === 'donation';
  const isEvent = product.product_type === 'event';
  const isSubscription = product.product_type === 'subscription';
  
  const getDisplayPrice = () => {
    if (isDonation && donationAmount) {
      const cleanValue = donationAmount.replace(/[R$\s\.]/g, '').replace(',', '.');
      const numberValue = parseFloat(cleanValue);
      if (!isNaN(numberValue) && numberValue > 0) {
        return Math.round(numberValue * 100);
      }
    }
    
    if (isEvent) {
      return product.price_cents * eventQuantity;
    }
    
    return product.price_cents;
  };

  const getSubscriptionFrequencyText = () => {
    if (!isSubscription || !product.subscription_frequency) return '';
    
    const frequencyMap: { [key: string]: string } = {
      'weekly': 'semana',
      'monthly': 'mês',
      'bimonthly': 'bimestre',
      'quarterly': 'trimestre', 
      'semiannually': 'semestre',
      'biannual': 'semestre',
      'annually': 'ano',
      'annual': 'ano'
    };
    
    return frequencyMap[product.subscription_frequency] || 'período';
  };

  const displayPrice = getDisplayPrice();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {isDonation && product.donation_title ? product.donation_title : product.name}
      </h2>
      
      {isDonation && product.donation_description && (
        <p className="text-gray-600 text-sm mb-4">{product.donation_description}</p>
      )}

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">
            {isEvent ? `Valor unitário:` : 'Valor:'}
          </span>
          <span className="font-medium">
            {isSubscription 
              ? `${formatCurrency(product.price_cents)} / ${getSubscriptionFrequencyText()}`
              : formatCurrency(product.price_cents)
            }
          </span>
        </div>
        
        {isEvent && eventQuantity > 1 && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Quantidade:</span>
              <span className="font-medium">{eventQuantity}</span>
            </div>
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(displayPrice)}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total:</span>
          <span className="text-blue-600">
            {isSubscription 
              ? `${formatCurrency(displayPrice)} / ${getSubscriptionFrequencyText()}`
              : formatCurrency(displayPrice)
            }
          </span>
        </div>
        
        {isSubscription && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Assinatura Recorrente:</strong> Você será cobrado automaticamente a cada {getSubscriptionFrequencyText()}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
