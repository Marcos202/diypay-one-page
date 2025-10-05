
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckoutImageUpload } from "../CheckoutImageUpload"; // Importa o novo componente
import { ColorPicker } from "@/components/ui/color-picker";
import { useAuth } from "@/hooks/useAuth";

interface CheckoutTabProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const CheckoutTab = ({ formData, onInputChange }: CheckoutTabProps) => {
  const { user } = useAuth();
  
  // Detecta se a imagem atual é do Supabase (upload do servidor)
  const isSupabaseImage = formData.checkout_image_url && 
    formData.checkout_image_url.includes('supabase.co/storage');
  
  const handleRemoveImage = () => {
    onInputChange('checkout_image_url', '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎨 Personalização Visual</h3>
        <p className="text-sm text-gray-600 mb-6">Customize a aparência da página de checkout</p>
      </div>

      <div className="space-y-6">
        {/* CAMPO DE UPLOAD */}
        <div className="space-y-2">
          <Label>Imagem do Checkout</Label>
          {user?.id ? (
            <CheckoutImageUpload
              userId={user.id}
              initialUrl={formData.checkout_image_url || ''}
              onUploadSuccess={(url) => onInputChange('checkout_image_url', url)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          <p className="text-xs text-gray-500">
            Faça o upload da imagem que será exibida no topo do checkout.
          </p>
          
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout_image_url">OU Cole a URL da Imagem</Label>
          <Input
            id="checkout_image_url"
            value={formData.checkout_image_url && !isSupabaseImage ? formData.checkout_image_url : ''}
            onChange={(e) => onInputChange('checkout_image_url', e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            disabled={!!formData.checkout_image_url}
          />
          {formData.checkout_image_url && (
            <p className="text-xs text-gray-500">
              Campo desativado. Para inserir uma nova imagem, remova a atual usando o botão "X" acima.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout_background_color">Cor de Fundo do Checkout</Label>
          <ColorPicker
            value={formData.checkout_background_color || '#F3F4F6'}
            onChange={(color) => onInputChange('checkout_background_color', color)}
            placeholder="#F3F4F6"
          />
          <p className="text-xs text-gray-500">
            Cor de fundo da página de checkout (formato HEX).
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutTab;
