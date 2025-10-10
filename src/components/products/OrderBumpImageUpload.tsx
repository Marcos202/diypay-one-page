import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderBumpImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function OrderBumpImageUpload({ value, onChange }: OrderBumpImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    // Validação 1: Tamanho máximo 100KB
    if (file.size > 100 * 1024) {
      toast.error("A imagem deve ter no máximo 100KB");
      return;
    }
    
    // Validação 2: Formatos aceitos
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      toast.error("Formato inválido. Use: JPG, PNG ou WEBP");
      return;
    }
    
    // Validação 3: Proporção 1:1 (opcional, mas recomendado)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    
    try {
      await img.decode();
      
      const aspectRatio = img.width / img.height;
      if (Math.abs(aspectRatio - 1) > 0.1) { // Tolerância de 10%
        toast.error("A imagem deve ser quadrada (proporção 1:1)");
        URL.revokeObjectURL(objectUrl);
        return;
      }
      
      URL.revokeObjectURL(objectUrl);
      
      // Deletar imagem antiga antes de fazer upload
      if (value) {
        try {
          const oldFilePath = new URL(value).pathname.split('/order-bump-images/')[1];
          if (oldFilePath) {
            await supabase.storage.from('order-bump-images').remove([oldFilePath]);
          }
        } catch (err) {
          console.error("Erro ao remover imagem antiga:", err);
        }
      }
      
      // Upload para Supabase Storage
      setIsUploading(true);
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('order-bump-images')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        toast.error("Erro ao fazer upload da imagem");
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('order-bump-images')
        .getPublicUrl(fileName);
      
      onChange(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast.error("Erro ao processar a imagem");
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    try {
      // Deletar do storage
      const oldFilePath = new URL(value).pathname.split('/order-bump-images/')[1];
      if (oldFilePath) {
        const { error } = await supabase.storage
          .from('order-bump-images')
          .remove([oldFilePath]);
        
        if (error) throw error;
      }
      
      onChange("");
      toast.success("Imagem removida do servidor");
    } catch (err: any) {
      console.error("Erro ao remover imagem:", err);
      toast.error("Erro ao remover imagem");
    }
  };
  
  return (
    <div className="space-y-2">
      {!value ? (
        <>
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando imagem...
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Formatos: JPG, PNG, WEBP | Tamanho: até 100KB | Proporção: 1:1 (quadrada)
          </p>
        </>
      ) : (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="w-20 h-20 object-cover rounded border" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
