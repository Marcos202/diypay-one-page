import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Ellipsis, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StudentLayout } from '@/components/StudentLayout';

const fetchMyCourses = async () => {
  const { data, error } = await supabase.functions.invoke('get-my-courses');
  if (error) throw new Error(error.message);
  return data.map((course: any, index: number) => ({
    ...course,
    progress: (index % 3) * 35,
    type: index === 2 ? 'external' : 'standard',
  }));
};

export default function MyCoursesPage() {
  const { data: courses, isLoading, isError, error } = useQuery({
    queryKey: ['my-courses'],
    queryFn: fetchMyCourses,
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-4 sm:p-6 md:p-8 w-full max-w-screen-2xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full sm:w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 sm:h-72 rounded-lg" />
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (isError) {
    return (
      <StudentLayout>
        <div className="p-4 sm:p-6 md:p-8 text-destructive w-full max-w-screen-2xl mx-auto">
          Erro: {error?.message || 'Erro desconhecido'}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-screen-2xl mx-auto">
          {/* Header Responsivo */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Meus Cursos</h1>
            
            {/* Barra de Busca - largura total no mobile */}
            <div className="flex w-full sm:w-auto sm:max-w-sm items-center gap-2">
              <Input 
                type="text" 
                placeholder="Buscar cursos..." 
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon" className="flex-shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {courses.map((course: any) => (
                <Card key={course.id} className="w-full flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Área da Imagem/Ícone */}
                  <div className="relative aspect-[16/9] bg-muted/50 flex-shrink-0">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted">
                        <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  
                  {/* Conteúdo do Card */}
                  <CardContent className="p-4 sm:p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-sm sm:text-base font-semibold leading-tight line-clamp-2">
                        {course.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-1 -mt-1">
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Suporte</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                      {course.producer_name}
                    </p>
                    
                    <div className="flex-grow" />
                    
                    {/* Progresso e Botão */}
                    <div className="mt-3 sm:mt-4">
                      {course.progress > 0 && (
                        <Progress value={course.progress} className="h-1.5 sm:h-2 mb-2 sm:mb-3" />
                      )}
                      <Button 
                        asChild 
                        className="w-full text-sm" 
                        variant={course.type === 'external' ? 'secondary' : 'default'}
                      >
                        <Link to={
                          course.product_type === 'event' 
                            ? `/ticket/${course.sale_id}` 
                            : course.space_id 
                              ? `/members/spaces/${course.space_id}` 
                              : '/members/courses/' + course.id
                        }>
                          {course.product_type === 'event' ? 'Ver Ingressos' : course.type === 'external' ? 'Acessar' : 'Começar'}
                          {course.type === 'external' && <PlayCircle className="ml-2 h-4 w-4" />}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                Você ainda não possui cursos
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                Explore os cursos disponíveis e comece a aprender!
              </p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
