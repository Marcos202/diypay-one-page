
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Ticket, Users } from "lucide-react";
import { useEffect, useCallback, memo } from "react";

interface EventTicketsSectionProps {
  form: UseFormReturn<any>;
  onQuantityChange?: (quantity: number) => void;
  specialOfferEnabled?: boolean;
  specialOfferTitle?: string;
  onSpecialQuantityChange?: (quantity: number) => void;
}

interface AttendeeFieldProps {
  form: UseFormReturn<any>;
  index: number;
}

// Memoizar os campos individuais de participantes para evitar re-renderizações desnecessárias
const AttendeeField = memo(({ form, index }: AttendeeFieldProps) => {
  const isSpecialOffer = form.watch(`attendees.${index}.is_special_offer`);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700">
          Participante {index + 1}
        </h5>
        {isSpecialOffer && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            Participante beneficiário
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`attendees.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                Nome completo *
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nome do participante"
                  className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name={`attendees.${index}.email`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                E-mail *
              </FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="email@exemplo.com"
                  className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
});

export const EventTicketsSection = memo(({ 
  form, 
  onQuantityChange, 
  specialOfferEnabled = false,
  specialOfferTitle = 'Meia Entrada',
  onSpecialQuantityChange 
}: EventTicketsSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attendees"
  });

  const quantity = form.watch("quantity");
  const specialQuantity = form.watch("specialQuantity");

  // Usar useCallback para memoizar as funções de mudança de quantidade
  const handleQuantityChange = useCallback((newQuantity: string) => {
    const numQuantity = parseInt(newQuantity, 10) || 0;
    onQuantityChange?.(numQuantity);
  }, [onQuantityChange]);

  const handleSpecialQuantityChange = useCallback((newQuantity: string) => {
    const numQuantity = parseInt(newQuantity, 10) || 0;
    onSpecialQuantityChange?.(numQuantity);
  }, [onSpecialQuantityChange]);

  // Gerenciar campos de participantes de forma eficiente
  useEffect(() => {
    const normalQty = parseInt(quantity, 10) || 0;
    const specialQty = specialOfferEnabled ? (parseInt(specialQuantity, 10) || 0) : 0;
    const targetCount = normalQty + specialQty;
    const currentCount = fields.length;

    if (targetCount <= 0) {
      // Remover todos os campos se quantidade for 0 ou inválida
      for (let i = currentCount - 1; i >= 0; i--) {
        remove(i);
      }
      return;
    }

    if (currentCount < targetCount) {
      // Adicionar novos campos, marcando os especiais
      const fieldsToAdd = targetCount - currentCount;
      const normalQty = parseInt(quantity, 10) || 0;
      for (let i = 0; i < fieldsToAdd; i++) {
        const isSpecialOffer = (currentCount + i) >= normalQty;
        append({ name: "", email: "", is_special_offer: isSpecialOffer });
      }
    } else if (currentCount > targetCount) {
      // Remover campos excedentes
      for (let i = currentCount - 1; i >= targetCount; i--) {
        remove(i);
      }
    }
  }, [quantity, specialQuantity, specialOfferEnabled, fields.length, append, remove]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Ticket className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Ingressos</h3>
      </div>
      
      {/* Campo de Quantidade Normal */}
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Quantidade de ingressos *
            </FormLabel>
            <FormControl>
              <Input 
                type="number"
                min={specialOfferEnabled ? "0" : "1"}
                max="10"
                placeholder={specialOfferEnabled ? "0" : "1"}
                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  handleQuantityChange(e.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Campo de Quantidade Especial */}
      {specialOfferEnabled && (
        <FormField
          control={form.control}
          name="specialQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                {specialOfferTitle} *
              </FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0"
                  className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    handleSpecialQuantityChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Campos Dinâmicos de Participantes */}
      {fields.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="text-md font-semibold text-gray-900">Dados dos Participantes</h4>
          </div>
          
          {fields.map((field, index) => (
            <AttendeeField
              key={field.id}
              form={form}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
});

AttendeeField.displayName = "AttendeeField";
EventTicketsSection.displayName = "EventTicketsSection";
