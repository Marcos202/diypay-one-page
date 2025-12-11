import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { UserProfileHeader } from '@/components/core/UserProfileHeader';

interface HubData {
  name: string;
  banner_image_url?: string;
  background_color?: string;
  space_containers: Array<{
    id: string;
    title: string;
    display_format: string;
    space_products: Array<{
      product: {
        id: string;
        name: string;
        cover_image_url?: string;
        vertical_cover_image_url?: string;
      };
    }>;
  }>;
}

// Subcomponente Refatorado para Lógica do Carrossel Inteligente
const SpaceContainerCarousel = ({ container }: { container: any }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    api.on("select", onSelect);
    api.on("reInit", onSelect);
    
    // Garante que o estado inicial seja definido corretamente
    onSelect();

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const isVertical = container.display_format === 'vertical';
  
  if (!container.space_products || container.space_products.length === 0) {
    return null;
  }

  return (
    <div key={container.id}>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">{container.title}</h2>
      <Carousel setApi={setApi} opts={{ align: "start", loop: false, dragFree: true }} className="w-full">
        <CarouselContent className="-ml-6">
          {container.space_products.map(({ product }: any) => {
            // Lógica final e correta para seleção de imagem
            const imageUrl = (isVertical && product.vertical_cover_image_url)
              ? product.vertical_cover_image_url
              : product.cover_image_url;

            return (
              <CarouselItem 
                key={product.id} 
                className={cn(
                  "pl-6",
                  // Lógica final para tamanho dos cards
                  isVertical 
                    ? "basis-1/2 sm:basis-1/3 md:basis-1/4" // Máximo de 4 em telas grandes
                    : "basis-full sm:basis-1/2 md:basis-1/3" // Máximo de 3 em telas grandes
                )}
              >
                <Link to={`/members/courses/${product.id}`}>
                  <Card className="overflow-hidden bg-gray-800/50 border-gray-700 hover:border-violet-500 transition-all duration-300 group">
                    <CardContent className="p-0">
                      <div className={cn(
                        "bg-gray-900 flex items-center justify-center overflow-hidden",
                        isVertical ? "aspect-[3/4]" : "aspect-video"
                      )}>
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={product.name} 
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <BookOpen className="h-12 w-12 text-gray-600" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-base truncate">{product.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {canScrollPrev && <CarouselPrevious className="hidden md:flex" />}
        {canScrollNext && <CarouselNext className="hidden md:flex" />}
      </Carousel>
    </div>
  );
};

// Componente Principal da Página
const MembersHubPage = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();

  const { data: hubData, isLoading, isError, error } = useQuery({
    queryKey: ['membersHub', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_space_hub_details', {
        space_id_input: spaceId,
      });
      if (error) throw new Error(error.message);
      return data as unknown as HubData;
    },
    enabled: !!spaceId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-900">
        <Skeleton className="h-[60vh] w-full" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <div className="flex space-x-6">
              <Skeleton className="h-40 w-1/4" />
              <Skeleton className="h-40 w-1/4" />
              <Skeleton className="h-40 w-1/4" />
              <Skeleton className="h-40 w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) return <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center"><div className="p-8 text-destructive-foreground bg-destructive rounded-md">Erro: {error.message}</div></div>;

  const pageBackgroundColor = hubData?.background_color || '#111827';

  return (
    <div className="min-h-screen w-full text-white flex flex-col" style={{ backgroundColor: pageBackgroundColor }}>
      <UserProfileHeader />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-gray-300 hover:text-white border-0 bg-transparent hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      <main className="flex-grow">
        <div 
          className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] bg-cover bg-center flex flex-col justify-end" 
          style={{ backgroundImage: `url(${hubData?.banner_image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
              {hubData?.name}
            </h1>
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-12 space-y-8 md:space-y-12">
          {hubData?.space_containers.map((container: any) => (
            <SpaceContainerCarousel key={container.id} container={container} />
          ))}
        </div>
      </main>
      
      <footer className="w-full mt-auto py-8 border-t border-white/10">
        <div className="container mx-auto text-center text-xs text-gray-500">
        </div>
      </footer>
    </div>
  );
};

export default MembersHubPage;
