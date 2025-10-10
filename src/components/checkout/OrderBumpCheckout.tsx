import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card"; // Embora não usemos o Card, mantemos a importação por consistência
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

// A função generateColorPalette não é mais necessária para este layout, mas mantida caso seja usada em outro lugar
const generateColorPalette = (baseColor: string | null) => {
    const color = baseColor || '#10b981';
    const backgroundColor = `${color}1A`; 
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

  return (
    <div className="my-6 w-full px-4 lg:px-0">
      {orderBump.order_bump_items.map((item) => {
        const finalPrice = item.products.price_cents * (1 - (item.discount_percent || 0) / 100);
        const originalPrice = item.products.price_cents;
        const hasDiscount = item.discount_percent > 0;

        return (
          // Div principal com a borda tracejada
          <div
            key={item.id}
            className="overflow-hidden rounded-lg border-2 border-dashed border-gray-300"
          >
            {/* SEÇÃO SUPERIOR: Fundo cinza claro */}
            <div className="flex justify-between items-center bg-gray-50 p-4">
              <label 
                htmlFor={`order-bump-${item.id}`}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <Checkbox
                  id={`order-bump-${item.id}`}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleToggle(item, checked as boolean)}
                />
                <span className="text-base font-semibold text-gray-800 group-hover:text-black">
                  {item.title || "Sim, adicione no meu pedido!"}
                </span>
              </label>
              
              <div className="text-right">
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through block">
                    R$ {(originalPrice / 100).toFixed(2).replace('.', ',')}
                  </span>
                )}
                <span className="font-bold text-lg whitespace-nowrap text-gray-900">
                  R$ {(finalPrice / 100).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* SEÇÃO INFERIOR: Fundo branco */}
            <div className="flex items-start gap-4 p-4 bg-white">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 lg:w-24 lg:h-24 object-cover rounded border border-gray-200 flex-shrink-0"
                />
              )}
              
              <div className="flex-1">
                <h4 className="font-bold text-sm uppercase text-gray-700 mb-1">
                  {item.products.name}
                </h4>
                <div 
                  className="text-sm prose prose-sm max-w-none leading-relaxed text-gray-600"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
