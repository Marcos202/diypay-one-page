import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";
import InputMask from 'react-input-mask';

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  isPhoneRequired?: boolean;
}

// Função para formatar CPF/CNPJ dinamicamente com limite de 14 dígitos
const formatCPFCNPJ = (value: string): string => {
  // 1. Remove todos os caracteres não numéricos
  const cleanValue = value.replace(/\D/g, '');
  
  // 2. Limita a no máximo 14 dígitos
  const limitedValue = cleanValue.slice(0, 14);
  
  // 3. Aplica a máscara baseada no comprimento
  if (limitedValue.length <= 11) {
    // Máscara de CPF: 999.999.999-99
    return limitedValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Máscara de CNPJ: 99.999.999/9999-99
    return limitedValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

export const PersonalInfoSection = ({ form, isPhoneRequired = false }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <User className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
      </div>
      
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem className="min-h-[70px]">
            <FormLabel>Nome completo *</FormLabel>
            <FormControl>
              <Input placeholder="Digite seu nome completo" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>Celular{isPhoneRequired ? " *" : ""}</FormLabel>
              <FormControl>
                <InputMask
                  mask="(99) 99999-9999"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {(inputProps: any) => <Input {...inputProps} placeholder="(11) 99999-9999" className="placeholder:text-sm" />}
                </InputMask>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem className="min-h-[70px]">
              <FormLabel>CPF/CNPJ *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="CPF ou CNPJ"
                  value={field.value}
                  onChange={(e) => {
                    const formattedValue = formatCPFCNPJ(e.target.value);
                    field.onChange(formattedValue);
                  }}
                  onBlur={field.onBlur}
                  className="placeholder:text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
