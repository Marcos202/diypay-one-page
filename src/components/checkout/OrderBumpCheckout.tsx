import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";

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

  const getColorPalette = (baseColor: string = '#6B7280') => {
    return {
      border: baseColor,
      background: `${baseColor}10`,
      titleBackground: '#F3F4F6',
      titleText: '#374151',
      productName: '#D90000',
      text: baseColor,
    };
  };

  const colors = getColorPalette(orderBump.custom_color || '#6B7280');

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
            className="p-0 border-2 border-dashed relative overflow-hidden"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            {/* CABEÇALHO COM FUNDO MAIS ESCURO */}
            <div 
              className="px-4 py-3 lg:px-6 lg:py-4"
              style={{ backgroundColor: colors.titleBackground }}
            >
              <h4 
                className="font-bold text-sm lg:text-base uppercase leading-tight"
                style={{ color: colors.titleText }}
              >
                {item.title || "SIM, EU ACEITO ESSA OFERTA ESPECIAL!"}
              </h4>
              <p 
                className="text-xs lg:text-sm font-medium mt-1"
                style={{ color: colors.productName }}
              >
                {item.products.name}
              </p>
            </div>
            
            {/* CORPO DO CARD */}
            <div className="p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row items-start gap-3 lg:gap-4">
                {/* SETA VERMELHA + CHECKBOX */}
                <div className="flex items-start gap-2 self-start">
                  <ArrowDown 
                    className="w-5 h-5 text-red-500 animate-pulse-arrow mt-0.5" 
                  />
                  <Checkbox
                    id={`order-bump-${item.id}`}
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) =>
                      handleToggle(item, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                </div>
                
                {/* CONTEÚDO */}
                <label 
                  htmlFor={`order-bump-${item.id}`} 
                  className="flex-1 cursor-pointer w-full lg:w-auto"
                >
                  <div 
                    className="text-xs lg:text-sm prose prose-sm max-w-none mb-3"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  
                  {/* PREÇO */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasDiscount && (
                      <span className="text-xs lg:text-sm text-muted-foreground line-through">
                        R$ {(originalPrice / 100).toFixed(2)}
                      </span>
                    )}
                    <span
                      className="font-bold text-base lg:text-lg"
                      style={{ color: colors.text }}
                    >
                      R$ {(finalPrice / 100).toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: colors.border,
                          color: "white",
                        }}
                      >
                        -{item.discount_percent}%
                      </span>
                    )}
                  </div>
                </label>
                
                {/* IMAGEM */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-auto lg:w-20 lg:h-20 object-cover rounded mt-3 lg:mt-0 order-first lg:order-last"
                  />
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
