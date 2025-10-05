import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Loader2 } from 'lucide-react';

interface AddProductToSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  containerId: string | null;
}

export function AddProductToSpaceModal({ isOpen, onClose, spaceId, containerId }: AddProductToSpaceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['producer-products-for-modal', spaceId],
    queryFn: async () => {
      if (!user?.id || !spaceId) return null;
      const { data, error } = await supabase.functions.invoke('get-producer-products', { body: { page: 1, limit: 100, spaceIdToExclude: spaceId } });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isOpen,
  });

  const addProductMutation = useMutation({
    mutationFn: async ({ productId, productType }: { productId: string; productType: 'bonus' | 'locked' }) => {
      if (!containerId) throw new Error("ID do Container não especificado.");
      const { error } = await supabase.functions.invoke('add-product-to-space', { body: { spaceId, productId, productType, containerId } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Produto adicionado à vitrine." });
      // A LINHA CRÍTICA: Garante que a query da página principal seja invalidada.
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar produto à sua Área de Membros</DialogTitle>
          <DialogDescription>Selecione um produto da sua lista para adicionar à vitrine do seu espaço.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="p-1">
            {isLoading && <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin text-muted-foreground" />}
            {productsData?.products?.map((product: any) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
                <div className="flex items-center gap-4">
                  <img src={product.checkout_image_url || '/placeholder.svg'} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                  <span className="font-semibold">{product.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addProductMutation.mutate({ productId: product.id, productType: 'bonus' })}>Bônus</Button>
                  <Button size="sm" variant="outline" onClick={() => addProductMutation.mutate({ productId: product.id, productType: 'locked' })}>Bloqueado</Button>
                </div>
              </div>
            ))}
            {!isLoading && productsData?.products?.length === 0 && (
              <p className="text-center text-muted-foreground p-8">Todos os seus produtos já foram adicionados a esta Área de Membros.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}