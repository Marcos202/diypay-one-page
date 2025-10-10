import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

// Função para gerar uma paleta de cores a partir da cor base
const generateColorPalette = (baseColor: string | null) => {
    const color = baseColor || '#10b981'; // Verde como padrão se nenhuma cor for fornecida
    // Lógica para clarear a cor base para o fundo. Exemplo simples: opacidade.
    const backgroundColor = `${color}1A`; // Adiciona ~10% de opacidade em hex
    return {
        '--border-color': color,
        '--background-color': backgroundColor,
        '--text-color': color,
        '--checkbox-color': color,
    };
};

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

  const colorPalette = generateColorPalette(orderBump.custom_color);

  return (
    <div className="my-6 w-full px-4 lg:px-0">
      {orderBump.order_bump_items.map((item) => {
        const finalPrice = item.products.price_cents * (1 - (item.discount_percent || 0) / 100);
        const originalPrice = item.products.price_cents;
        const hasDiscount = item.discount_percent > 0;

        return (
          <Card
            key={item.id}
            className="p-4 border-2 border-dashed rounded-lg transition-all"
            style={colorPalette as React.CSSProperties}
          >
            {/* LINHA 1: CHECKBOX, TÍTULO E PREÇO */}
            <div className="flex justify-between items-center mb-4">
              <label 
                htmlFor={`order-bump-${item.id}`}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <Checkbox
                  id={`order-bump-${item.id}`}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleToggle(item, checked as boolean)}
                />
                <span className="text-base font-semibold text-gray-700 group-hover:text-gray-900">
                  {item.title || "Sim, adicione no meu pedido!"}
                </span>
              </label>
              
              <div className="text-right">
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through block">
                    R$ {(originalPrice / 100).toFixed(2).replace('.', ',')}
                  </span>
                )}
                <span className="font-bold text-lg whitespace-nowrap text-gray-800">
                  R$ {(finalPrice / 100).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* LINHA 2: IMAGEM E CONTEÚDO (EXATAMENTE COMO NO MODELO) */}
            <div className="flex items-start gap-4 pl-8">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 lg:w-24 lg:h-24 object-cover rounded flex-shrink-0"
                />
              )}
              
              <div className="flex-1">
                <h4 className="font-bold text-sm uppercase text-gray-600 mb-1">
                  {item.products.name}
                </h4>
                <div 
                  className="text-sm prose prose-sm max-w-none leading-relaxed text-gray-500"
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
