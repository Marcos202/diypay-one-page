import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCardForm } from "./CreditCardForm";
import { PixPaymentInfo } from "./PixPaymentInfo";
import { BankSlipPaymentInfo } from "./BankSlipPaymentInfo";
import { UseFormReturn } from "react-hook-form";
import { SiPix } from "react-icons/si";
import { Barcode, CreditCard } from "lucide-react";
import { useEffect } from "react";

interface PaymentMethodTabsProps {
  paymentMethod: "credit_card" | "pix" | "bank_slip";
  setPaymentMethod: (method: "credit_card" | "pix" | "bank_slip") => void;
  form: UseFormReturn<any>;
  maxInstallments: number;
  productPriceCents: number;
  product: {
    allowed_payment_methods: string[];
    product_type: string;
    producer_assumes_installments?: boolean;
  };
  installmentInterestRate?: number;
  onInstallmentChange?: (installments: number) => void;
}

export const PaymentMethodTabs = ({
  paymentMethod,
  setPaymentMethod,
  form,
  maxInstallments,
  productPriceCents,
  product,
  installmentInterestRate = 0,
  onInstallmentChange
}: PaymentMethodTabsProps) => {
  // Para assinaturas, forçar apenas cartão de crédito
  const isSubscription = product.product_type === 'subscription';
  const allowedMethods = isSubscription 
    ? ["credit_card"] 
    : (product.allowed_payment_methods || ["credit_card", "pix", "bank_slip"]);
  
  // Set default payment method to the first allowed method
  useEffect(() => {
    if (allowedMethods.length > 0) {
      const firstAllowedMethod = allowedMethods[0] as "credit_card" | "pix" | "bank_slip";
      setPaymentMethod(firstAllowedMethod);
      form.setValue("paymentMethod", firstAllowedMethod);
    }
  }, [allowedMethods, setPaymentMethod, form]);

  const handleTabChange = (value: string) => {
    const method = value as "credit_card" | "pix" | "bank_slip";
    setPaymentMethod(method);
    form.setValue("paymentMethod", method);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "credit_card":
        return <CreditCard className="w-5 h-5" />;
      case "pix":
        return <SiPix className="w-5 h-5" />;
      case "bank_slip":
        return <Barcode className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "credit_card":
        return "Cartão";
      case "pix":
        return "PIX";
      case "bank_slip":
        return "Boleto";
      default:
        return "";
    }
  };

  const getTabTriggers = () => {
    return allowedMethods.map((method) => (
      <TabsTrigger 
        key={method} 
        value={method} 
        className="flex-1 flex items-center justify-center space-x-2 py-3 px-2 sm:py-4 sm:px-4 text-sm font-medium transition-all duration-200 border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900"
      >
        {getMethodIcon(method)}
        <span>{getMethodLabel(method)}</span>
      </TabsTrigger>
    ));
  };

  const getTabContents = () => {
    const contents = [];
    
    if (allowedMethods.includes("credit_card")) {
      contents.push(
        <TabsContent key="credit_card" value="credit_card" className="mt-6">
          <CreditCardForm
            form={form}
            maxInstallments={isSubscription ? 1 : maxInstallments}
            productPriceCents={productPriceCents}
            producerAssumesInstallments={product.producer_assumes_installments || false}
            installmentInterestRate={installmentInterestRate}
            onInstallmentChange={onInstallmentChange}
          />
        </TabsContent>
      );
    }
    
    if (allowedMethods.includes("pix")) {
      contents.push(
        <TabsContent key="pix" value="pix" className="mt-6">
          <PixPaymentInfo />
        </TabsContent>
      );
    }
    
    if (allowedMethods.includes("bank_slip")) {
      contents.push(
        <TabsContent key="bank_slip" value="bank_slip" className="mt-6">
          <BankSlipPaymentInfo />
        </TabsContent>
      );
    }
    
    return contents;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Método de Pagamento</h3>
        {isSubscription ? (
          <p className="text-sm text-gray-600 mb-4">
            Para assinaturas recorrentes, apenas cartão de crédito é aceito para garantir a cobrança automática.
          </p>
        ) : product.product_type === 'subscription' && (
          <p className="text-sm text-gray-600 mb-4">
            Para assinaturas, a primeira cobrança pode ser paga via PIX, Boleto ou Cartão. As cobranças recorrentes seguintes serão processadas automaticamente.
          </p>
        )}
      </div>
      
      <Tabs value={paymentMethod} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full h-auto bg-transparent p-0 gap-1 sm:gap-2" style={{ gridTemplateColumns: `repeat(${allowedMethods.length}, 1fr)` }}>
          {getTabTriggers()}
        </TabsList>

        {getTabContents()}
      </Tabs>
    </div>
  );
};
