
import { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from 'sonner';

interface LinksTabProps {
  productId?: string;
  checkoutSlug?: string;
}

const LinksTab = ({ productId, checkoutSlug }: LinksTabProps) => {
  const [copied, setCopied] = useState(false);

  if (!productId || !checkoutSlug) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Links estarão disponíveis após salvar o produto.</p>
      </div>
    );
  }

  const checkoutUrl = `${window.location.origin}/checkout/${checkoutSlug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🔗 Links de Divulgação</h3>
        <p className="text-sm text-gray-600 mb-6">Use estes links para divulgar seu produto</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Link de Checkout</Label>
          <div className="flex gap-2">
            <Input
              value={checkoutUrl}
              readOnly
              className="bg-gray-50"
            />
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Link direto para a página de checkout do seu produto
          </p>
        </div>
      </div>
    </div>
  );
};

export default LinksTab;
