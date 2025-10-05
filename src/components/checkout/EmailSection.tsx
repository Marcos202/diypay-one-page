
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { Mail } from "lucide-react";

interface EmailSectionProps {
  form: UseFormReturn<any>;
  isEmailOptional?: boolean;
  requireEmailConfirmation?: boolean;
}

export const EmailSection = ({ form, isEmailOptional = false, requireEmailConfirmation = true }: EmailSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Mail className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">E-mail para acesso ao produto</h3>
      </div>
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Digite seu e-mail{!isEmailOptional ? " *" : ""}
            </FormLabel>
            <FormControl>
              <Input 
                type="email" 
                placeholder="seuemail@exemplo.com" 
                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isEmailOptional && requireEmailConfirmation && (
        <FormField
          control={form.control}
          name="confirmEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Confirme o e-mail *</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="seuemail@exemplo.com" 
                  className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
