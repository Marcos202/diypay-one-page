// src/pages/PersonalizeSpacePage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, GripVertical, MoreHorizontal, Save, Columns, Rows } from 'lucide-react';
import { AddProductToSpaceModal } from '@/components/spaces/AddProductToSpaceModal';
import { BannerImageUpload } from '@/components/spaces/BannerImageUpload';
import { ColorPicker } from '@/components/ui/color-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Funções Helper de UI
const getBadgeVariant = (productType: string) => {
  switch (productType) {
    case 'principal': return 'default';
    case 'bonus': return 'secondary';
    case 'locked': return 'destructive';
    default: return 'outline';
  }
};
const getBadgeContent = (productType: string) => {
  switch (productType) {
    case 'principal': return 'Principal';
    case 'bonus': return 'Bônus';
    case 'locked': return 'Bloqueado';
    default: return productType;
  }
};

export default function PersonalizeSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [newContainerTitle, setNewContainerTitle] = useState('');
  
  // Estados locais para aparência - fonte única da verdade
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('#F3F4F6');

  const { data: space, isLoading, isError } = useQuery({
    queryKey: ['space-details', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-space-details', { body: { spaceId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
  });
  
  // Hook para lidar com o erro de "não encontrado" e redirecionar
  useEffect(() => {
    if (isError) {
      toast.error("Área de Membros não encontrada", {
        description: "Este conteúdo pode ter sido excluído. Redirecionando...",
      });
      navigate('/members-area');
    }
  }, [isError, navigate]);

  // Carregar dados da aparência quando space for carregado
  useEffect(() => {
    if (space) {
      setBannerImageUrl(space.banner_image_url || '');
      setBackgroundColor(space.background_color || '#F3F4F6');
    }
  }, [space]);

  const createContainerMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      const { error } = await supabase.functions.invoke('create-space-container', { 
        body: { spaceId, title: data.title } 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Container criado!");
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
      setNewContainerTitle('');
    },
    onError: (error) => toast.error(`Erro ao criar container: ${error.message}`),
  });

  const updateAppearanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('spaces').update({
        banner_image_url: bannerImageUrl || null,
        background_color: backgroundColor || null
      }).eq('id', spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aparência atualizada!");
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => toast.error(`Erro ao salvar: ${error.message}`),
  });

  // MUTATION REFEITA: Agora usa supabase.rpc() para chamar a função do banco de dados
  const updateDisplayFormatMutation = useMutation({
    mutationFn: async ({ containerId, displayFormat }: { containerId: string; displayFormat: 'horizontal' | 'vertical' }) => {
      const { error } = await supabase.rpc('update_container_format', {
        container_id_input: containerId,
        new_format: displayFormat,
      });
      if (error) {
        // Log para depuração, caso o erro do RPC não seja claro
        console.error("Erro RPC:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Formato de exibição atualizado.");
      queryClient.invalidateQueries({ queryKey: ['space-details', spaceId] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar formato: ${error.message}`);
    },
  });

  const handleCreateContainer = () => { 
    if (newContainerTitle.trim()) createContainerMutation.mutate({ title: newContainerTitle.trim() }); 
  };
  
  const handleSaveAppearance = () => {
    updateAppearanceMutation.mutate();
  };

  if (isLoading) return <ProducerLayout><Skeleton className="h-96 w-full" /></ProducerLayout>;
  if (isError) return null;

  return (
    <>
      <ProducerLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{space?.name || 'Carregando...'}</h1>
          <p className="text-muted-foreground">Personalize a estrutura e aparência da sua área de membros.</p>
        </div>

        <Tabs defaultValue="container" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="container">Container</TabsTrigger>
            <TabsTrigger value="personalizar">Personalizar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="container" className="mt-6">
            <Card className="mb-6">
              <CardHeader><CardTitle>Novo Container</CardTitle><CardDescription>Adicione uma nova seção à sua área de membros.</CardDescription></CardHeader>
              <CardContent className="flex gap-2">
                <Input placeholder="Título do novo container" value={newContainerTitle} onChange={(e) => setNewContainerTitle(e.target.value)} />
                <Button onClick={handleCreateContainer} disabled={createContainerMutation.isPending}>{createContainerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}</Button>
              </CardContent>
            </Card>

            {space?.space_containers?.map((container: any) => (
              <Card key={container.id} className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{container.title}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => { setActiveContainerId(container.id); setAddProductModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Curso</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-md bg-muted/50">
                    <Label className="font-semibold text-sm mb-3 block">Formato de Exibição</Label>
                    <RadioGroup
                      defaultValue={container.display_format || 'horizontal'}
                      onValueChange={(value: 'horizontal' | 'vertical') => {
                        updateDisplayFormatMutation.mutate({ containerId: container.id, displayFormat: value });
                      }}
                      className="flex gap-4"
                      disabled={updateDisplayFormatMutation.isPending}
                    >
                      <Label htmlFor={`h-${container.id}`} className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent flex-1 justify-center has-[:checked]:bg-accent has-[:checked]:border-primary">
                        <RadioGroupItem value="horizontal" id={`h-${container.id}`} />
                        <Rows className="h-4 w-4" />
                        Horizontal
                      </Label>
                      <Label htmlFor={`v-${container.id}`} className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-accent flex-1 justify-center has-[:checked]:bg-accent has-[:checked]:border-primary">
                        <RadioGroupItem value="vertical" id={`v-${container.id}`} />
                        <Columns className="h-4 w-4" />
                        Vertical
                      </Label>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    {container.space_products.map((sp: any) => (
                      <div key={sp.product.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <img src={sp.product.checkout_image_url || '/placeholder.svg'} alt={sp.product.name} className="h-10 w-10 rounded-md object-cover" />
                          <span className="font-medium">{sp.product.name}</span>
                          <Badge variant={getBadgeVariant(sp.product_type)}>{getBadgeContent(sp.product_type)}</Badge>
                        </div>
                        <MoreHorizontal className="h-4 w-4" />
                      </div>
                    ))}
                    {container.space_products.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum curso neste container.</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="personalizar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Aparência da Área de Membro</CardTitle>
                <CardDescription>Customize o visual da página principal da sua área de membros.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Imagem do Banner</Label>
                  {user?.id ? (
                    <BannerImageUpload
                      userId={user.id}
                      value={bannerImageUrl}
                      onUploadSuccess={setBannerImageUrl}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Faça o upload da imagem que será exibida no topo da área de membros.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cor de Fundo do Hub</Label>
                  <ColorPicker
                    value={backgroundColor}
                    onChange={setBackgroundColor}
                    placeholder="#F3F4F6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cor de fundo da página da área de membros (formato HEX).
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveAppearance} 
                    disabled={updateAppearanceMutation.isPending}
                  >
                    {updateAppearanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> 
                    Salvar Aparência
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ProducerLayout>

      <AddProductToSpaceModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} spaceId={spaceId!} containerId={activeContainerId} />
    </>
  );
}