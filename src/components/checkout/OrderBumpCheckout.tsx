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

  const getColorPalette = (baseColor: string) => {
    // Extrair valores HSL do baseColor
    const hue = baseColor;
    return {
      border: baseColor,
      background: `${baseColor}15`,
      text: baseColor,
    };
  };

  const colors = getColorPalette(orderBump.custom_color);

  return (
    <div className="space-y-4 my-6">
      {orderBump.order_bump_items.map((item) => {
        const finalPrice =
          item.products.price_cents * (1 - item.discount_percent / 100);
        const originalPrice = item.products.price_cents;
        const hasDiscount = item.discount_percent > 0;

        return (
          <Card
            key={item.id}
            className="p-4 border-2 border-dashed relative"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                id={`order-bump-${item.id}`}
                checked={selectedItems.has(item.id)}
                onCheckedChange={(checked) =>
                  handleToggle(item, checked as boolean)
                }
                className="mt-1"
              />
              
              <div className="flex-1">
                <label
                  htmlFor={`order-bump-${item.id}`}
                  className="cursor-pointer block"
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: colors.text }}
                  >
                    ✓ {item.title}
                  </h4>
                  
                  <div
                    className="text-sm prose prose-sm max-w-none mb-3"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  
                  <div className="flex items-center gap-2">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {(originalPrice / 100).toFixed(2)}
                      </span>
                    )}
                    <span
                      className="font-bold text-lg"
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
              </div>
              
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
