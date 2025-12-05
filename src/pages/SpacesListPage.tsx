// src/pages/SpacesListPage.tsx (Nova Versão)
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProducerLayout } from '@/components/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, BookOpen, Copy, Package, Edit, Brush, Webhook } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePWAContext } from '@/contexts/PWAContext';

const fetchProducerSpaces = async () => {
  const { data, error } = await supabase.functions.invoke('get-producer-spaces');
  if (error) throw new Error(error.message);
  return data;
};

const OnboardingView = ({ onToggleView }: { onToggleView: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 md:p-8">
    <div className="bg-muted p-6 sm:p-8 rounded-full mb-4 sm:mb-6">
      <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
    </div>
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Crie sua primeira Área de Membros</h1>
    <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md">Organize seu conteúdo, personalize o visual e ofereça uma experiência de consumo incrível para seus alunos.</p>
    <Button size="default" className="w-full sm:w-auto" onClick={onToggleView}>
      <PlusCircle className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">Mudar para painel do Aluno</span>
      <span className="sm:hidden">Painel do Aluno</span>
    </Button>
  </div>
);

export default function SpacesListPage() {
  const { toggleView } = useAuth();
  const navigate = useNavigate();
  const { isPWA } = usePWAContext();
  const { data: spaces, isLoading, isError, error } = useQuery({ queryKey: ['producer-spaces'], queryFn: fetchProducerSpaces });

  // Redirecionar usuários PWA para o Dashboard
  useEffect(() => {
    if (isPWA) {
      navigate('/dashboard', { replace: true });
    }
  }, [isPWA, navigate]);

  const handleToggleView = () => {
    toggleView();
    navigate('/members');
  };
  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="space-y-4 md:space-y-6">
          <Skeleton className="h-8 sm:h-10 w-1/2 sm:w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"><Skeleton className="h-48 sm:h-64 w-full" /><Skeleton className="h-48 sm:h-64 w-full" /><Skeleton className="h-48 sm:h-64 w-full" /></div>
        </div>
      </ProducerLayout>
    );
  }
  if (isError) {
    return <ProducerLayout><div className="p-4 sm:p-6 md:p-8 text-destructive text-sm sm:text-base">Erro: {error?.message}</div></ProducerLayout>;
  }
  if (!spaces || spaces.length === 0) {
    return <ProducerLayout><OnboardingView onToggleView={handleToggleView} /></ProducerLayout>;
  }
  return (
    <ProducerLayout>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Seus Conteúdos</h1>
          <Button onClick={handleToggleView} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Mudar para painel do Aluno</span>
            <span className="sm:hidden">Painel do Aluno</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {spaces.map((space: any) => (
            <Card key={space.id} className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div className="aspect-[16/9] bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden">
                    {space.cover_image_url ? (
                      <img src={space.cover_image_url} alt={space.name} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle>{space.name}</CardTitle>
                </CardHeader>
              </div>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                {space.type === 'members_area' ? (
                  <>
                    <Button asChild className="w-full text-sm"><Link to={`/spaces/edit/${space.id}`}><Edit className="mr-2 h-4 w-4" />Conteúdo</Link></Button>
                    <Button asChild variant="outline" className="w-full text-sm"><Link to={`/personalize/edit/${space.id}`}><Brush className="mr-2 h-4 w-4" />Personalizar</Link></Button>
                  </>
                ) : (
                  <Button asChild className="w-full text-sm"><Link to="/settings/webhooks"><Webhook className="mr-2 h-4 w-4" />Webhooks</Link></Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
    </ProducerLayout>
  );
}