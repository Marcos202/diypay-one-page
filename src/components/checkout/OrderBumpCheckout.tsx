import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface OrderBumpProduct {
  id: string;
  name: string;
  price_cents: number;
}

interface OrderBumpItem {
  id: string;
  bump_product_id: string;
  title: string;
  description: string;
  image_url: string;
  discount_percent: number;
  products: OrderBumpProduct;
}

interface OrderBumpCheckoutProps {
  orderBump: {
    id: string;
    custom_color: string;
    order_bump_items: OrderBumpItem[];
  };
  onSelect: (item: OrderBumpItem) => void;
  onDeselect: (item: OrderBumpItem) => void;
}

export default function OrderBumpCheckout({
  orderBump,
  onSelect,
  onDeselect,
}: OrderBumpCheckoutProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleToggle = (item: OrderBumpItem, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    
    if (checked) {
      newSelected.add(item.id);
      onSelect(item);
    } else {
      newSelected.delete(item.id);
      onDeselect(item);
    }
    
    setSelectedItems(newSelected);
  };

  const colors = {
    background: '#FFFFFF',
    border: '#E0E0E0',
    checkboxText: '#333333',
    productName: '#000000',
    price: '#000000',
    description: '#444444',
  };

  return (
    <div className="space-y-4 my-6 w-full px-4 lg:px-0">
      {orderBump.order_bump_items.map((item) => {
        const finalPrice =
          item.products.price_cents * (1 - item.discount_percent / 100);
        const originalPrice = item.products.price_cents;
        const hasDiscount = item.discount_percent > 0;

        return (
          <Card
            key={item.id}
            className="p-5 lg:p-6 border-2 border-dashed rounded-lg"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            {/* LINHA 1: CHECKBOX + TÍTULO + PREÇO */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <label 
                htmlFor={`order-bump-${item.id}`}
                className="flex items-start gap-3 flex-1 cursor-pointer"
              >
                <Checkbox
                  id={`order-bump-${item.id}`}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleToggle(item, checked as boolean)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span 
                  className="text-[15px] lg:text-base font-semibold"
                  style={{ color: colors.checkboxText }}
                >
                  {item.title || "Sim, adicione no meu pedido!"}
                </span>
              </label>
              
              {/* PREÇO À DIREITA */}
              <div className="text-right flex-shrink-0">
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through block">
                    R$ {(originalPrice / 100).toFixed(2)}
                  </span>
                )}
                <span
                  className="font-bold text-lg whitespace-nowrap"
                  style={{ color: colors.price }}
                >
                  R$ {(finalPrice / 100).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded mt-1 bg-red-600 text-white"
                  >
                    -{item.discount_percent}%
                  </span>
                )}
              </div>
            </div>

            {/* LINHA 2: IMAGEM À ESQUERDA + CONTEÚDO */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* IMAGEM À ESQUERDA */}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 object-cover rounded flex-shrink-0"
                />
              )}
              
              {/* CONTEÚDO À DIREITA */}
              <div className="flex-1">
                {/* NOME DO PRODUTO EM CAIXA ALTA */}
                <h4 
                  className="font-bold text-sm lg:text-base uppercase mb-1"
                  style={{ color: colors.productName }}
                >
                  {item.products.name}
                </h4>
                
                {/* DESCRIÇÃO */}
                <div 
                  className="text-[13px] lg:text-sm prose prose-sm max-w-none leading-relaxed"
                  style={{ color: colors.description }}
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
