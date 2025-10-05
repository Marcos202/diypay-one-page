// Copie e cole este código completo em src/pages/Admin/AdminFeesPage.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Percent, Users, Search, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Esquema de validação para o formulário de taxas padrão
const platformFeesSchema = z.object({
  default_pix_fee_percent: z.coerce.number(),
  default_boleto_fee_percent: z.coerce.number(),
  default_card_fee_percent: z.coerce.number(),
  default_fixed_fee_cents: z.coerce.number(),
  card_installment_interest_rate: z.coerce.number(),
  default_security_reserve_percent: z.coerce.number(),
  default_security_reserve_days: z.coerce.number(),
  default_withdrawal_fee_cents: z.coerce.number(),
  default_pix_release_days: z.coerce.number(),
  default_boleto_release_days: z.coerce.number(),
  default_card_release_days: z.coerce.number(),
});

type PlatformFeesForm = z.infer<typeof platformFeesSchema>;

const AdminFeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const platformForm = useForm<PlatformFeesForm>({
    resolver: zodResolver(platformFeesSchema),
  });

  // Query para buscar as configurações da plataforma
  const { data: platformSettings, isLoading: platformLoading } = useQuery({
    queryKey: ['platform-fees'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-fees');
      if (error) throw error;
      return data;
    },
  });

  // Efeito para preencher o formulário quando os dados chegam
  useEffect(() => {
    if (platformSettings) {
      platformForm.reset({
        default_pix_fee_percent: platformSettings.default_pix_fee_percent ?? 5.0,
        default_boleto_fee_percent: platformSettings.default_boleto_fee_percent ?? 5.0,
        default_card_fee_percent: platformSettings.default_card_fee_percent ?? 5.0,
        default_fixed_fee_cents: (platformSettings.default_fixed_fee_cents ?? 100) / 100,
        card_installment_interest_rate: platformSettings.card_installment_interest_rate ?? 3.50,
        default_security_reserve_percent: platformSettings.default_security_reserve_percent ?? 4.0,
        default_security_reserve_days: platformSettings.default_security_reserve_days ?? 30,
        default_withdrawal_fee_cents: (platformSettings.default_withdrawal_fee_cents ?? 367) / 100,
        default_pix_release_days: platformSettings.default_pix_release_days ?? 2,
        default_boleto_release_days: platformSettings.default_boleto_release_days ?? 2,
        default_card_release_days: platformSettings.default_card_release_days ?? 15,
      });
    }
  }, [platformSettings, platformForm]);

  // Mutação para atualizar as configurações
  const updatePlatformFeesMutation = useMutation({
    mutationFn: async (data: PlatformFeesForm) => {
      const payload = {
        ...data,
        default_fixed_fee_cents: Math.round(data.default_fixed_fee_cents * 100),
        default_withdrawal_fee_cents: Math.round(data.default_withdrawal_fee_cents * 100),
      };
      const { error } = await supabase.functions.invoke('update-platform-fees', { body: payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Taxas padrão atualizadas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar as taxas.", variant: "destructive" });
    },
  });

  const onPlatformSubmit = (data: PlatformFeesForm) => {
    updatePlatformFeesMutation.mutate(data);
  };

  if (platformLoading) {
    return <div className="p-8">Carregando configurações...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Taxas e Prazos</h1>
        <p className="text-muted-foreground mt-2">Configure as taxas de comissão e prazos de repasse da plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Taxas Padrão da Plataforma</CardTitle>
          <CardDescription>Taxas aplicadas para todos os produtores por padrão.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...platformForm}>
            <form onSubmit={platformForm.handleSubmit(onPlatformSubmit)} className="space-y-6">
              {/* Seção de Taxas Percentuais e Fixas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField control={platformForm.control} name="default_pix_fee_percent" render={({ field }) => ( <FormItem><FormLabel>Taxa PIX (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_boleto_fee_percent" render={({ field }) => ( <FormItem><FormLabel>Taxa Boleto (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_card_fee_percent" render={({ field }) => ( <FormItem><FormLabel>Taxa Cartão de Crédito (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_fixed_fee_cents" render={({ field }) => ( <FormItem><FormLabel>Taxa Fixa por Transação (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              </div>
              
              <Separator />

              {/* Seção de Juros, Reserva e Saque */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={platformForm.control} name="card_installment_interest_rate" render={({ field }) => ( <FormItem><FormLabel>Taxa de Juros de Parcelamento (% ao mês)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_security_reserve_percent" render={({ field }) => ( <FormItem><FormLabel>Reserva de Segurança (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_security_reserve_days" render={({ field }) => ( <FormItem><FormLabel>Prazo da Reserva (dias)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_withdrawal_fee_cents" render={({ field }) => ( <FormItem><FormLabel>Taxa de Saque (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              </div>

              <Separator />

              {/* Seção de Prazos de Liberação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={platformForm.control} name="default_pix_release_days" render={({ field }) => ( <FormItem><FormLabel>Prazo Liberação PIX (dias)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_boleto_release_days" render={({ field }) => ( <FormItem><FormLabel>Prazo Liberação Boleto (dias)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={platformForm.control} name="default_card_release_days" render={({ field }) => ( <FormItem><FormLabel>Prazo Liberação Cartão (dias)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              </div>
              
              <Button type="submit" disabled={updatePlatformFeesMutation.isPending}>
                {updatePlatformFeesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Taxas Padrão
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* A seção de taxas personalizadas pode ser adicionada aqui depois */}

    </div>
  );
};

export default AdminFeesPage;