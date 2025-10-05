// src/components/products/tabs/DeliveryTypeSection.tsx
// VERSÃO APRIMORADA COM MÚLTIPLOS FALLBACKS

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Calendar, CreditCard, Users, AlertTriangle } from "lucide-react";
import React, { useEffect, useState } from 'react';

interface DeliveryTypeOption {
  value: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface DeliveryTypeSectionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
  mode: 'create' | 'edit';
  isLoading?: boolean;
}

const DeliveryTypeSection = ({ formData, onInputChange, mode, isLoading = false }: DeliveryTypeSectionProps) => {
  const [deliveryType, setDeliveryType] = useState<string>('');
  
  // Tenta extrair delivery_type de várias formas possíveis
  useEffect(() => {
    const extractDeliveryType = () => {
      // Tentativa 1: Acesso direto
      if (formData?.delivery_type) {
        return formData.delivery_type;
      }
      
      // Tentativa 2: deliveryType em camelCase
      if (formData?.deliveryType) {
        return formData.deliveryType;
      }
      
      // Tentativa 3: Dentro de um objeto product
      if (formData?.product?.delivery_type) {
        return formData.product.delivery_type;
      }
      
      // Tentativa 4: Dentro de data
      if (formData?.data?.delivery_type) {
        return formData.data.delivery_type;
      }
      
      // Tentativa 5: Verificar se é string JSON
      if (typeof formData === 'string') {
        try {
          const parsed = JSON.parse(formData);
          return parsed.delivery_type || parsed.deliveryType || '';
        } catch (e) {
          console.error('Erro ao parsear formData:', e);
        }
      }
      
      return '';
    };
    
    const type = extractDeliveryType();
    setDeliveryType(type);
    
    // Log detalhado para debug
    if (mode === 'edit') {
      console.log('=== Debug DeliveryTypeSection ===');
      console.log('formData completo:', formData);
      console.log('Tipo de formData:', typeof formData);
      console.log('delivery_type extraído:', type);
      console.log('Chaves disponíveis em formData:', formData ? Object.keys(formData) : 'formData é null/undefined');
      console.log('================================');
    }
  }, [formData, mode]);
  
  const allOptions: DeliveryTypeOption[] = [
    { 
      value: "members_area", 
      title: "Área de Membros", 
      description: "Cursos e conteúdos digitais entregues diretamente na plataforma DiyPay", 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      value: "external_access", 
      title: "Acesso Externo", 
      description: "Acesso a conteúdos hospedados em plataformas externas", 
      icon: <ExternalLink className="h-5 w-5" /> 
    },
    { 
      value: "in_person_event", 
      title: "Evento Presencial", 
      description: "Geração de ingressos e gestão de inscrições para eventos físicos", 
      icon: <Calendar className="h-5 w-5" /> 
    },
    { 
      value: "payment_only", 
      title: "Apenas Receber Pagamento", 
      description: "Uso exclusivo para cobrança, sem entrega de produto ou conteúdo", 
      icon: <CreditCard className="h-5 w-5" /> 
    }
  ];

  const getAvailableOptions = (productType: string): DeliveryTypeOption[] => {
    switch (productType) {
      case 'single_payment':
      case 'subscription':
        return allOptions.filter(opt => ['members_area', 'external_access', 'payment_only'].includes(opt.value));
      case 'event':
        return allOptions.filter(opt => ['in_person_event', 'payment_only'].includes(opt.value));
      case 'donation':
        return allOptions.filter(opt => opt.value === 'payment_only');
      default:
        return [];
    }
  };

  const isEditMode = mode === 'edit';
  const availableOptions = getAvailableOptions(formData?.product_type || formData?.productType || '');
  
  // Usa o deliveryType extraído com fallbacks
  const currentDeliveryType = isEditMode ? deliveryType : (formData?.delivery_type || '');
  const selectedOption = allOptions.find(option => option.value === currentDeliveryType);

  // Função para renderizar no modo edição
  const renderEditMode = () => {
    // Estado de loading
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Carregando forma de entrega...</p>
          </div>
        </div>
      );
    }
    
    // Caso 1: Não há valor de delivery_type
    if (!currentDeliveryType) {
      return (
        <div className="p-4 border-2 border-warning/50 rounded-lg bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Forma de entrega não definida</p>
              <p className="text-xs text-muted-foreground mt-1">
                O produto não possui uma forma de entrega configurada no banco de dados.
              </p>
              {/* Informações de debug - remover em produção */}
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">Debug Info</summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify({
                    delivery_type: formData?.delivery_type,
                    deliveryType: formData?.deliveryType,
                    product_type: formData?.product_type,
                    keys: Object.keys(formData || {})
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }
    
    // Caso 2: Tem valor mas não encontra a opção correspondente
    if (!selectedOption) {
      return (
        <div className="p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Forma de entrega inválida: "{currentDeliveryType}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este valor não corresponde a nenhuma opção válida do sistema.
              </p>
              <div className="mt-3 p-2 bg-muted rounded">
                <p className="text-xs font-medium mb-1">Valores aceitos:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• members_area - Área de Membros</li>
                  <li>• external_access - Acesso Externo</li>
                  <li>• in_person_event - Evento Presencial</li>
                  <li>• payment_only - Apenas Receber Pagamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Caso 3: Tudo ok, exibe a opção selecionada
    return (
      <div className="flex items-start gap-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
        <div className="mt-1 text-primary">{selectedOption.icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            {selectedOption.title}
            <CheckCircle className="h-4 w-4 text-primary" />
          </h4>
          <p className="text-sm text-muted-foreground mt-1">{selectedOption.description}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Forma de Entrega do Conteúdo *</CardTitle>
          {isEditMode && (
            <Badge variant="secondary" className="text-xs">IMUTÁVEL</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isEditMode 
            ? 'Esta configuração não pode ser alterada após a criação do produto.'
            : 'Esta escolha define como o sistema irá gerenciar seu produto e não poderá ser alterada posteriormente.'
          }
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {isEditMode ? (
          renderEditMode()
        ) : (
          // Modo de criação: permite seleção
          <div className="space-y-3">
            {availableOptions.length === 0 ? (
              <div className="p-4 border rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground text-center">
                  Selecione primeiro o tipo de produto para ver as opções de entrega disponíveis.
                </p>
              </div>
            ) : (
              availableOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => onInputChange('delivery_type', option.value)}
                  className={`
                    flex items-start gap-4 p-4 border-2 rounded-lg 
                    transition-all duration-200 cursor-pointer
                    ${currentDeliveryType === option.value 
                      ? 'border-primary bg-primary/10 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                >
                  <div className={`mt-1 transition-colors ${
                    currentDeliveryType === option.value 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-foreground">{option.title}</h4>
                      {currentDeliveryType === option.value && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryTypeSection;
