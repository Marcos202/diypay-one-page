import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight } from "lucide-react";
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
          // Div principal com a borda tracejada e fundo amarelo claro
          <div
            key={item.id}
            className="overflow-hidden rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50"
          >
            {/* SEÇÃO SUPERIOR */}
            <div className="flex justify-between items-center p-4">
              <label 
                htmlFor={`order-bump-${item.id}`}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <ArrowRight className="h-6 w-6 text-red-500 animate-pulse" />
                <Checkbox
                  id={`order-bump-${item.id}`}
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleToggle(item, checked as boolean)}
                />
                <span className="text-lg font-bold uppercase text-green-600 group-hover:text-green-700">
                  {item.title || "YES!"}
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

            {/* SEÇÃO INFERIOR: Layout responsivo */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 pt-0">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-24 h-24 object-cover rounded border-2 border-gray-200 flex-shrink-0"
                />
              )}
              
              {/* Container da descrição centralizado */}
              <div className="flex-1 flex justify-center sm:justify-start text-center sm:text-left">
                <div>
                  <h4 
                    className="font-bold text-sm uppercase mb-1" 
                    style={{ color: '#FF0000' }}
                  >
                    {item.products.name}
                  </h4>
                  <div 
                    className="text-sm prose prose-sm max-w-none leading-relaxed text-gray-600"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
