
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Ticket, Users } from "lucide-react";
import { useEffect, useCallback, memo } from "react";

interface EventTicketsSectionProps {
  form: UseFormReturn<any>;
  onQuantityChange?: (quantity: number) => void;
}

interface AttendeeFieldProps {
  form: UseFormReturn<any>;
  index: number;
}

// Memoizar os campos individuais de participantes para evitar re-renderizações desnecessárias
const AttendeeField = memo(({ form, index }: AttendeeFieldProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <h5 className="text-sm font-medium text-gray-700">
        Participante {index + 1}
      </h5>
      
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

export const EventTicketsSection = memo(({ form, onQuantityChange }: EventTicketsSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attendees"
  });

  const quantity = form.watch("quantity");

  // Usar useCallback para memoizar a função de mudança de quantidade
  const handleQuantityChange = useCallback((newQuantity: string) => {
    const numQuantity = parseInt(newQuantity, 10) || 0;
    onQuantityChange?.(numQuantity);
  }, [onQuantityChange]);

  // Gerenciar campos de participantes de forma eficiente
  useEffect(() => {
    const targetCount = parseInt(quantity, 10) || 0;
    const currentCount = fields.length;

    if (targetCount <= 0) {
      // Remover todos os campos se quantidade for 0 ou inválida
      for (let i = currentCount - 1; i >= 0; i--) {
        remove(i);
      }
      return;
    }

    if (currentCount < targetCount) {
      // Adicionar novos campos
      const fieldsToAdd = targetCount - currentCount;
      for (let i = 0; i < fieldsToAdd; i++) {
        append({ name: "", email: "" });
      }
    } else if (currentCount > targetCount) {
      // Remover campos excedentes
      for (let i = currentCount - 1; i >= targetCount; i--) {
        remove(i);
      }
    }
  }, [quantity, fields.length, append, remove]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Ticket className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Ingressos</h3>
      </div>
      
      {/* Campo de Quantidade */}
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
                min="1"
                max="10"
                placeholder="1" 
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
