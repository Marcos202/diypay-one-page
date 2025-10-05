
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Repeat, Ticket, Heart } from "lucide-react";

interface ProductTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductTypeSelectionModal = ({ isOpen, onClose }: ProductTypeSelectionModalProps) => {
  const navigate = useNavigate();

  const productTypes = [
    {
      type: 'single_payment',
      title: 'Pagamento Único',
      description: 'Venda e-books, cursos ou qualquer produto com um pagamento.',
      icon: Package,
    },
    {
      type: 'subscription',
      title: 'Assinatura Recorrente',
      description: 'Crie planos com cobrança semanal, mensal, etc.',
      icon: Repeat,
    },
    {
      type: 'event',
      title: 'Evento Presencial',
      description: 'Venda ingressos para seus eventos ou workshops.',
      icon: Ticket,
    },
    {
      type: 'donation',
      title: 'Doação',
      description: 'Receba contribuições com valor definido pelo doador.',
      icon: Heart,
    },
  ];

  const handleTypeSelection = (type: string) => {
    onClose();
    navigate(`/products/new?type=${type}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Que tipo de produto você quer criar?
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Escolha uma opção abaixo para começar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          {productTypes.map((productType) => {
            const IconComponent = productType.icon;
            return (
              <Card
                key={productType.type}
                className="cursor-pointer bg-white shadow-sm hover:border-[#810ad1] hover:shadow-md transition-all duration-200 border-2 border-gray-200"
                onClick={() => handleTypeSelection(productType.type)}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <IconComponent className="h-8 w-8 text-[#810ad1]" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">
                      {productType.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {productType.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductTypeSelectionModal;
