import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { EmailSection } from "./EmailSection";
import { EventTicketsSection } from "./EventTicketsSection";
import { PaymentMethodTabs } from "./PaymentMethodTabs";
import { CheckoutButton } from "./CheckoutButton";
import { DonationValueSection } from "./DonationValueSection";
import OrderBumpCheckout from "./OrderBumpCheckout";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  max_installments_allowed: number;
  product_type?: string;
  donation_title?: string;
  donation_description?: string;
  allowed_payment_methods: Json;
  is_email_optional?: boolean;
  require_email_confirmation?: boolean;
  producer_assumes_installments?: boolean;
  special_offer_enabled?: boolean;
  special_offer_title?: string;
  special_offer_discount_percent?: number;
}

interface TicketBatch {
  id: string;
  name: string;
  price_cents: number;
  total_quantity: number;
  sold_quantity: number;
  is_active: boolean;
  display_order: number;
}

interface CheckoutFormProps {
  product: Product;
  onDonationAmountChange?: (amount: string) => void;
  onEventQuantityChange?: (quantity: number) => void;
  orderBump?: any;
  selectedOrderBumps?: any[];
  onOrderBumpSelect?: (item: any) => void;
  onOrderBumpDeselect?: (item: any) => void;
  selectedBatch?: TicketBatch | null;
  availableBatches?: TicketBatch[] | null;
  onBatchChange?: (batch: TicketBatch) => void;
}

// Base schema for all product types with updated validation messages
const baseSchema = {
  fullName: z.string().min(1, "Obrigatório"),
  cpfCnpj: z.string()
    .min(1, "Obrigatório")
    .transform(val => val.replace(/\D/g, '')) // Remove caracteres não numéricos
    .refine(value => {
      return value.length === 11 || value.length === 14;
    }, {
      message: "Deve conter 11 (CPF) ou 14 (CNPJ) dígitos.",
    }),
  paymentMethod: z.enum(["credit_card", "pix", "bank_slip"]),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  installments: z.number().min(1).default(1),
  saveData: z.boolean().default(false),
};

// Schema for donations
const donationSchema = z.object({
  ...baseSchema,
  donationAmount: z.string().min(1, "Obrigatório"),
});

// Schema for events
const eventSchema = z.object({
  ...baseSchema,
  quantity: z.string(),
  specialQuantity: z.string().optional(),
  attendees: z.array(z.object({
    name: z.string().min(1, "Obrigatório"),
    email: z.string().min(1, "Obrigatório").email("Email inválido"),
    is_special_offer: z.boolean().optional()
  })).min(1, "Pelo menos um participante é obrigatório"),
}).refine((data) => {
  const normalQty = parseInt(data.quantity) || 0;
  const specialQty = parseInt(data.specialQuantity || "0") || 0;
  return (normalQty + specialQty) >= 1;
}, {
  message: "Selecione pelo menos 1 ingresso (normal ou especial)",
  path: ["quantity"]
});

// Schema for regular products
const regularSchema = z.object(baseSchema);

const createCheckoutSchema = (isEmailOptional: boolean, isDonation: boolean, isEvent: boolean, requireEmailConfirmation: boolean) => {
  let schema;
  
  if (isDonation) {
    schema = donationSchema;
  } else if (isEvent) {
    schema = eventSchema;
  } else {
    schema = regularSchema;
  }

  // Phone validation based on email optionality
  const phoneSchema = isEmailOptional 
    ? z.string().min(10, "Telefone é obrigatório")
    : z.string().optional();

  if (isEmailOptional) {
    return schema.extend({
      phone: phoneSchema,
      email: z.string().email("Email inválido").optional().or(z.literal("")),
      confirmEmail: z.string().optional(),
    });
  } else {
    if (requireEmailConfirmation) {
      return schema.extend({
        phone: phoneSchema,
        email: z.string().min(1, "Obrigatório").email("Email inválido"),
        confirmEmail: z.string().min(1, "Obrigatório").email("Email inválido"),
      }).refine((data) => data.email === data.confirmEmail, {
        message: "Os emails devem ser iguais",
        path: ["confirmEmail"],
      });
    } else {
      return schema.extend({
        phone: phoneSchema,
        email: z.string().min(1, "Obrigatório").email("Email inválido"),
        confirmEmail: z.string().optional(),
      });
    }
  }
};

export const CheckoutForm = ({ 
  product, 
  onDonationAmountChange, 
  onEventQuantityChange,
  orderBump,
  selectedOrderBumps = [],
  onOrderBumpSelect,
  onOrderBumpDeselect,
  selectedBatch,
  availableBatches,
  onBatchChange
}: CheckoutFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | "bank_slip">("credit_card");
  const [eventQuantity, setEventQuantity] = useState<number>(product.special_offer_enabled ? 0 : 1);
  const [specialEventQuantity, setSpecialEventQuantity] = useState<number>(0);
  const [activeGateway, setActiveGateway] = useState<string | null>(null);
  const [installmentInterestRate, setInstallmentInterestRate] = useState<number>(0);
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);

  // Fetch installment interest rate from platform settings
  useEffect(() => {
    const fetchInstallmentRate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-platform-fees');
        if (error) {
          console.error('Error calling get-platform-fees function:', error);
          throw error;
        }
        
        console.log('[INSTALLMENT_RATE] Platform fees response:', data);
        
        // Convert percentage to decimal if needed
        const rateValue = data?.card_installment_interest_rate || 0;
        setInstallmentInterestRate(rateValue);
        
        console.log('[INSTALLMENT_RATE] Set interest rate to:', rateValue, '%');
      } catch (error) {
        console.error('Error fetching installment rate:', error);
        setInstallmentInterestRate(3.5); // Fallback to default 3.5%
      }
    };

    fetchInstallmentRate();
  }, []);
  
  const isDonation = product.product_type === 'donation';
  const isEvent = product.product_type === 'event';
  const isEmailOptional = product.is_email_optional || false;
  const requireEmailConfirmation = product.require_email_confirmation ?? true;

  // Convert Json to string array with fallback
  const allowedPaymentMethods = useMemo(() => {
    return Array.isArray(product.allowed_payment_methods) 
      ? product.allowed_payment_methods as string[]
      : ["credit_card", "pix", "bank_slip"];
  }, [product.allowed_payment_methods]);

  const checkoutSchema = useMemo(() => {
    return createCheckoutSchema(isEmailOptional, isDonation, isEvent, requireEmailConfirmation);
  }, [isEmailOptional, isDonation, isEvent, requireEmailConfirmation]);

  type CheckoutFormData = z.infer<typeof checkoutSchema>;

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      installments: 1,
      saveData: false,
      ...(isDonation && { donationAmount: "" }),
      ...(isEvent && { 
        quantity: product.special_offer_enabled ? "0" : "1", 
        specialQuantity: "0",
        attendees: [] 
      }),
      email: "",
      confirmEmail: "",
      phone: "",
    } as any,
  });

  // Memoizar a função de mudança de valor de doação
  const handleDonationAmountChange = useCallback((amount: string) => {
    onDonationAmountChange?.(amount);
  }, [onDonationAmountChange]);

  // Observar mudanças no valor da doação de forma otimizada
  const donationAmount = isDonation ? form.watch('donationAmount' as any) as string : undefined;
  
  // Usar useCallback para evitar re-renders desnecessários
  const handleEventQuantityChange = useCallback((quantity: number) => {
    setEventQuantity(quantity);
    onEventQuantityChange?.(quantity);
  }, [onEventQuantityChange]);

  const handleSpecialEventQuantityChange = useCallback((quantity: number) => {
    setSpecialEventQuantity(quantity);
  }, []);

  // Chamar a função de mudança apenas quando necessário
  useMemo(() => {
    if (isDonation && donationAmount !== undefined) {
      handleDonationAmountChange(donationAmount);
    }
  }, [isDonation, donationAmount, handleDonationAmountChange]);

  const validateRequiredFields = (data: CheckoutFormData): boolean => {
    if (isDonation) {
      const donationValue = (data as any).donationAmount;
      if (!donationValue || convertToCents(donationValue) === 0) {
        toast({ 
          title: "Valor obrigatório", 
          description: "Por favor, informe um valor válido para a doação.", 
          variant: "destructive" 
        });
        return false;
      }
    }

    if (isEvent) {
      const eventData = data as any;
      const quantity = parseInt(eventData.quantity || "0");
      if (quantity < 1) {
        toast({ 
          title: "Quantidade obrigatória", 
          description: "Por favor, informe a quantidade de ingressos.", 
          variant: "destructive" 
        });
        return false;
      }

      if (!eventData.attendees || eventData.attendees.length !== quantity) {
        toast({ 
          title: "Dados dos participantes", 
          description: "Por favor, preencha os dados de todos os participantes.", 
          variant: "destructive" 
        });
        return false;
      }

      // Validar se todos os campos dos participantes estão preenchidos
      for (let i = 0; i < eventData.attendees.length; i++) {
        const attendee = eventData.attendees[i];
        if (!attendee.name || !attendee.email) {
          toast({ 
            title: "Dados incompletos", 
            description: `Por favor, preencha nome e email do participante ${i + 1}.`, 
            variant: "destructive" 
          });
          return false;
        }
      }
    }
    
    // Validar se pelo menos e-mail ou telefone foi fornecido quando e-mail é opcional
    if (isEmailOptional && !data.email && !data.phone) {
      toast({ 
        title: "Contato obrigatório", 
        description: "Por favor, forneça pelo menos um e-mail ou telefone para contato.", 
        variant: "destructive" 
      });
      return false;
    }
    
    if (data.paymentMethod === "credit_card" && (!data.cardNumber || !data.cardName || !data.cardExpiry || !data.cardCvv)) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Todos os dados do cartão são obrigatórios.", 
        variant: "destructive" 
      });
      return false;
    }
    return true;
  };

  const convertToCents = (value: string | undefined): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/[R$\s\.]/g, '').replace(',', '.');
    const numberValue = parseFloat(cleanValue);
    if (isNaN(numberValue) || numberValue <= 0) return 0;
    return Math.round(numberValue * 100);
  };
  
  const createIuguCustomer = async (data: CheckoutFormData) => {
    const { data: result, error } = await supabase.functions.invoke('get-or-create-iugu-customer', {
      body: { email: data.email, name: data.fullName, cpf_cnpj: data.cpfCnpj, phone: data.phone },
    });
    if (error) throw new Error('Erro ao criar ou buscar cliente Iugu.');
    return result;
  };
  
  const createPaymentToken = async (data: CheckoutFormData) => {
    if (data.paymentMethod !== "credit_card" || !data.cardName || !data.cardExpiry || !data.cardCvv) return null;
    
    const [firstName, ...lastNameParts] = data.cardName.split(' ');
    const lastName = lastNameParts.join(' ');
    const [month, year] = data.cardExpiry.split('/');

    if (activeGateway === 'asaas') {
      // Para Asaas, retornamos os dados brutos do cartão em vez de tokenizar
      return { 
        type: 'asaas', 
        cardData: {
          number: data.cardNumber?.replace(/\s/g, '') || '',
          expiryMonth: month,
          expiryYear: `20${year}`,
          ccv: data.cardCvv,
          holderName: data.cardName,
        }
      };
    } else {
      // Tokenizar com Iugu (código existente)
      const { data: result, error } = await supabase.functions.invoke('create-iugu-payment-token', {
        body: {
          card_number: data.cardNumber?.replace(/\s/g, ''),
          verification_value: data.cardCvv,
          first_name: firstName,
          last_name: lastName,
          month,
          year: `20${year}`,
        },
      });
      if (error) throw new Error('Erro ao tokenizar cartão.');
      return { type: 'iugu', token: result.id };
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!validateRequiredFields(data)) return;
    setIsLoading(true);

    try {
      let customerResponse;
      let buyer_profile_id;
      let iugu_customer_id = null;

      if (activeGateway === 'iugu') {
        customerResponse = await createIuguCustomer(data);
        if (!customerResponse.success) throw new Error(customerResponse.error || "Falha ao criar cliente Iugu");
        buyer_profile_id = customerResponse.buyer_profile_id;
        iugu_customer_id = customerResponse.iugu_customer_id;
      } else {
        // Para outros gateways, apenas buscar/criar o perfil do comprador
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', data.email)
          .single();
        
        buyer_profile_id = profile?.id || null;
      }

      const cardTokenResult = await createPaymentToken(data);

      // Calculate final amount based on installments and interest
      const baseAmount = isDonation 
        ? convertToCents((data as any).donationAmount) 
        : isEvent
          ? (() => {
              const normalQty = parseInt((data as any).quantity || "0");
              const specialQty = parseInt((data as any).specialQuantity || "0");
              
              // Calcular valor dos ingressos normais usando displayPriceCents
              let total = displayPriceCents * normalQty;
              
              // Se houver ingressos especiais, aplicar desconto
              if (product.special_offer_enabled && specialQty > 0) {
                const discountPercent = product.special_offer_discount_percent || 50;
                const specialPrice = displayPriceCents * (1 - discountPercent / 100);
                total += specialPrice * specialQty;
              }
              
              console.log('[CHECKOUT] Base amount calculation:', {
                normalQty,
                specialQty,
                displayPriceCents,
                hasSelectedBatch: !!selectedBatch,
                total,
                specialOfferEnabled: product.special_offer_enabled,
                specialOfferDiscount: product.special_offer_discount_percent
              });
              
              return Math.round(total);
            })()
          : product.price_cents;
      
      const finalAmountCents = data.paymentMethod === 'credit_card' ? 
        calculateTotalWithInterest(baseAmount, data.installments) : 
        baseAmount;

      const transactionPayload: any = {
        product_id: product.id,
        buyer_email: data.email || data.phone,
        buyer_profile_id,
        payment_method_selected: data.paymentMethod,
        installments: data.installments,
        buyer_name: data.fullName,
        buyer_cpf_cnpj: data.cpfCnpj,
        buyer_phone: data.phone,
        amount_total_cents: Math.round(finalAmountCents),
        original_product_price_cents: baseAmount,
        producer_assumes_installments: product.producer_assumes_installments || false,
        batch_id: selectedBatch?.id || null,
      };

      console.log('[CHECKOUT] Sending payment with batch_id:', selectedBatch?.id);

      // Adicionar dados do cartão baseado no gateway
      if (cardTokenResult) {
        if (cardTokenResult.type === 'asaas') {
          // Para Asaas, enviamos os dados brutos do cartão
          transactionPayload.credit_card_data = cardTokenResult.cardData;
        } else if (cardTokenResult.type === 'iugu') {
          transactionPayload.card_token = cardTokenResult.token;
          transactionPayload.iugu_customer_id = iugu_customer_id;
        }
      } else if (activeGateway === 'iugu') {
        transactionPayload.iugu_customer_id = iugu_customer_id;
      }

      if (isDonation) {
        const donationValue = (data as any).donationAmount;
        transactionPayload.donation_amount_cents = convertToCents(donationValue);
      }

      if (isEvent) {
        const eventData = data as any;
        const normalQty = parseInt(eventData.quantity || "0");
        const specialQty = parseInt(eventData.specialQuantity || "0");
        
        transactionPayload.quantity = normalQty + specialQty;
        transactionPayload.normal_tickets_quantity = normalQty;
        transactionPayload.special_tickets_quantity = specialQty;
        transactionPayload.attendees = eventData.attendees;
        
        if (product.special_offer_enabled && specialQty > 0) {
          transactionPayload.special_offer_discount_percent = product.special_offer_discount_percent || 50;
        }
      }
      
      // Adicionar order bumps selecionados
      if (selectedOrderBumps && selectedOrderBumps.length > 0) {
        transactionPayload.order_bump_items = selectedOrderBumps.map(item => ({
          bump_item_id: item.id,
          product_id: item.products.id,
          product_name: item.products.name,
          price_cents: item.products.price_cents,
          discount_percent: item.discount_percent,
          final_price_cents: Math.round(item.products.price_cents * (1 - item.discount_percent / 100)),
        }));
      }
      
      console.log('[DEBUG] PAYLOAD FINAL SENDO ENVIADO:', transactionPayload);

      const { data: result, error: transactionError } = await supabase.functions.invoke(
        'create-payment-transaction',
        { body: transactionPayload }
      );

      if (transactionError) throw transactionError;
      if (!result.success) {
        const errorMessage = result.lugu_errors ? JSON.stringify(result.lugu_errors) : "Falha ao processar pagamento.";
        throw new Error(errorMessage);
      }
      
      window.location.href = `/payment-confirmation/${result.sale_id}`;

    } catch (error: any) {
      console.error('[ERRO] NO PROCESSO DE PAGAMENTO:', error);
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Centralizar cálculo de preço - fonte única da verdade
  const displayPriceCents = isEvent && selectedBatch
    ? selectedBatch.price_cents
    : product.price_cents;
  
  const getDisplayAmount = useCallback((): number => {
    let baseAmount = 0;
    
    if (isDonation) {
      const donationValue = form.getValues('donationAmount' as any) as string;
      baseAmount = convertToCents(donationValue);
    } else if (isEvent) {
      baseAmount = product.price_cents * eventQuantity;
    } else {
      baseAmount = product.price_cents;
    }
    
    // Adicionar order bumps selecionados
    const orderBumpTotal = selectedOrderBumps.reduce((total, item) => {
      const bumpPrice = item.products.price_cents;
      const discount = (bumpPrice * item.discount_percent) / 100;
      return total + (bumpPrice - discount);
    }, 0);
    
    return baseAmount + orderBumpTotal;
  }, [isDonation, isEvent, product.price_cents, eventQuantity, form, selectedOrderBumps]);

  // Fetch active gateway on component mount
  useEffect(() => {
    const fetchActiveGateway = async () => {
      try {
        const { data: gatewayData, error: gatewayError } = await supabase.functions.invoke('get-active-gateway');
        if (!gatewayError && gatewayData.success) {
          setActiveGateway(gatewayData.gateway.gateway_identifier);
        }
      } catch (error) {
        console.error('Error fetching active gateway:', error);
      }
    };
    
    fetchActiveGateway();
  }, []);

  // Calculate installment amount with or without interest
  const calculateInstallmentAmount = (priceCents: number, installments: number): number => {
    console.log('[CALCULATE_INSTALLMENT] Input:', { priceCents, installments, producerAssumes: product.producer_assumes_installments, interestRate: installmentInterestRate });
    
    if (installments === 1 || product.producer_assumes_installments) {
      // No interest - simple division
      const result = priceCents / installments;
      console.log('[CALCULATE_INSTALLMENT] No interest - result:', result);
      return result;
    } else {
      // Apply compound interest: FV = PV * (1 + i)^n
      const monthlyRate = installmentInterestRate / 100;
      const finalAmount = priceCents * Math.pow(1 + monthlyRate, installments);
      const installmentAmount = finalAmount / installments;
      console.log('[CALCULATE_INSTALLMENT] With interest - monthly rate:', monthlyRate, 'final amount:', finalAmount, 'installment:', installmentAmount);
      return installmentAmount;
    }
  };

  // Calculate total amount with interest if applicable
  const calculateTotalWithInterest = (priceCents: number, installments: number): number => {
    console.log('[CALCULATE_TOTAL] Input:', { priceCents, installments, producerAssumes: product.producer_assumes_installments, interestRate: installmentInterestRate });
    
    if (installments === 1 || product.producer_assumes_installments) {
      console.log('[CALCULATE_TOTAL] No interest - returning original price:', priceCents);
      return priceCents;
    } else {
      const monthlyRate = installmentInterestRate / 100;
      const totalWithInterest = priceCents * Math.pow(1 + monthlyRate, installments);
      console.log('[CALCULATE_TOTAL] With interest - monthly rate:', monthlyRate, 'total with interest:', totalWithInterest);
      return totalWithInterest;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white rounded-none border-0 shadow-none lg:rounded-lg lg:border lg:border-gray-200 lg:shadow-lg">
        <CardContent className="px-4 sm:px-8 pb-6 pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              {/* Active Batch Display - Only for events */}
              {product.product_type === 'event' && selectedBatch && (
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg p-4 sm:p-5 shadow-sm mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Lote Ativo</p>
                      <p className="text-lg font-bold text-foreground">{selectedBatch.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Preço</p>
                      <p className="text-xl font-bold text-primary">
                        R$ {(selectedBatch.price_cents / 100).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedBatch.total_quantity - selectedBatch.sold_quantity} ingressos disponíveis
                  </p>
                </div>
              )}

              {/* Personal Info Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <PersonalInfoSection form={form} isPhoneRequired={isEmailOptional} />
              </div>

              {/* Email Section - Only render if email is NOT optional */}
              {!isEmailOptional && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                  <EmailSection 
                    form={form} 
                    isEmailOptional={isEmailOptional}
                    requireEmailConfirmation={requireEmailConfirmation}
                  />
                </div>
              )}

              {/* Event Tickets Section */}
              {isEvent && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                  <EventTicketsSection 
                    form={form}
                    onQuantityChange={handleEventQuantityChange}
                    specialOfferEnabled={product.special_offer_enabled || false}
                    specialOfferTitle={product.special_offer_title || 'Meia Entrada'}
                    onSpecialQuantityChange={handleSpecialEventQuantityChange}
                  />
                </div>
              )}
              
              {/* Donation Section */}
              {isDonation && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                  <DonationValueSection 
                    form={form}
                    title={product.donation_title}
                    description={product.donation_description}
                  />
                </div>
              )}

              {/* Payment Methods Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                  <PaymentMethodTabs
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    form={form}
                    maxInstallments={product.max_installments_allowed}
                    productPriceCents={getDisplayAmount()}
                    product={{
                      allowed_payment_methods: allowedPaymentMethods,
                      product_type: product.product_type || 'single_payment',
                      producer_assumes_installments: product.producer_assumes_installments || false
                    }}
                    installmentInterestRate={installmentInterestRate}
                    onInstallmentChange={setSelectedInstallments}
                  />
              </div>

              {/* Order Bump Section */}
              {orderBump && orderBump.order_bump_items && orderBump.order_bump_items.length > 0 && (
                <OrderBumpCheckout
                  orderBump={orderBump}
                  onSelect={onOrderBumpSelect!}
                  onDeselect={onOrderBumpDeselect!}
                />
              )}

              {/* Checkout Button */}
              <div className="pt-2">
                <CheckoutButton isLoading={isLoading} />
              </div>

              {/* Footer */}
              <div className="text-center pt-3 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🔒</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Pagamento 100% seguro processado por <span className="font-bold text-green-600">DIYPay</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seus dados estão protegidos com criptografia SSL
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
