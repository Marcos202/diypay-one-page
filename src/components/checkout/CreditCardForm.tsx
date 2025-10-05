
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { CreditCard } from "lucide-react";

interface CreditCardFormProps {
  form: UseFormReturn<any>;
  maxInstallments: number;
  productPriceCents: number;
  producerAssumesInstallments?: boolean;
  installmentInterestRate?: number;
  onInstallmentChange?: (installments: number) => void;
}

export const CreditCardForm = ({ 
  form, 
  maxInstallments, 
  productPriceCents, 
  producerAssumesInstallments = false,
  installmentInterestRate = 3.5,
  onInstallmentChange
}: CreditCardFormProps) => {
  // Input validation and sanitization
  const validateCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    // Basic Luhn algorithm check for card validation
    let sum = 0;
    let isEven = false;
    for (let i = numbers.length - 1; i >= 0; i--) {
      let digit = parseInt(numbers.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0 && numbers.length >= 13 && numbers.length <= 19;
  };

  const formatCardNumber = (value: string) => {
    // Sanitize input to prevent XSS
    const sanitized = value.replace(/[^\d\s]/g, '');
    const numbers = sanitized.replace(/\D/g, '');
    // Limit to maximum card number length
    const limited = numbers.slice(0, 19);
    return limited.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    // Sanitize input
    const sanitized = value.replace(/[^\d\/]/g, '');
    const numbers = sanitized.replace(/\D/g, '');
    // Validate month and year
    if (numbers.length >= 2) {
      const month = numbers.slice(0, 2);
      const year = numbers.slice(2, 4);
      // Validate month (01-12)
      if (parseInt(month, 10) > 12 || parseInt(month, 10) < 1) {
        return numbers.slice(0, 1);
      }
      return numbers.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    }
    return numbers;
  };

  const validateExpiry = (value: string) => {
    const [month, year] = value.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      return false;
    }
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear() % 100;
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return false;
    }
    return expMonth >= 1 && expMonth <= 12;
  };

  const sanitizeCvv = (value: string) => {
    // Remove any non-numeric characters and limit length
    return value.replace(/\D/g, '').slice(0, 4);
  };

  const sanitizeName = (value: string) => {
    // Allow only letters, spaces, and common name characters
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-'\.]/g, '').slice(0, 50).toUpperCase();
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const calculateInstallmentAmount = (installments: number): number => {
    console.log('[CC_FORM] Calculating installment for:', { installments, producerAssumesInstallments, installmentInterestRate, productPriceCents });
    
    if (installments === 1 || producerAssumesInstallments) {
      // No interest - simple division
      const result = productPriceCents / installments;
      console.log('[CC_FORM] No interest calculation - result:', result);
      return result;
    } else {
      // Apply compound interest: FV = PV * (1 + i)^n
      const monthlyRate = installmentInterestRate / 100;
      const finalAmount = productPriceCents * Math.pow(1 + monthlyRate, installments);
      const installmentAmount = finalAmount / installments;
      console.log('[CC_FORM] With interest calculation - monthly rate:', monthlyRate, 'final amount:', finalAmount, 'installment:', installmentAmount);
      return installmentAmount;
    }
  };

  const calculateTotalAmount = (installments: number): number => {
    if (installments === 1 || producerAssumesInstallments) {
      return productPriceCents;
    } else {
      const monthlyRate = installmentInterestRate / 100;
      return productPriceCents * Math.pow(1 + monthlyRate, installments);
    }
  };

  const getInstallmentOptions = () => {
    const options = [];
    for (let i = 1; i <= maxInstallments; i++) {
      const installmentValue = calculateInstallmentAmount(i);
      const totalAmount = calculateTotalAmount(i);
      
      if (i === 1) {
        options.push({
          value: i,
          label: `1x de ${formatPrice(productPriceCents)} (à vista)`
        });
      } else {
        options.push({
          value: i,
          label: `${i}x de ${formatPrice(installmentValue)}`
        });
      }
    }
    return options;
  };

  const cardNumber = form.watch("cardNumber") || "";
  const cardName = form.watch("cardName") || "";
  const cardExpiry = form.watch("cardExpiry") || "";

  return (
    <div className="space-y-3">
      {/* Layout Grid: Mockup Left, Form Fields Right */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Credit Card Mockup - Left Side - MAIOR E MAIS PROEMINENTE */}
        <div className="flex justify-center lg:justify-start">
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white p-6 rounded-2xl shadow-2xl relative overflow-hidden w-full max-w-md" style={{ backgroundColor: '#820ad1', aspectRatio: '1.6/1' }}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-8 h-8 border-2 border-white rounded-full"></div>
              <div className="absolute top-6 right-6 w-6 h-6 border border-white rounded-full"></div>
            </div>
            
            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-mono tracking-wider">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-300 uppercase tracking-wide">Portador</div>
                    <div className="text-xs font-medium uppercase">
                      {cardName || "NOME DO TITULAR"}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs text-gray-300 uppercase tracking-wide">Válido até</div>
                    <div className="text-xs font-medium">
                      {cardExpiry || "MM/AA"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields - Right Side */}
        <div className="space-y-2">
          {/* Linha 1: Número do cartão */}
          <FormField
            control={form.control}
            name="cardNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Número do cartão *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base font-mono"
                    {...field}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      field.onChange(formatted);
                    }}
                    onBlur={(e) => {
                      const numbers = e.target.value.replace(/\D/g, '');
                      if (numbers.length > 0 && !validateCardNumber(numbers)) {
                        form.setError('cardNumber', {
                          type: 'manual',
                          message: 'Número do cartão inválido'
                        });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Linha 2: Vencimento e CVV lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cardExpiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Vencimento *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MM/AA"
                      maxLength={5}
                      className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatExpiry(e.target.value);
                        field.onChange(formatted);
                      }}
                      onBlur={(e) => {
                        if (e.target.value && !validateExpiry(e.target.value)) {
                          form.setError('cardExpiry', {
                            type: 'manual',
                            message: 'Data de vencimento inválida'
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardCvv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">CVV *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123"
                      maxLength={4}
                      className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono"
                      {...field}
                      onChange={(e) => {
                        const sanitized = sanitizeCvv(e.target.value);
                        field.onChange(sanitized);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* Nome do titular em largura total */}
      <FormField
        control={form.control}
        name="cardName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">Nome do titular (como está no cartão) *</FormLabel>
            <FormControl>
              <Input 
                placeholder="JOÃO DA SILVA" 
                className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
                style={{ textTransform: 'uppercase' }}
                {...field}
                onChange={(e) => {
                  const sanitized = sanitizeName(e.target.value);
                  field.onChange(sanitized);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Parcelas e Checkbox */}
      <div className="space-y-2">
        <FormField
          control={form.control}
          name="installments"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Parcelas</FormLabel>
              <Select 
                value={field.value?.toString()} 
                onValueChange={(value) => {
                  const installments = parseInt(value);
                  field.onChange(installments);
                  onInstallmentChange?.(installments);
                }}
              >
                <FormControl>
                  <SelectTrigger className="h-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione o número de parcelas" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {getInstallmentOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saveData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-3 bg-gray-50">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Salvar dados para as próximas compras
                </FormLabel>
                <p className="text-xs text-gray-500">
                  Seus dados serão salvos com segurança para facilitar futuras compras
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
