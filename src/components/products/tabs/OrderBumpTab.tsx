import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, GripVertical } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import OrderBumpImageUpload from "../OrderBumpImageUpload";

const DEFAULT_TITLE = "SIM, EU ACEITO ESSA OFERTA ESPECIAL!";

interface OrderBumpItem {
  id?: string;
  bump_product_id: string;
  title: string;
  description: string;
  image_url: string;
  discount_percent: number;
  display_order: number;
}

interface OrderBumpTabProps {
  productId?: string;
}

export default function OrderBumpTab({ productId }: OrderBumpTabProps) {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [items, setItems] = useState<OrderBumpItem[]>([]);

  // Buscar produtos do produtor (excluindo o produto atual)
  const { data: availableProducts } = useQuery({
    queryKey: ["available-products", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_cents, cover_image_url")
        .eq("producer_id", (await supabase.auth.getUser()).data.user?.id)
        .neq("id", productId)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Buscar order bump existente
  const { data: orderBump, isLoading } = useQuery({
    queryKey: ["order-bump", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_bumps")
        .select(`
          id,
          is_active,
          order_bump_items (
            id,
            bump_product_id,
            title,
            description,
            image_url,
            discount_percent,
            display_order
          )
        `)
        .eq("product_id", productId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (orderBump) {
      setIsActive(orderBump.is_active);
      setItems(orderBump.order_bump_items || []);
    }
  }, [orderBump]);

  // Mutation para salvar order bump
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validar comprimento das descrições
      for (const item of items) {
        const textLength = item.description?.replace(/<[^>]*>/g, '').length || 0;
        if (textLength > 200) {
          throw new Error(`A descrição deve ter no máximo 200 caracteres. Atual: ${textLength}`);
        }
      }

      const { data, error } = await supabase.functions.invoke("save-order-bump", {
        body: {
          product_id: productId,
          is_active: isActive,
          items: items.map((item, idx) => ({
            ...item,
            display_order: idx,
          })),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Order Bump salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["order-bump", productId] });
    },
    onError: (error) => {
      console.error("Erro ao salvar Order Bump:", error);
      toast.error("Erro ao salvar Order Bump");
    },
  });

  const addItem = () => {
    if (items.length >= 7) {
      toast.error("Máximo de 7 produtos permitidos");
      return;
    }
    setItems([
      ...items,
      {
        bump_product_id: "",
        title: DEFAULT_TITLE,
        description: "",
        image_url: "",
        discount_percent: 0,
        display_order: items.length,
      },
    ]);
  };

  const sanitizeDescription = (html: string): string => {
    return html.replace(/<a\s+[^>]*href=['"][^'"]*['"][^>]*>/gi, '')
               .replace(/<\/a>/gi, '');
  };

  const handleDescriptionChange = (index: number, value: string) => {
    // Remove links se existirem
    if (value.includes('<a href') || value.includes('http://') || value.includes('https://')) {
      toast.error("Links não são permitidos na descrição");
      return;
    }
    
    // Sanitiza a descrição
    const sanitized = sanitizeDescription(value);
    
    // Extrai apenas o texto (sem tags HTML)
    const plainText = sanitized.replace(/<[^>]*>/g, '');
    
    // Se ultrapassou 200 caracteres, trunca mantendo a formatação HTML
    if (plainText.length > 200) {
      // Trunca o texto HTML mantendo as tags
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;
      let currentLength = 0;
      let truncatedHTML = '';
      
      const traverse = (node: Node): boolean => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (currentLength + text.length <= 200) {
            truncatedHTML += text;
            currentLength += text.length;
            return true;
          } else {
            truncatedHTML += text.substring(0, 200 - currentLength);
            currentLength = 200;
            return false;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const tagName = element.tagName.toLowerCase();
          truncatedHTML += `<${tagName}>`;
          
          for (const child of Array.from(node.childNodes)) {
            if (!traverse(child)) {
              truncatedHTML += `</${tagName}>`;
              return false;
            }
          }
          
          truncatedHTML += `</${tagName}>`;
          return true;
        }
        return true;
      };
      
      traverse(tempDiv);
      updateItem(index, "description", truncatedHTML);
      return;
    }
    
    updateItem(index, "description", sanitized);
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const removeItem = async (index: number) => {
    const itemToRemove = items[index];
    
    // Se o item tem imagem, deletar do storage
    if (itemToRemove.image_url) {
      try {
        const filePath = new URL(itemToRemove.image_url).pathname.split('/order-bump-images/')[1];
        if (filePath) {
          await supabase.storage.from('order-bump-images').remove([filePath]);
        }
      } catch (err) {
        console.error("Erro ao remover imagem:", err);
        // Não bloqueia a remoção do item mesmo se falhar a remoção da imagem
      }
    }
    
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderBumpItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Ativar Order Bump</h3>
            <p className="text-sm text-muted-foreground">
              Ofereça produtos adicionais no checkout
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {isActive && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Produtos do Order Bump ({items.length}/7)</Label>
                <Button
                  type="button"
                  onClick={addItem}
                  disabled={items.length >= 7}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>

              {items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-4">
                      <div>
                        <Label>Produto</Label>
                        <Select
                          value={item.bump_product_id}
                          onValueChange={(value) =>
                            updateItem(index, "bump_product_id", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts?.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - R${" "}
                                {(product.price_cents / 100).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Título (máx. 50 caracteres)</Label>
                        <Input
                          value={item.title}
                          onChange={(e) =>
                            updateItem(index, "title", e.target.value.slice(0, 50))
                          }
                          placeholder="Ex: Adicione este bônus especial!"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.title.length}/50
                        </p>
                      </div>

                      <div>
                        <Label>Descrição</Label>
                        <div className="quill-editor-container">
                          <ReactQuill
                            value={item.description}
                            onChange={(value) => handleDescriptionChange(index, value)}
                            theme="snow"
                            modules={quillModules}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description?.replace(/<[^>]*>/g, '').length || 0}/200 caracteres
                        </p>
                      </div>

                      <div>
                        <Label>Imagem Quadrada (máx. 100KB)</Label>
                        <OrderBumpImageUpload
                          value={item.image_url}
                          onChange={(url) => updateItem(index, "image_url", url)}
                        />
                      </div>

                      <div>
                        <Label>Desconto (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "discount_percent",
                              Math.min(100, Math.max(0, Number(e.target.value)))
                            )
                          }
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end mt-6">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Order Bump"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
